/**
 * BIND master file parsing and migration analysis.
 *
 * The point is not syntax validation, which named-checkzone and several online
 * validators already do. A zone file can be perfectly valid and still take
 * email offline once migrated, because the failures that matter are missing
 * records rather than malformed ones. This module parses the zone and then
 * reports what a migration would break.
 *
 * Parsing follows RFC 1035 section 5 closely enough for real exports:
 * $ORIGIN and $TTL directives, @ for the origin, blank owner names inheriting
 * from the previous record, optional class, parenthesised continuation, and
 * semicolon comments outside quoted strings.
 */

export interface ZoneRecord {
  name: string;
  ttl: number;
  type: string;
  rdata: string;
  /** 1-indexed source line, for error reporting. */
  line: number;
}

export interface ParseIssue {
  line: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface ParsedZone {
  origin: string | null;
  records: ZoneRecord[];
  issues: ParseIssue[];
}

const TYPES = new Set([
  'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV', 'PTR', 'CAA',
  'DNSKEY', 'DS', 'NAPTR', 'SSHFP', 'TLSA', 'SPF', 'ALIAS', 'HTTPS', 'SVCB',
]);

const CLASSES = new Set(['IN', 'CH', 'HS', 'CS']);

/** Strip a trailing comment, respecting quoted strings. */
function stripComment(line: string): string {
  let out = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"' && line[i - 1] !== '\\') inQuotes = !inQuotes;
    if (c === ';' && !inQuotes) break;
    out += c;
  }
  return out;
}

/** Split on whitespace, keeping quoted strings intact. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"' && line[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      current += c;
      continue;
    }
    if (!inQuotes && /\s/.test(c)) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current) tokens.push(current);
  return tokens;
}

/** "1h", "30m", "1d" and bare seconds all appear in real files. */
export function parseTtl(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  const m = /^(\d+)([smhdwSMHDW])$/.exec(token);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  return n * mult[unit]!;
}

/** Resolve a possibly relative owner name against the origin. */
export function qualify(name: string, origin: string | null): string {
  if (name === '@') return origin ?? '@';
  if (name.endsWith('.')) return name.slice(0, -1);
  if (!origin) return name;
  return `${name}.${origin}`;
}

