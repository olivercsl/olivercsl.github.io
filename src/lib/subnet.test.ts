import { describe, it, expect } from 'vitest';
import {
  parseIPv4,
  ipToString,
  ipToBinary,
  maskFromPrefix,
  prefixFromMask,
  ipClass,
  ipScope,
  subnetInfo,
  splitSubnets,
} from './subnet';

describe('parseIPv4', () => {
  it('parses valid addresses', () => {
    expect(parseIPv4('0.0.0.0')).toBe(0);
    expect(parseIPv4('255.255.255.255')).toBe(0xffffffff);
    expect(ipToString(parseIPv4('192.168.1.130')!)).toBe('192.168.1.130');
  });

  it('rejects malformed input', () => {
    for (const bad of ['256.0.0.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '', '192.168.1.-1']) {
      expect(parseIPv4(bad)).toBeNull();
    }
  });
});

describe('masks', () => {
  it('builds masks from prefixes, including the edge prefixes', () => {
    expect(ipToString(maskFromPrefix(0))).toBe('0.0.0.0');
    expect(ipToString(maskFromPrefix(8))).toBe('255.0.0.0');
    expect(ipToString(maskFromPrefix(26))).toBe('255.255.255.192');
    expect(ipToString(maskFromPrefix(32))).toBe('255.255.255.255');
  });

  it('round-trips prefix -> mask -> prefix', () => {
    for (let p = 0; p <= 32; p++) expect(prefixFromMask(maskFromPrefix(p))).toBe(p);
  });

  it('rejects non-contiguous masks', () => {
    expect(prefixFromMask(parseIPv4('255.0.255.0')!)).toBeNull();
  });
});

describe('subnetInfo', () => {
  it('computes the classic /26 example', () => {
    const info = subnetInfo(parseIPv4('192.168.1.130')!, 26);
    expect(info.networkAddress).toBe('192.168.1.128');
    expect(info.broadcastAddress).toBe('192.168.1.191');
    expect(info.firstUsable).toBe('192.168.1.129');
    expect(info.lastUsable).toBe('192.168.1.190');
    expect(info.totalAddresses).toBe(64);
    expect(info.usableHosts).toBe(62);
    expect(info.netmask).toBe('255.255.255.192');
    expect(info.wildcardMask).toBe('0.0.0.63');
    expect(info.cidr).toBe('192.168.1.128/26');
  });

  it('handles /31 per RFC 3021 and /32 host routes', () => {
    const p2p = subnetInfo(parseIPv4('10.0.0.4')!, 31);
    expect(p2p.usableHosts).toBe(2);
    expect(p2p.firstUsable).toBe('10.0.0.4');
    expect(p2p.lastUsable).toBe('10.0.0.5');

    const host = subnetInfo(parseIPv4('10.0.0.7')!, 32);
    expect(host.usableHosts).toBe(1);
    expect(host.networkAddress).toBe('10.0.0.7');
    expect(host.broadcastAddress).toBe('10.0.0.7');
  });

  it('renders binary forms', () => {
    expect(ipToBinary(parseIPv4('255.0.0.0')!)).toBe('11111111.00000000.00000000.00000000');
  });
});

describe('classification', () => {
  it('assigns classes by first octet', () => {
    expect(ipClass(parseIPv4('10.0.0.1')!)).toBe('A');
    expect(ipClass(parseIPv4('172.16.0.1')!)).toBe('B');
    expect(ipClass(parseIPv4('192.168.0.1')!)).toBe('C');
    expect(ipClass(parseIPv4('224.0.0.1')!)).toBe('D (multicast)');
    expect(ipClass(parseIPv4('250.0.0.1')!)).toBe('E (reserved)');
  });

  it('labels scopes, including the 172.16/12 boundary', () => {
    expect(ipScope(parseIPv4('10.1.2.3')!)).toBe('Private (RFC 1918)');
    expect(ipScope(parseIPv4('172.31.255.255')!)).toBe('Private (RFC 1918)');
    expect(ipScope(parseIPv4('172.32.0.0')!)).toBe('Public');
    expect(ipScope(parseIPv4('192.168.99.1')!)).toBe('Private (RFC 1918)');
    expect(ipScope(parseIPv4('127.0.0.1')!)).toBe('Loopback');
    expect(ipScope(parseIPv4('169.254.10.10')!)).toBe('Link-local');
    expect(ipScope(parseIPv4('100.64.0.1')!)).toBe('Shared / CGNAT (RFC 6598)');
    expect(ipScope(parseIPv4('8.8.8.8')!)).toBe('Public');
  });
});

describe('splitSubnets', () => {
  it('splits a /16 into four /18s', () => {
    const r = splitSubnets(parseIPv4('10.0.0.0')!, 16, 18);
    expect(r.count).toBe(4);
    expect(r.truncated).toBe(false);
    expect(r.shown.map((s) => s.cidr)).toEqual([
      '10.0.0.0/18',
      '10.0.64.0/18',
      '10.0.128.0/18',
      '10.0.192.0/18',
    ]);
  });

  it('anchors to the containing network even from a host address', () => {
    const r = splitSubnets(parseIPv4('10.0.37.5')!, 16, 24);
    expect(r.shown[0]!.cidr).toBe('10.0.0.0/24');
    expect(r.count).toBe(256);
  });

  it('truncates very large splits', () => {
    const r = splitSubnets(parseIPv4('10.0.0.0')!, 8, 24, 64);
    expect(r.count).toBe(65_536);
    expect(r.shown.length).toBe(64);
    expect(r.truncated).toBe(true);
  });

  it('returns nothing for an invalid target prefix', () => {
    expect(splitSubnets(parseIPv4('10.0.0.0')!, 24, 24).count).toBe(0);
    expect(splitSubnets(parseIPv4('10.0.0.0')!, 24, 16).count).toBe(0);
  });
});
