import { describe, expect, it } from 'vitest';
import { nearest, similarity, similarityLinks } from './similarity';
import { attributes, getTechnique, techniques } from './data';

describe('similarity', () => {
  it('is 1 for identical codings and symmetric', () => {
    const t = getTechnique('raycasting')!;
    expect(similarity(attributes, t.attributes, t.attributes).score).toBe(1);
    const u = getTechnique('go-go')!;
    expect(similarity(attributes, t.attributes, u.attributes).score).toBeCloseTo(
      similarity(attributes, u.attributes, t.attributes).score,
    );
  });

  it('ignores attributes one side has not coded', () => {
    const a = { selectionTool: ['ray'], targetDistance: [] };
    const b = { selectionTool: ['ray'], targetDistance: ['far'] };
    expect(similarity(attributes, a, b).score).toBe(1);
  });

  it('treats tool DoF as ordered', () => {
    const s5 = similarity(attributes, { toolDof: ['5'] }, { toolDof: ['6'] }).score;
    const s2 = similarity(attributes, { toolDof: ['2'] }, { toolDof: ['6'] }).score;
    expect(s5).toBeGreaterThan(s2);
  });

  it('ranks ray techniques near raycasting', () => {
    const top = nearest(attributes, getTechnique('raycasting')!.attributes, techniques, 5, 'raycasting');
    expect(top).toHaveLength(5);
    expect(top.every((n) => n.technique.attributes.selectionTool.includes('ray'))).toBe(true);
  });

  it('builds links between existing techniques only', () => {
    const ids = new Set(techniques.map((t) => t.id));
    const links = similarityLinks(attributes, techniques, 3);
    expect(links.length).toBeGreaterThan(techniques.length / 2);
    expect(links.every((l) => ids.has(l.source) && ids.has(l.target) && l.source !== l.target)).toBe(true);
  });
});
