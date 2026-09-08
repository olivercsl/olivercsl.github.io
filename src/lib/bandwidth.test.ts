import { describe, it, expect } from 'vitest';
import {
  bandwidthDelayProduct,
  windowLimitedBps,
  lossLimitedBps,
  analyseLongHaul,
  formatBps,
  formatBytes,
} from './bandwidth';
describe('long-haul TCP limits', () => {
  it('computes the bandwidth delay product', () => {
    // 1 Gbps for 200ms means ~25 MB must be unacknowledged to keep the pipe full
    const bytes = bandwidthDelayProduct(1e9, 200);
    expect(bytes).toBe(25_000_000);
    expect(formatBytes(bytes)).toBe('23.8 MiB');
  });

  it('caps a stream at one window per round trip', () => {
    // The textbook case: 64 KiB window on an 80ms path is about 6.5 Mbps,
    // whatever the link speed underneath it
    expect(Math.round(windowLimitedBps(65_536, 80) / 1000)).toBe(6554);
    expect(formatBps(windowLimitedBps(65_536, 200))).toBe('2.62 Mbps');
  });

  it('applies the Mathis approximation for loss', () => {
    // 1460 byte MSS, 200ms, 0.1% loss
    expect(formatBps(lossLimitedBps(1460, 200, 0.001))).toBe('2.26 Mbps');
    // Ten times less loss is roughly three times the throughput, not ten:
    // the relationship is one over the square root
    expect(formatBps(lossLimitedBps(1460, 200, 0.0001))).toBe('7.15 Mbps');
  });

  it('shows that halving RTT doubles throughput at the same loss', () => {
    const far = lossLimitedBps(1460, 200, 0.001);
    const near = lossLimitedBps(1460, 100, 0.001);
    expect(near / far).toBeCloseTo(2, 5);
  });

  it('treats zero loss as no loss ceiling', () => {
    expect(lossLimitedBps(1460, 200, 0)).toBe(Infinity);
  });

  it('picks the lowest ceiling and names it', () => {
    // Fast link, long path, small window: the window binds
    const a = analyseLongHaul(1e9, 200, 65_536, 0);
    expect(a.limitedBy).toBe('window');
    expect(formatBps(a.effectiveBps)).toBe('2.62 Mbps');

    // Big window, but lossy: loss binds
    const b = analyseLongHaul(1e9, 200, 16_777_216, 0.1);
    expect(b.limitedBy).toBe('loss');

    // Short path, big window, no loss: the link itself binds
    const c = analyseLongHaul(1e8, 5, 16_777_216, 0);
    expect(c.limitedBy).toBe('link');
    expect(c.linkUtilisationPercent).toBe(100);
    expect(c.streamsToFillLink).toBe(1);
  });

  it('counts the parallel streams needed to fill the link', () => {
    const a = analyseLongHaul(1e9, 200, 65_536, 0);
    // ~2.6 Mbps per stream against a 1 Gbps link
    expect(a.streamsToFillLink).toBe(382);
    expect(a.linkUtilisationPercent).toBeCloseTo(0.262, 2);
  });

  it('formats rates across the range', () => {
    expect(formatBps(2_260_000)).toBe('2.26 Mbps');
    expect(formatBps(940_000_000)).toBe('940 Mbps');
    expect(formatBps(1_200_000_000)).toBe('1.2 Gbps');
    expect(formatBps(56_000)).toBe('56 kbps');
  });
});
