/**
 * Kubernetes pod QoS classification, following the rules the kubelet applies:
 *
 * - Guaranteed: every container sets requests and limits for BOTH cpu and
 *   memory, and within each resource request equals limit.
 * - BestEffort: no container sets any request or limit at all.
 * - Burstable: everything else.
 *
 * QoS decides eviction order under node pressure: BestEffort first, then
 * Burstable over their memory request, Guaranteed last.
 */

export interface ContainerResources {
  cpuRequest?: number | null; // millicores
  cpuLimit?: number | null;
  memRequest?: number | null; // MiB
  memLimit?: number | null;
}

export type QosClass = 'Guaranteed' | 'Burstable' | 'BestEffort';

const set = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v) && v > 0;

export function qosClass(containers: ContainerResources[]): QosClass {
  const any = containers.some(
    (c) => set(c.cpuRequest) || set(c.cpuLimit) || set(c.memRequest) || set(c.memLimit),
  );
  if (!any) return 'BestEffort';

  const allGuaranteed = containers.every(
    (c) =>
      set(c.cpuRequest) &&
      set(c.cpuLimit) &&
      set(c.memRequest) &&
      set(c.memLimit) &&
      c.cpuRequest === c.cpuLimit &&
      c.memRequest === c.memLimit,
  );
  return allGuaranteed ? 'Guaranteed' : 'Burstable';
}

export interface QosFinding {
  severity: 'risk' | 'note';
  message: string;
}

/** Practical warnings the class alone does not convey. */
export function qosFindings(containers: ContainerResources[]): QosFinding[] {
  const findings: QosFinding[] = [];
  containers.forEach((c, i) => {
    const name = containers.length > 1 ? `Container ${i + 1}: ` : '';
    if (!set(c.memLimit)) {
      findings.push({
        severity: 'risk',
        message: `${name}no memory limit. A leak can consume the node and trigger evictions of other pods.`,
      });
    }
    if (set(c.memLimit) && set(c.memRequest) && c.memLimit! > c.memRequest!) {
      findings.push({
        severity: 'note',
        message: `${name}memory limit above request overcommits the node. Under pressure this pod is evicted before Guaranteed pods.`,
      });
    }
    if (set(c.memRequest) && !set(c.memLimit)) {
      findings.push({
        severity: 'note',
        message: `${name}memory request without a limit lets usage grow unbounded past the scheduler's assumptions.`,
      });
    }
    if (!set(c.cpuRequest)) {
      findings.push({
        severity: 'note',
        message: `${name}no CPU request. The scheduler places this pod as if it needs no CPU, risking noisy-neighbour contention.`,
      });
    }
    if (set(c.cpuLimit) && set(c.cpuRequest) && c.cpuLimit! > c.cpuRequest! * 4) {
      findings.push({
        severity: 'note',
        message: `${name}CPU limit far above request. Heavy throttling can appear only under load, which is hard to debug.`,
      });
    }
  });
  return findings;
}
