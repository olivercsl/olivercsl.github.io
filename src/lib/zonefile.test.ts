import { describe, it, expect } from 'vitest';
import { parseZone, analyzeZone, parseTtl, qualify } from './zonefile';

const FULL = `
$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. admin.example.com. (
			2026072701 ; serial
			7200       ; refresh
			3600       ; retry
			1209600    ; expire
			3600 )     ; minimum
@		IN	NS	ns1.example.com.
@		IN	MX	10 mail.example.com.
@		IN	TXT	"v=spf1 include:_spf.google.com ~all"
_dmarc		IN	TXT	"v=DMARC1; p=quarantine; rua=mailto:d@example.com"
sel1._domainkey	IN	TXT	"v=DKIM1; k=rsa; p=MIGf..."
www		IN	A	192.0.2.1
mail		IN	A	192.0.2.2
api	300	IN	A	192.0.2.3
old	86400	IN	A	192.0.2.9
`;

describe('parseTtl', () => {
  it('parses bare seconds and suffixed durations', () => {
    expect(parseTtl('300')).toBe(300);
    expect(parseTtl('5m')).toBe(300);
    expect(parseTtl('1h')).toBe(3600);
    expect(parseTtl('1d')).toBe(86400);
    expect(parseTtl('1w')).toBe(604800);
    expect(parseTtl('1H')).toBe(3600);
  });
  it('rejects non-durations', () => {
    expect(parseTtl('IN')).toBeNull();
    expect(parseTtl('')).toBeNull();
  });
});

describe('qualify', () => {
  it('resolves relative, absolute and apex names', () => {
    expect(qualify('www', 'example.com')).toBe('www.example.com');
    expect(qualify('www.example.com.', 'example.com')).toBe('www.example.com');
    expect(qualify('@', 'example.com')).toBe('example.com');
  });
});

