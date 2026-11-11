/**
 * Kubernetes pod QoS classification, following the rules the kubelet applies:
 *
 * - Guaranteed: every container sets limits for BOTH cpu and memory, and
 *   within each resource the request equals the limit (an omitted request
 *   is defaulted to the limit by the API server).
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

/**
 * The request the API server records. A limit set without a request is
 * defaulted to request = limit, so "limits only" earns Guaranteed.
 * https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#guaranteed
 */
const effectiveRequest = (request: number | null | undefined, limit: number | null | undefined): number | null =>
  set(request) ? request : set(limit) ? limit : null;

export function qosClass(containers: ContainerResources[]): QosClass {
  const any = containers.some(
    (c) => set(c.cpuRequest) || set(c.cpuLimit) || set(c.memRequest) || set(c.memLimit),
  );
  if (!any) return 'BestEffort';

  const allGuaranteed = containers.every(
    (c) =>
      set(c.cpuLimit) &&
      set(c.memLimit) &&
      effectiveRequest(c.cpuRequest, c.cpuLimit) === c.cpuLimit &&
      effectiveRequest(c.memRequest, c.memLimit) === c.memLimit,
  );
  return allGuaranteed ? 'Guaranteed' : 'Burstable';
}

/**
 * The oom_score_adj the kubelet writes for a container's processes, from
 * GetContainerOOMScoreAdjust in pkg/kubelet/qos/policy.go (kubernetes/kubernetes):
 *
 *   Guaranteed  -997
 *   BestEffort  1000
 *   Burstable   1000 - (1000 * memoryRequest) / nodeMemoryCapacity, in integer
 *               division, then raised to at least 3 and lowered from 1000 to 999
 *
 * Node-critical pods, sidecar containers and pod-level requests have their own
 * branches there and are not modelled. Both arguments are in the same unit.
 */
export function oomScoreAdj(cls: QosClass, memRequest: number | null | undefined, nodeMemory: number): number | null {
  if (cls === 'Guaranteed') return -997;
  if (cls === 'BestEffort') return 1000;
  if (!Number.isFinite(nodeMemory) || nodeMemory <= 0) return null;
  const request = set(memRequest) ? memRequest : 0;
  const adj = 1000 - Math.floor((1000 * request) / nodeMemory);
  if (adj < 3) return 3;
  if (adj === 1000) return 999;
  return adj;
}

/** oom_score_adj for each container of a pod. Memory in MiB throughout. */
export function containerOomScores(containers: ContainerResources[], nodeMemoryMiB: number): (number | null)[] {
  const cls = qosClass(containers);
  return containers.map((c) => oomScoreAdj(cls, effectiveRequest(c.memRequest, c.memLimit), nodeMemoryMiB));
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
    if (!set(c.cpuRequest) && !set(c.cpuLimit)) {
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
