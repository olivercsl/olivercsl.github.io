/**
 * Amazon EKS max pods per node, following AWS's own rules:
 *
 * - Default, used by the EKS-optimized AMI when nothing else is set
 *   (nodeadm calculateStandardMaxPods; EKS User Guide, "How maxPods is
 *   determined"):
 *       ENIs on the default network card x (IPv4 per ENI - 1) + 2
 *   The +2 covers the VPC CNI and kube-proxy pods, which use the node's own
 *   address.
 * - Prefix delegation (VPC CNI 1.9.0 or later, Nitro or bare metal only):
 *       ENIs x ((IPv4 per ENI - 1) x 16) + 2
 *   Each secondary address slot holds a /28 prefix of 16 addresses
 *   (max-pods-calculator.sh, IPS_PER_PREFIX=16; nodeadm test
 *   "emulate unbounded prefix delegation").
 * - Custom networking: the primary ENI stays on the node's subnet and carries
 *   no pods, so one ENI fewer (max-pods-calculator.sh; nodeadm test
 *   "emulate custom networking").
 * - Managed node groups without a custom AMI: EKS works the value out itself,
 *   prefix delegation included, then caps it at 110 for instances with up to
 *   30 vCPUs and 250 above ("applied whether prefix delegation is enabled or
 *   not"). max-pods-calculator.sh uses `CPU_COUNT -gt 30`; no instance type has
 *   exactly 30 vCPUs.
 * - Self-managed nodes and managed node groups with a custom AMI: nothing is
 *   worked out for you. nodeadm sets the default formula, ignoring prefix
 *   delegation and custom networking, unless you set maxPods yourself.
 * - EKS Auto Mode: the lower of 110 and ENIs x (IPv4 per ENI - 1), with no +2
 *   (EKS User Guide, "Considerations for EKS Auto Mode").
 *
 * Instance data: see eksInstances.ts, generated from AWS's repositories.
 */
import { EKS_INSTANCES } from './eksInstances';

export const IPS_PER_PREFIX = 16;
export const AUTO_MODE_CAP = 110;

export interface InstanceSpec {
  type: string;
  /** Network interfaces on the default network card. */
  enis: number;
  ipsPerEni: number;
  vcpus: number;
  memoryMiB: number;
  /** Nitro or bare metal: the VPC CNI can assign /28 prefixes. */
  prefixCapable: boolean;
}

export type NodeKind = 'managed' | 'self-managed' | 'auto-mode';

export interface MaxPodsOptions {
  prefixDelegation: boolean;
  customNetworking: boolean;
}

const BY_TYPE = new Map<string, InstanceSpec>(
  EKS_INSTANCES.map(([type, enis, ipsPerEni, vcpus, memoryMiB, prefix]) => [
    type,
    { type, enis, ipsPerEni, vcpus, memoryMiB, prefixCapable: prefix === 1 },
  ]),
);

export const INSTANCE_TYPES: readonly string[] = [...BY_TYPE.keys()];

export function findInstance(type: string): InstanceSpec | null {
  return BY_TYPE.get(type.trim().toLowerCase()) ?? null;
}

/** Up to `limit` instance types matching what was typed, prefix matches first. */
export function searchInstances(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = INSTANCE_TYPES.filter((t) => t.startsWith(q));
  const contains = INSTANCE_TYPES.filter((t) => !t.startsWith(q) && t.includes(q));
  // Natural order within a family: large before xlarge before 2xlarge.
  return [...starts.sort(bySize), ...contains.sort(bySize)].slice(0, limit);
}

const SIZE_ORDER = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge'];
function sizeRank(type: string): number {
  const size = type.split('.')[1] ?? '';
  const n = /^(\d+)xlarge$/.exec(size);
  if (n) return 100 + Number(n[1]);
  if (size === 'metal' || size.startsWith('metal')) return 10_000;
  const i = SIZE_ORDER.indexOf(size);
  return i >= 0 ? i : 5_000;
}
function bySize(a: string, b: string): number {
  const fa = a.split('.')[0]!;
  const fb = b.split('.')[0]!;
  return fa === fb ? sizeRank(a) - sizeRank(b) : fa.localeCompare(fb);
}

export const secondaryIpMaxPods = (enis: number, ipsPerEni: number) => Math.max(0, enis) * (ipsPerEni - 1) + 2;

export const prefixMaxPods = (enis: number, ipsPerEni: number) =>
  Math.max(0, enis) * ((ipsPerEni - 1) * IPS_PER_PREFIX) + 2;

export const managedNodeGroupCap = (vcpus: number): 110 | 250 => (vcpus > 30 ? 250 : 110);

export interface MaxPodsResult {
  /** What the node's addresses allow under the chosen options, with no cap. */
  ipCapacity: number;
  /** Managed node group without a custom AMI: EKS's own value. */
  managed: number;
  /** What nodeadm sets on a self-managed node if you set nothing. */
  selfManagedDefault: number;
  /** The value to set on a self-managed node: the capacity, capped as EKS caps it. */
  selfManagedRecommended: number;
  autoMode: number;
  cap: 110 | 250;
  /** ENIs that can carry pods after custom networking. */
  podEnis: number;
  /** Prefix delegation was asked for and the instance supports it. */
  prefixApplied: boolean;
  /** Prefix delegation was asked for but the instance is not Nitro or bare metal. */
  prefixUnsupported: boolean;
}

export function maxPods(spec: InstanceSpec, opts: MaxPodsOptions): MaxPodsResult {
  const podEnis = opts.customNetworking ? spec.enis - 1 : spec.enis;
  const prefixApplied = opts.prefixDelegation && spec.prefixCapable;
  const ipCapacity = prefixApplied
    ? prefixMaxPods(podEnis, spec.ipsPerEni)
    : secondaryIpMaxPods(podEnis, spec.ipsPerEni);
  const cap = managedNodeGroupCap(spec.vcpus);
  const capped = Math.min(cap, ipCapacity);
  return {
    ipCapacity,
    managed: capped,
    selfManagedDefault: secondaryIpMaxPods(spec.enis, spec.ipsPerEni),
    selfManagedRecommended: capped,
    autoMode: Math.min(AUTO_MODE_CAP, spec.enis * (spec.ipsPerEni - 1)),
    cap,
    podEnis,
    prefixApplied,
    prefixUnsupported: opts.prefixDelegation && !spec.prefixCapable,
  };
}

/** The arithmetic behind ipCapacity, with the instance's numbers filled in. */
export function capacityFormula(spec: InstanceSpec, r: MaxPodsResult): string {
  return r.prefixApplied
    ? `${r.podEnis} x ((${spec.ipsPerEni} - 1) x ${IPS_PER_PREFIX}) + 2 = ${r.ipCapacity.toLocaleString('en-US')}`
    : `${r.podEnis} x (${spec.ipsPerEni} - 1) + 2 = ${r.ipCapacity.toLocaleString('en-US')}`;
}

/** NodeConfig for a self-managed AL2023 node, as the EKS User Guide shows it. */
export function nodeConfigSnippet(value: number): string {
  return [
    '---',
    'apiVersion: node.eks.aws/v1alpha1',
    'kind: NodeConfig',
    'spec:',
    '  cluster:',
    '    name: my-cluster',
    '    ...',
    '  kubelet:',
    '    config:',
    `      maxPods: ${value}`,
  ].join('\n');
}