export function parseZone(text: string): ParsedZone {
  const issues: ParseIssue[] = [];
  const records: ZoneRecord[] = [];
  let origin: string | null = null;
  let defaultTtl: number | null = null;
  let lastName: string | null = null;

  const rawLines = text.split(/\r?\n/);

  // Join parenthesised continuations into single logical lines.
  const logical: { text: string; line: number; indented: boolean }[] = [];
  let buffer = '';
  let bufferLine = 0;
  let bufferIndented = false;
  let depth = 0;

  rawLines.forEach((raw, i) => {
    const content = stripComment(raw);
    if (!buffer) {
      bufferLine = i + 1;
      // Leading whitespace means the owner name is inherited. Captured here
      // because the trim below would otherwise lose it.
      bufferIndented = /^[ \t]/.test(raw);
    }
    for (const c of content) {
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    buffer += (buffer ? ' ' : '') + content.trim();
    if (depth <= 0) {
      if (buffer.trim()) logical.push({ text: buffer, line: bufferLine, indented: bufferIndented });
      buffer = '';
      depth = 0;
    }
  });
  if (buffer.trim()) logical.push({ text: buffer, line: bufferLine, indented: bufferIndented });

  for (const { text: lineText, line, indented } of logical) {
    const clean = lineText.replace(/[()]/g, ' ').trim();
    if (!clean) continue;

    // Directives
    if (/^\$ORIGIN\b/i.test(clean)) {
      const value = tokenize(clean)[1];
      if (value) origin = value.endsWith('.') ? value.slice(0, -1) : value;
      else issues.push({ line, severity: 'error', message: '$ORIGIN has no value.' });
      continue;
    }
    if (/^\$TTL\b/i.test(clean)) {
      const value = tokenize(clean)[1];
      const ttl = value ? parseTtl(value) : null;
      if (ttl === null) issues.push({ line, severity: 'error', message: '$TTL value is not a valid duration.' });
      else defaultTtl = ttl;
      continue;
    }
    if (/^\$INCLUDE\b/i.test(clean)) {
      issues.push({
        line,
        severity: 'warning',
        message: '$INCLUDE references another file. Its records are not visible here, so check them separately.',
      });
      continue;
    }

    const tokens = tokenize(clean);
    if (tokens.length === 0) continue;

    // An owner name is present unless the raw line began with whitespace.
    let idx = 0;
    let name: string;

    if (indented && lastName) {
      name = lastName;
    } else {
      name = tokens[0]!;
      idx = 1;
    }

    // Optional TTL and class, in either order.
    let ttl: number | null = null;
    for (let guard = 0; guard < 2; guard++) {
      const t = tokens[idx];
      if (t === undefined) break;
      const asTtl = parseTtl(t);
      if (asTtl !== null && ttl === null) {
        ttl = asTtl;
        idx++;
        continue;
      }
      if (CLASSES.has(t.toUpperCase())) {
        idx++;
        continue;
      }
      break;
    }

    const type = tokens[idx]?.toUpperCase();
    if (!type) {
      issues.push({ line, severity: 'error', message: 'Record has no type.' });
      continue;
    }
    if (!TYPES.has(type)) {
      issues.push({
        line,
        severity: 'warning',
        message: `Unrecognised record type "${type}". It may be valid but is not checked here.`,
      });
      continue;
    }

    const rdata = tokens.slice(idx + 1).join(' ');
    if (!rdata) {
      issues.push({ line, severity: 'error', message: `${type} record has no value.` });
      continue;
    }

    lastName = name;
    records.push({
      name: qualify(name, origin),
      ttl: ttl ?? defaultTtl ?? 3600,
      type,
      rdata,
      line,
    });
  }

  if (records.length > 0 && defaultTtl === null && records.every((r) => r.ttl === 3600)) {
    issues.push({
      line: 1,
      severity: 'warning',
      message: 'No $TTL directive found. Records without an explicit TTL are shown as 3600 seconds.',
    });
  }

  return { origin, records, issues };
}

/* ------------------------------------------------------------------ */
/* Migration analysis                                                  */
/* ------------------------------------------------------------------ */

export type Verdict = 'pass' | 'warn' | 'fail' | 'info';

export interface Finding {
  verdict: Verdict;
  title: string;
  detail: string;
}

const txtValue = (rdata: string) => rdata.replace(/"/g, '').trim();

export interface Analysis {
  recordCount: number;
  byType: Record<string, number>;
  findings: Finding[];
  /** Hostnames that must stay unproxied because mail is delivered to them. */
  mailHosts: string[];
  /** A, AAAA and CNAME records, the ones with a proxy decision attached. */
  proxyCandidates: ZoneRecord[];
  /** Records whose TTL is long enough to slow a mid-migration correction. */
  highTtl: ZoneRecord[];
}

export function analyzeZone(zone: ParsedZone): Analysis {
  const { records } = zone;
  const byType: Record<string, number> = {};
  for (const r of records) byType[r.type] = (byType[r.type] ?? 0) + 1;

  const findings: Finding[] = [];
  const mx = records.filter((r) => r.type === 'MX');
  const txt = records.filter((r) => r.type === 'TXT');

  // Mail hostnames, taken from the MX rdata "priority hostname".
  const mailHosts = [
    ...new Set(
      mx
        .map((r) => r.rdata.trim().split(/\s+/).pop() ?? '')
        .map((h) => (h.endsWith('.') ? h.slice(0, -1) : h))
        .filter(Boolean),
    ),
  ];

  // Email authentication
  if (mx.length === 0) {
    findings.push({
      verdict: 'info',
      title: 'No MX records',
      detail:
        'This zone does not receive email. The email checks below do not apply, but confirm this is deliberate rather than a record that was missed during export.',
    });
  } else {
    findings.push({
      verdict: 'pass',
      title: `${mx.length} MX record${mx.length === 1 ? '' : 's'} present`,
      detail: `Mail is delivered to ${mailHosts.join(', ')}. These hostnames must be left unproxied, since mail does not travel over an HTTP proxy.`,
    });

    const spf = txt.filter((r) => txtValue(r.rdata).toLowerCase().startsWith('v=spf1'));
    if (spf.length === 0) {
      findings.push({
        verdict: 'fail',
        title: 'No SPF record',
        detail:
          'This zone accepts mail but publishes no SPF record. If one exists at your current provider it was missed in this export, and losing it will damage deliverability after migration.',
      });
    } else if (spf.length > 1) {
      findings.push({
        verdict: 'fail',
        title: 'More than one SPF record',
        detail:
          'A domain must publish exactly one SPF record. Multiple records cause receivers to treat SPF as permanently failing.',
      });
    } else {
      findings.push({ verdict: 'pass', title: 'SPF record present', detail: txtValue(spf[0]!.rdata) });
    }

    const dmarc = txt.filter((r) => r.name.startsWith('_dmarc'));
    findings.push(
      dmarc.length > 0
        ? { verdict: 'pass', title: 'DMARC record present', detail: txtValue(dmarc[0]!.rdata) }
        : {
            verdict: 'warn',
            title: 'No DMARC record',
            detail:
              'No record found at _dmarc. If your domain publishes one, it was missed in this export. DMARC governs how receivers treat mail that fails authentication.',
          },
    );

    const dkim = txt.filter((r) => r.name.includes('_domainkey'));
    findings.push(
      dkim.length > 0
        ? {
            verdict: 'pass',
            title: `${dkim.length} DKIM record${dkim.length === 1 ? '' : 's'} present`,
            detail: `Found at ${dkim.map((r) => r.name).join(', ')}.`,
          }
        : {
            verdict: 'fail',
            title: 'No DKIM record',
            detail:
              'No record found at a _domainkey subdomain. DKIM records are the single most commonly lost record in a migration, because nothing on your website references them. Mail continues to deliver unsigned, and deliverability degrades quietly over the following weeks.',
          },
    );
  }

  // Proxy decisions
  const proxyCandidates = records.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type));
  const mailPointing = proxyCandidates.filter((r) => mailHosts.includes(r.name));
  if (mailPointing.length > 0) {
    findings.push({
      verdict: 'warn',
      title: `${mailPointing.length} record${mailPointing.length === 1 ? '' : 's'} must stay unproxied`,
      detail: `${mailPointing
        .map((r) => r.name)
        .join(', ')} resolve${mailPointing.length === 1 ? 's' : ''} a mail host named in your MX records. Proxying ${
        mailPointing.length === 1 ? 'it' : 'them'
      } stops inbound delivery while the MX record still looks correct.`,
    });
  }

  // Verification records worth carrying across untouched
  const verification = txt.filter((r) => {
    const v = txtValue(r.rdata).toLowerCase();
    return (
      v.includes('site-verification') ||
      v.includes('verify') ||
      v.startsWith('ms=') ||
      v.startsWith('apple-domain') ||
      v.includes('-verification=')
    );
  });
  if (verification.length > 0) {
    findings.push({
      verdict: 'info',
      title: `${verification.length} verification record${verification.length === 1 ? '' : 's'} found`,
      detail:
        'Ownership proofs for external services. Carry these across unchanged and leave them unproxied. Losing one can un-verify a service days later when it next rechecks.',
    });
  }

  // TTLs
  const highTtl = records.filter((r) => r.ttl > 3600 && r.type !== 'SOA' && r.type !== 'NS');
  if (highTtl.length > 0) {
    findings.push({
      verdict: 'warn',
      title: `${highTtl.length} record${highTtl.length === 1 ? '' : 's'} with a TTL above one hour`,
      detail:
        'Lower these to 300 seconds at your current provider at least one full old-TTL before the migration. This does not speed up the nameserver change, but it means a mid-migration correction propagates in minutes rather than hours.',
    });
  }

  // Structural
  if (!records.some((r) => r.type === 'SOA')) {
    findings.push({
      verdict: 'info',
      title: 'No SOA record',
      detail:
        'Common in exports from managed DNS providers, which generate the SOA themselves. Cloudflare will also generate one, so this is usually not a problem.',
    });
  }

  const cnames = records.filter((r) => r.type === 'CNAME');
  for (const c of cnames) {
    const clash = records.filter((r) => r.name === c.name && r.type !== 'CNAME');
    if (clash.length > 0) {
      findings.push({
        verdict: 'fail',
        title: `CNAME at ${c.name} coexists with other records`,
        detail:
          'A name with a CNAME may not carry other record types. Most DNS providers reject this, so the migration will fail or silently drop records.',
      });
    }
  }

  return {
    recordCount: records.length,
    byType,
    findings,
    mailHosts,
    proxyCandidates,
    highTtl,
  };
}
