import { describe, it, expect } from 'vitest';
import {
  findInstance,
  searchInstances,
  maxPods,
  secondaryIpMaxPods,
  prefixMaxPods,
  managedNodeGroupCap,
  capacityFormula,
  nodeConfigSnippet,
  INSTANCE_TYPES,
  type InstanceSpec,
} from './eksmaxpods';
import { EKS_DATA_SOURCE } from './eksInstances';

const off = { prefixDelegation: false, customNetworking: false };
const spec = (type: string) => findInstance(type)!;

describe('formulas, against AWS fixtures', () => {
  // nodeadm internal/kubelet/eni_max_pods_test.go, which mocks a t3.medium as 3 ENIs x 6 IPs
  it('matches nodeadm: standard, prefix delegation and custom networking on 3 ENIs x 6 IPs', () => {
    expect(secondaryIpMaxPods(3, 6)).toBe(17);
    expect(secondaryIpMaxPods(6, 12)).toBe(68);
    expect(prefixMaxPods(3, 6)).toBe(242);
    expect(secondaryIpMaxPods(3 - 1, 6)).toBe(12);
  });

  // aws/amazon-vpc-cni-k8s misc/eni-max-pods.txt (all 1404 types checked when the data was generated)
  it('reproduces AWS eni-max-pods.txt for well-known types', () => {
    expect(maxPods(spec('m5.large'), off).ipCapacity).toBe(29);
    expect(maxPods(spec('t3.medium'), off).ipCapacity).toBe(17);
    expect(maxPods(spec('t3.nano'), off).ipCapacity).toBe(4);
    expect(maxPods(spec('m5.xlarge'), off).ipCapacity).toBe(58);
  });

  it('caps managed node groups at 110 up to 30 vCPUs and 250 above', () => {
    expect(managedNodeGroupCap(2)).toBe(110);
    expect(managedNodeGroupCap(16)).toBe(110);
    expect(managedNodeGroupCap(32)).toBe(250);
    expect(maxPods(spec('c5.4xlarge'), off).managed).toBe(110); // 234 capped, 16 vCPUs
    expect(maxPods(spec('c5.24xlarge'), off).managed).toBe(250); // 737 capped, 96 vCPUs
  });

  // max-pods-calculator.sh results quoted in AWS-sourced write-ups: t3.nano 34, c5.4xlarge 110, c5.24xlarge 250
  it('applies prefix delegation, then the managed node group cap', () => {
    const pd = { prefixDelegation: true, customNetworking: false };
    expect(maxPods(spec('t3.nano'), pd).managed).toBe(34);
    expect(maxPods(spec('c5.4xlarge'), pd).managed).toBe(110);
    expect(maxPods(spec('c5.24xlarge'), pd).managed).toBe(250);
    expect(maxPods(spec('m5.large'), pd).ipCapacity).toBe(434);
  });

  it('takes one ENI away for custom networking', () => {
    const cn = { prefixDelegation: false, customNetworking: true };
    const r = maxPods(spec('m5.large'), cn);
    expect(r.podEnis).toBe(2);
    expect(r.ipCapacity).toBe(20);
    expect(r.managed).toBe(20);
    expect(maxPods(spec('t3.medium'), { prefixDelegation: true, customNetworking: true }).ipCapacity).toBe(162);
  });

  it('gives Auto Mode the lower of 110 and ENIs x (IPs - 1), with no +2', () => {
    expect(maxPods(spec('m5.large'), off).autoMode).toBe(27);
    expect(maxPods(spec('t3.medium'), off).autoMode).toBe(15);
    expect(maxPods(spec('c5.24xlarge'), off).autoMode).toBe(110);
  });
});

describe('self-managed nodes', () => {
  it('keeps the default formula when prefix delegation is on, so the value must be set by hand', () => {
    const r = maxPods(spec('m5.large'), { prefixDelegation: true, customNetworking: false });
    expect(r.selfManagedDefault).toBe(29);
    expect(r.selfManagedRecommended).toBe(110);
  });

  it('overstates capacity under custom networking unless set by hand', () => {
    const r = maxPods(spec('m5.large'), { prefixDelegation: false, customNetworking: true });
    expect(r.selfManagedDefault).toBe(29);
    expect(r.selfManagedRecommended).toBe(20);
  });
});

describe('prefix delegation support', () => {
  it('falls back to secondary IPs on a Xen instance and says so', () => {
    const r = maxPods(spec('m4.large'), { prefixDelegation: true, customNetworking: false });
    expect(r.prefixApplied).toBe(false);
    expect(r.prefixUnsupported).toBe(true);
    expect(r.ipCapacity).toBe(20);
  });

  it('allows it on bare metal, as the VPC CNI does', () => {
    expect(spec('m5.metal').prefixCapable).toBe(true);
    expect(maxPods(spec('m5.metal'), { prefixDelegation: true, customNetworking: false }).prefixApplied).toBe(true);
  });
});

describe('instance data', () => {
  it('has every type from the generated table with sane values', () => {
    expect(INSTANCE_TYPES.length).toBe(EKS_DATA_SOURCE.instanceTypes);
    for (const t of INSTANCE_TYPES) {
      const s = spec(t);
      expect(s.enis, t).toBeGreaterThanOrEqual(1);
      expect(s.ipsPerEni, t).toBeGreaterThanOrEqual(1);
      expect(s.vcpus, t).toBeGreaterThanOrEqual(1);
      expect(s.vcpus, t).not.toBe(30); // the cap rule is ambiguous only at exactly 30
    }
  });

  it('finds types case-insensitively and ignores surrounding spaces', () => {
    expect(findInstance(' M5.LARGE ')?.type).toBe('m5.large');
    expect(findInstance('m5.enormous')).toBeNull();
  });

  it('suggests types in size order, prefix matches first', () => {
    const s = searchInstances('m5.');
    expect(s[0]).toBe('m5.large');
    expect(s[1]).toBe('m5.xlarge');
    expect(searchInstances('')).toEqual([]);
  });
});

describe('explanations', () => {
  it('shows the arithmetic with the instance numbers', () => {
    const m5 = spec('m5.large');
    expect(capacityFormula(m5, maxPods(m5, off))).toBe('3 x (10 - 1) + 2 = 29');
    expect(capacityFormula(m5, maxPods(m5, { prefixDelegation: true, customNetworking: false }))).toBe(
      '3 x ((10 - 1) x 16) + 2 = 434',
    );
  });

  it('writes a NodeConfig with the value to set', () => {
    expect(nodeConfigSnippet(110)).toContain('      maxPods: 110');
    expect(nodeConfigSnippet(110)).toContain('kind: NodeConfig');
  });

  it('handles a hand-entered instance', () => {
    const custom: InstanceSpec = { type: 'custom', enis: 4, ipsPerEni: 15, vcpus: 4, memoryMiB: 0, prefixCapable: true };
    expect(maxPods(custom, off).ipCapacity).toBe(58);
  });
});
