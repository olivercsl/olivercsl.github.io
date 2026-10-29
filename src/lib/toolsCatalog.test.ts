import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { allTools, relatedFor, relatedMap } from './toolsCatalog';

const pages = readdirSync('src/pages/tools')
  .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
  .map((f) => `/tools/${f.replace('.astro', '')}/`);

describe('tools catalog', () => {
  it('lists every tool page exactly once', () => {
    expect(allTools.map((t) => t.href).sort()).toEqual([...pages].sort());
  });

  it('gives every tool related links that resolve', () => {
    for (const p of pages) {
      const r = relatedFor(p);
      expect(r.length, p).toBeGreaterThanOrEqual(2);
      expect(r.map((t) => t.href), p).not.toContain(p);
    }
  });

  it('leaves no tool without a related link pointing at it', () => {
    const targets = new Set(Object.values(relatedMap).flat());
    for (const p of pages) expect(targets.has(p), p).toBe(true);
  });
});
