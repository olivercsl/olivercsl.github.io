/**
 * IPv4 subnet arithmetic on 32-bit unsigned integers. No dependencies.
 *
 * Usable-host counting follows convention plus RFC 3021: prefixes up to /30
 * reserve the network and broadcast addresses, /31 is a point-to-point pair
 * with both addresses usable, and /32 is a single host route.
 */

export interface SubnetInfo {
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalAddresses: number;
  usableHosts: number;
  netmask: string;
  wildcardMask: string;
  prefix: number;
  ipClass: string;
  scope: string;
  binaryIp: string;
  binaryMask: string;
}

export function parseIPv4(input: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(input.trim());
  if (!m) return null;
  let ip = 0;
  for (let i = 1; i <= 4; i++) {
    const octet = Number(m[i]);
    if (octet > 255) return null;
    ip = ((ip << 8) | octet) >>> 0;
  }
  return ip;
}

export function ipToString(ip: number): string {
  return [(ip >>> 24) & 255, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255].join('.');
}

export function ipToBinary(ip: number): string {
  return [(ip >>> 24) & 255, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255]
    .map((o) => o.toString(2).padStart(8, '0'))
    .join('.');
}

export function maskFromPrefix(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff;
  // p=0 would shift by 32, which JS defines as a no-op, hence the guard above.
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function prefixFromMask(mask: number): number | null {
  // Valid masks are a run of ones followed by a run of zeros.
  let prefix = 0;
  let seenZero = false;
  for (let bit = 31; bit >= 0; bit--) {
    const on = ((mask >>> bit) & 1) === 1;
    if (on) {
      if (seenZero) return null; // ones after a zero: not a mask
      prefix++;
    } else {
      seenZero = true;
    }
  }
  return prefix;
}

export function ipClass(ip: number): string {
  const first = (ip >>> 24) & 255;
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D (multicast)';
  return 'E (reserved)';
}

/** Address scope label: RFC 1918 private, loopback, link-local, multicast, or public. */
export function ipScope(ip: number): string {
  const inRange = (base: string, prefix: number) => {
    const b = parseIPv4(base)!;
    const m = maskFromPrefix(prefix);
    return ((ip & m) >>> 0) === ((b & m) >>> 0);
  };
  if (inRange('10.0.0.0', 8) || inRange('172.16.0.0', 12) || inRange('192.168.0.0', 16))
    return 'Private (RFC 1918)';
  if (inRange('127.0.0.0', 8)) return 'Loopback';
  if (inRange('169.254.0.0', 16)) return 'Link-local';
  if (inRange('100.64.0.0', 10)) return 'Shared / CGNAT (RFC 6598)';
  if (inRange('224.0.0.0', 4)) return 'Multicast';
  if (inRange('240.0.0.0', 4)) return 'Reserved';
  return 'Public';
}

export function subnetInfo(ip: number, prefix: number): SubnetInfo {
  const mask = maskFromPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);

  let usable: number;
  let first: number;
  let last: number;
  if (prefix >= 32) {
    usable = 1;
    first = network;
    last = network;
  } else if (prefix === 31) {
    usable = 2; // RFC 3021 point-to-point
    first = network;
    last = broadcast;
  } else {
    usable = total - 2;
    first = network + 1;
    last = broadcast - 1;
  }

  return {
    cidr: `${ipToString(network)}/${prefix}`,
    networkAddress: ipToString(network),
    broadcastAddress: ipToString(broadcast),
    firstUsable: ipToString(first),
    lastUsable: ipToString(last),
    totalAddresses: total,
    usableHosts: usable,
    netmask: ipToString(mask),
    wildcardMask: ipToString(~mask >>> 0),
    prefix,
    ipClass: ipClass(ip),
    scope: ipScope(ip),
    binaryIp: ipToBinary(ip),
    binaryMask: ipToBinary(mask),
  };
}

export interface SplitResult {
  count: number;
  shown: SubnetInfo[];
  truncated: boolean;
}

/** Divide a network into equal subnets at a longer prefix. */
export function splitSubnets(ip: number, prefix: number, newPrefix: number, limit = 64): SplitResult {
  if (newPrefix <= prefix || newPrefix > 32) return { count: 0, shown: [], truncated: false };
  const network = (ip & maskFromPrefix(prefix)) >>> 0;
  const count = 2 ** (newPrefix - prefix);
  const step = 2 ** (32 - newPrefix);
  const shown: SubnetInfo[] = [];
  const n = Math.min(count, limit);
  for (let i = 0; i < n; i++) {
    shown.push(subnetInfo((network + i * step) >>> 0, newPrefix));
  }
  return { count, shown, truncated: count > limit };
}