describe('parseZone', () => {
  const zone = parseZone(FULL);

  it('reads the origin', () => {
    expect(zone.origin).toBe('example.com');
  });

  it('parses every record without errors', () => {
    expect(zone.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(zone.records.length).toBe(10);
  });

  it('joins a parenthesised SOA into one record', () => {
    const soa = zone.records.filter((r) => r.type === 'SOA');
    expect(soa.length).toBe(1);
    expect(soa[0]!.rdata).toContain('2026072701');
  });

  it('strips comments outside quotes but keeps quoted content', () => {
    const spf = zone.records.find((r) => r.rdata.includes('spf1'))!;
    expect(spf.rdata).toBe('"v=spf1 include:_spf.google.com ~all"');
    const dmarc = zone.records.find((r) => r.name.startsWith('_dmarc'))!;
    expect(dmarc.rdata).toContain('p=quarantine');
  });

  it('qualifies relative names against the origin', () => {
    expect(zone.records.some((r) => r.name === 'www.example.com')).toBe(true);
    expect(zone.records.some((r) => r.name === 'sel1._domainkey.example.com')).toBe(true);
  });

  it('applies the default TTL and honours explicit ones', () => {
    expect(zone.records.find((r) => r.name === 'www.example.com')!.ttl).toBe(3600);
    expect(zone.records.find((r) => r.name === 'api.example.com')!.ttl).toBe(300);
    expect(zone.records.find((r) => r.name === 'old.example.com')!.ttl).toBe(86400);
  });

  it('handles suffixed TTLs and omitted class', () => {
    const z = parseZone('$ORIGIN e.com.\nwww 1h A 1.2.3.4\n');
    expect(z.records[0]!.ttl).toBe(3600);
    expect(z.records[0]!.type).toBe('A');
  });

  it('inherits the owner name on an indented continuation line', () => {
    const z = parseZone('$ORIGIN e.com.\n$TTL 300\nwww IN A 1.2.3.4\n    IN A 5.6.7.8\n');
    expect(z.records.length).toBe(2);
    expect(z.records[1]!.name).toBe('www.e.com');
  });

  it('flags $INCLUDE as unverifiable', () => {
    const z = parseZone('$INCLUDE /etc/bind/extra.zone\n');
    expect(z.issues.some((i) => i.message.includes('$INCLUDE'))).toBe(true);
  });

  it('reports a record with no value', () => {
    const z = parseZone('$ORIGIN e.com.\nwww IN A\n');
    expect(z.issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('ignores blank lines and comment-only lines', () => {
    const z = parseZone('; just a comment\n\n   \n$ORIGIN e.com.\nwww IN A 1.2.3.4\n');
    expect(z.records.length).toBe(1);
  });
});

describe('analyzeZone', () => {
  const analysis = analyzeZone(parseZone(FULL));
  const find = (t: string) => analysis.findings.find((f) => f.title.includes(t));

  it('counts records by type', () => {
    expect(analysis.byType.A).toBe(4);
    expect(analysis.byType.TXT).toBe(3);
    expect(analysis.byType.MX).toBe(1);
  });

  it('extracts mail hosts from MX rdata', () => {
    expect(analysis.mailHosts).toEqual(['mail.example.com']);
  });

  it('passes SPF, DKIM and DMARC when present', () => {
    expect(find('SPF record present')!.verdict).toBe('pass');
    expect(find('DKIM')!.verdict).toBe('pass');
    expect(find('DMARC record present')!.verdict).toBe('pass');
  });

  it('warns that the mail host must stay unproxied', () => {
    const f = find('must stay unproxied')!;
    expect(f.verdict).toBe('warn');
    expect(f.detail).toContain('mail.example.com');
  });

  it('flags TTLs above one hour', () => {
    const f = find('TTL above one hour')!;
    expect(f.verdict).toBe('warn');
    expect(analysis.highTtl.some((r) => r.name === 'old.example.com')).toBe(true);
    // 300s and 3600s records are not flagged
    expect(analysis.highTtl.some((r) => r.name === 'api.example.com')).toBe(false);
  });

  it('fails a zone with mail but no DKIM', () => {
    const z = analyzeZone(parseZone('$ORIGIN e.com.\n@ IN MX 10 mail.e.com.\n@ IN TXT "v=spf1 -all"\n'));
    expect(z.findings.find((f) => f.title.includes('No DKIM'))!.verdict).toBe('fail');
  });

  it('fails a zone with mail but no SPF', () => {
    const z = analyzeZone(parseZone('$ORIGIN e.com.\n@ IN MX 10 mail.e.com.\n'));
    expect(z.findings.find((f) => f.title.includes('No SPF'))!.verdict).toBe('fail');
  });

  it('fails on duplicate SPF records', () => {
    const z = analyzeZone(
      parseZone('$ORIGIN e.com.\n@ IN MX 10 m.e.com.\n@ IN TXT "v=spf1 -all"\n@ IN TXT "v=spf1 ~all"\n'),
    );
    expect(z.findings.find((f) => f.title.includes('More than one SPF'))!.verdict).toBe('fail');
  });

  it('skips email checks when the zone has no MX', () => {
    const z = analyzeZone(parseZone('$ORIGIN e.com.\nwww IN A 1.2.3.4\n'));
    expect(z.findings.find((f) => f.title.includes('No MX'))!.verdict).toBe('info');
    expect(z.findings.some((f) => f.title.includes('No DKIM'))).toBe(false);
  });

  it('detects a CNAME sharing a name with another record type', () => {
    const z = analyzeZone(parseZone('$ORIGIN e.com.\nwww IN CNAME t.e.com.\nwww IN A 1.2.3.4\n'));
    expect(z.findings.find((f) => f.title.includes('coexists'))!.verdict).toBe('fail');
  });

  it('notices verification records', () => {
    const z = analyzeZone(
      parseZone('$ORIGIN e.com.\n@ IN TXT "google-site-verification=abc123"\n'),
    );
    expect(z.findings.some((f) => f.title.includes('verification record'))).toBe(true);
  });
});
