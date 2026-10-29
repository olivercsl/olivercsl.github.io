/**
 * The free tools, grouped as on /tools/. One list feeds the index page and
 * the "Related tools" block on every tool page, so links never point at a
 * tool that has been renamed or removed.
 */
export interface ToolEntry {
  href: string;
  name: string;
  desc: string;
  tags: string[];
}

export const categories: { name: string; tools: ToolEntry[] }[] = [
  {
    name: 'Cloud & networking',
    tools: [
      {
        href: '/tools/subnet-calculator/',
        name: 'Subnet Calculator',
        desc: 'IPv4 network, broadcast and usable range from any IP and CIDR prefix, with a splitter for planning VPC subnets.',
        tags: ['IPv4', 'CIDR', 'VPC'],
      },
      {
        href: '/tools/bandwidth-calculator/',
        name: 'Bandwidth & Transfer Calculator',
        desc: 'Convert data sizes and link speeds, and estimate how long a transfer really takes with protocol overhead.',
        tags: ['Bandwidth', 'Transfer time', 'Units'],
      },
      {
        href: '/tools/dns-ttl-planner/',
        name: 'DNS TTL & Cutover Planner',
        desc: 'A concrete migration timeline: when to lower the TTL, when the switch fully propagates, and when to restore it.',
        tags: ['DNS', 'Migrations', 'TTL'],
      },
      {
        href: '/tools/dns-zone-file-checker/',
        name: 'DNS Zone File Checker',
        desc: 'Paste a zone file and see what a migration would break: missing SPF, DKIM or DMARC, mail hosts that must stay unproxied, and TTLs still too long.',
        tags: ['DNS', 'Migrations', 'Email'],
      },
      {
        href: '/tools/port-reference/',
        name: 'Network Port Reference',
        desc: 'Searchable reference of the TCP and UDP ports engineers actually meet, with security notes.',
        tags: ['Ports', 'TCP/UDP', 'Reference'],
      },
    ],
  },
  {
    name: 'Reliability & capacity',
    tools: [
      {
        href: '/tools/sla-calculator/',
        name: 'SLA & Uptime Calculator',
        desc: 'Turn availability targets into allowed downtime, combine the SLAs of a dependency chain, and track an error budget.',
        tags: ['SLA', 'Uptime', 'Error budget'],
      },
      {
        href: '/tools/latency-percentile-calculator/',
        name: 'Latency Percentile Calculator',
        desc: 'Paste response-time samples and get P50 through P99.9 with min, mean, max and a long-tail warning.',
        tags: ['Latency', 'Percentiles', 'P99'],
      },
      {
        href: '/tools/littles-law-calculator/',
        name: "Little's Law Calculator",
        desc: 'Solve concurrency, throughput and latency from the other two, and convert request rates across time windows.',
        tags: ['Capacity', 'Throughput', 'Queueing'],
      },
      {
        href: '/tools/retry-backoff-calculator/',
        name: 'Retry & Backoff Calculator',
        desc: 'The full exponential backoff schedule with jitter, checked against your caller timeout, plus the load retries add to a failing dependency.',
        tags: ['Retries', 'Backoff', 'Resilience'],
      },
      {
        href: '/tools/downtime-cost-calculator/',
        name: 'Cost of Downtime Calculator',
        desc: 'Price an outage, and see what the downtime each availability tier allows is worth per month, quarter or year.',
        tags: ['Downtime', 'SLA', 'Cost'],
      },
      {
        href: '/tools/latency-budget-calculator/',
        name: 'Latency Budget Calculator',
        desc: 'Split an end to end response time target across components, see what is left, and check the round trip floor distance imposes.',
        tags: ['Latency', 'Budget', 'Architecture'],
      },
      {
        href: '/tools/kubernetes-resource-units-converter/',
        name: 'Kubernetes Resource Units Converter',
        desc: 'CPU millicores and memory quantities like 128Mi, 1G and 129e6, with warnings for the suffix mistakes the API server accepts.',
        tags: ['Kubernetes', 'Memory', 'CPU'],
      },
      {
        href: '/tools/kubernetes-qos-calculator/',
        name: 'Kubernetes QoS Calculator',
        desc: 'See the QoS class the kubelet will assign from your requests and limits, with eviction and overcommit warnings.',
        tags: ['Kubernetes', 'QoS', 'Resources'],
      },
    ],
  },
  {
    name: 'Time',
    tools: [
      {
        href: '/tools/time-zone-converter/',
        name: 'Time Zone Converter',
        desc: 'Compare cities side by side and find an hour that works for everyone, with daylight saving handled for any date.',
        tags: ['Time zones', 'Meetings', 'Scheduling'],
      },
      {
        href: '/tools/excel-serial-date-converter/',
        name: 'Excel Serial Date Converter',
        desc: 'Excel serial numbers to dates and back, Unix timestamps included, with the 1904 date system and the 1900 leap year bug handled.',
        tags: ['Excel', 'Dates', 'Spreadsheets'],
      },
      {
        href: '/tools/iso-8601-duration-converter/',
        name: 'ISO 8601 Duration Converter',
        desc: 'PT1H30M and P3DT4H5M6S to words, seconds and clock time, with an exact answer for durations containing months rather than a guess at 30 days.',
        tags: ['ISO 8601', 'Duration', 'Developer'],
      },
      {
        href: '/tools/chrome-webkit-timestamp-converter/',
        name: 'Chrome & WebKit Timestamp Converter',
        desc: 'Decode a raw value from Chrome History or Cookies, plus Cocoa NSDate and Mac HFS+, with every plausible reading shown rather than one guess.',
        tags: ['Chrome', 'Forensics', 'WebKit'],
      },
      {
        href: '/tools/ldap-timestamp-converter/',
        name: 'LDAP Timestamp Converter',
        desc: 'Active Directory and Windows FILETIME values to a date, including the zero and Int64 max sentinels and the negative maxPwdAge durations.',
        tags: ['Active Directory', 'FILETIME', 'LDAP'],
      },
      {
        href: '/tools/epoch-converter/',
        name: 'Epoch Converter',
        desc: 'Unix timestamps to dates and back, with seconds, milliseconds, microseconds or nanoseconds detected automatically.',
        tags: ['Unix time', 'Timestamps', 'Developer'],
      },
    ],
  },
  {
    name: 'Everyday utilities',
    tools: [
      {
        href: '/tools/password-generator/',
        name: 'Password Generator',
        desc: 'Strong random passwords and memorable passphrases, with entropy and crack time shown for every result.',
        tags: ['Passwords', 'Passphrases', 'Entropy'],
      },
      {
        href: '/tools/uuid-generator/',
        name: 'UUID Generator',
        desc: 'Generate v4, v7, v1 and nil UUIDs in bulk, with formatting options and no ad wall on click.',
        tags: ['UUID', 'GUID', 'Developer'],
      },
      {
        href: '/tools/qr-code-generator/',
        name: 'QR Code Generator',
        desc: 'Links, Wi-Fi, contacts, email, phone and SMS as a QR code, with colours, a logo, a transparent background and a scan check. No tracking redirect.',
        tags: ['QR code', 'Wi-Fi', 'Logo'],
      },
    ],
  },
];

export const allTools: ToolEntry[] = categories.flatMap((c) => c.tools);

/** Other pages a related block may point at besides tools. */
const EXTRA: Record<string, ToolEntry> = {
  '/blog/how-to-migrate-dns-to-cloudflare/': {
    href: '/blog/how-to-migrate-dns-to-cloudflare/',
    name: 'How to migrate DNS to Cloudflare',
    desc: 'A step by step migration guide, including the records that most often break email during the switch.',
    tags: ['Guide'],
  },
};

/**
 * Hand-picked next steps for someone who has just used a tool: what they are
 * likely to need next, not just the same category. Popular tool sites
 * (epochconverter.com, calculator.net) carry the same kind of block.
 */
const RELATED: Record<string, string[]> = {
  '/tools/subnet-calculator/': ['/tools/port-reference/', '/tools/bandwidth-calculator/', '/tools/dns-ttl-planner/'],
  '/tools/bandwidth-calculator/': ['/tools/latency-budget-calculator/', '/tools/subnet-calculator/', '/tools/kubernetes-resource-units-converter/'],
  '/tools/dns-ttl-planner/': ['/tools/dns-zone-file-checker/', '/blog/how-to-migrate-dns-to-cloudflare/', '/tools/port-reference/'],
  '/tools/dns-zone-file-checker/': ['/tools/dns-ttl-planner/', '/blog/how-to-migrate-dns-to-cloudflare/', '/tools/port-reference/'],
  '/tools/port-reference/': ['/tools/subnet-calculator/', '/tools/dns-zone-file-checker/', '/tools/bandwidth-calculator/'],
  '/tools/sla-calculator/': ['/tools/downtime-cost-calculator/', '/tools/latency-percentile-calculator/', '/tools/retry-backoff-calculator/'],
  '/tools/latency-percentile-calculator/': ['/tools/latency-budget-calculator/', '/tools/littles-law-calculator/', '/tools/sla-calculator/'],
  '/tools/littles-law-calculator/': ['/tools/latency-percentile-calculator/', '/tools/retry-backoff-calculator/', '/tools/kubernetes-qos-calculator/'],
  '/tools/retry-backoff-calculator/': ['/tools/sla-calculator/', '/tools/littles-law-calculator/', '/tools/downtime-cost-calculator/'],
  '/tools/downtime-cost-calculator/': ['/tools/sla-calculator/', '/tools/latency-budget-calculator/', '/tools/retry-backoff-calculator/'],
  '/tools/latency-budget-calculator/': ['/tools/latency-percentile-calculator/', '/tools/bandwidth-calculator/', '/tools/sla-calculator/'],
  '/tools/kubernetes-resource-units-converter/': ['/tools/kubernetes-qos-calculator/', '/tools/bandwidth-calculator/', '/tools/iso-8601-duration-converter/'],
  '/tools/kubernetes-qos-calculator/': ['/tools/kubernetes-resource-units-converter/', '/tools/littles-law-calculator/', '/tools/sla-calculator/'],
  '/tools/time-zone-converter/': ['/tools/epoch-converter/', '/tools/iso-8601-duration-converter/', '/tools/excel-serial-date-converter/'],
  '/tools/excel-serial-date-converter/': ['/tools/epoch-converter/', '/tools/iso-8601-duration-converter/', '/tools/time-zone-converter/'],
  // The LDAP tool decodes Active Directory durations such as maxPwdAge.
  '/tools/iso-8601-duration-converter/': ['/tools/epoch-converter/', '/tools/excel-serial-date-converter/', '/tools/ldap-timestamp-converter/'],
  '/tools/chrome-webkit-timestamp-converter/': ['/tools/epoch-converter/', '/tools/ldap-timestamp-converter/', '/tools/excel-serial-date-converter/'],
  '/tools/ldap-timestamp-converter/': ['/tools/epoch-converter/', '/tools/chrome-webkit-timestamp-converter/', '/tools/excel-serial-date-converter/'],
  '/tools/epoch-converter/': ['/tools/time-zone-converter/', '/tools/excel-serial-date-converter/', '/tools/chrome-webkit-timestamp-converter/'],
  // UUID v7 and v1 embed a timestamp, so the epoch converter is a real next step.
  '/tools/uuid-generator/': ['/tools/password-generator/', '/tools/epoch-converter/', '/tools/qr-code-generator/'],
  // A Wi-Fi QR code needs a password; a password often ends up in one.
  '/tools/password-generator/': ['/tools/qr-code-generator/', '/tools/uuid-generator/'],
  '/tools/qr-code-generator/': ['/tools/password-generator/', '/tools/uuid-generator/'],
};

export function relatedFor(href: string): ToolEntry[] {
  const byHref = new Map([...allTools, ...Object.values(EXTRA)].map((t) => [t.href, t]));
  return (RELATED[href] ?? []).map((h) => {
    const t = byHref.get(h);
    if (!t) throw new Error(`Related link ${h} on ${href} matches no tool`);
    return t;
  });
}

/** Exposed for tests. */
export const relatedMap = RELATED;
