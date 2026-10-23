import type { AttributeDef, Technique } from './types';

export type Coding = Record<string, string[]>;

export interface AttributeMatch {
  attribute: string;
  /** 0–1 agreement on this attribute. */
  score: number;
  shared: string[];
}

export interface Similarity {
  /** 0–1, weighted over the attributes both techniques have coded. */
  score: number;
  /** Total weight of the attributes that could be compared. */
  comparedWeight: number;
  matches: AttributeMatch[];
}

// Tool DoF is ordered, so 5 DoF is closer to 6 than to 2.
const ORDINAL = new Set(['toolDof']);

function agreement(attr: AttributeDef, a: string[], b: string[]): AttributeMatch {
  const shared = a.filter((v) => b.includes(v));
  if (ORDINAL.has(attr.id)) {
    const index = (v: string) => attr.values.findIndex((x) => x.id === v);
    const span = Math.max(1, attr.values.length - 1);
    // Best pairing between the two sets of values.
    let best = 0;
    for (const x of a)
      for (const y of b) best = Math.max(best, 1 - Math.abs(index(x) - index(y)) / span);
    return { attribute: attr.id, score: best, shared };
  }
  const union = new Set([...a, ...b]).size;
  return { attribute: attr.id, score: union ? shared.length / union : 0, shared };
}

/**
 * Weighted similarity between two codings. Each attribute scores the overlap of
 * its values (Jaccard), weighted by the attribute's weight in the scheme.
 * Attributes that either side has not coded are left out rather than counted
 * as a mismatch, so draft codings with gaps are not pushed apart.
 */
export function similarity(attrs: AttributeDef[], a: Coding, b: Coding): Similarity {
  let sum = 0;
  let weight = 0;
  const matches: AttributeMatch[] = [];
  for (const attr of attrs) {
    const x = a[attr.id] ?? [];
    const y = b[attr.id] ?? [];
    if (!x.length || !y.length) continue;
    const m = agreement(attr, x, y);
    sum += m.score * attr.weight;
    weight += attr.weight;
    matches.push(m);
  }
  return { score: weight ? sum / weight : 0, comparedWeight: weight, matches };
}

export interface Neighbour {
  technique: Technique;
  similarity: Similarity;
}

/** The techniques most similar to a coding, best first. */
export function nearest(
  attrs: AttributeDef[],
  coding: Coding,
  pool: Technique[],
  n: number,
  excludeId?: string,
): Neighbour[] {
  const total = attrs.reduce((s, a) => s + a.weight, 0);
  return pool
    .filter((t) => t.id !== excludeId)
    .map((t) => ({ technique: t, similarity: similarity(attrs, coding, t.attributes) }))
    // Need at least a third of the scheme's weight in common to be meaningful.
    .filter((x) => x.similarity.comparedWeight >= total / 3)
    .sort((p, q) => q.similarity.score - p.similarity.score || p.technique.name.localeCompare(q.technique.name))
    .slice(0, n);
}

export interface GraphLink {
  source: string;
  target: string;
  score: number;
}

/** Links each technique to its k most similar techniques (deduplicated). */
export function similarityLinks(attrs: AttributeDef[], pool: Technique[], k: number, min = 0.5): GraphLink[] {
  const seen = new Map<string, GraphLink>();
  for (const t of pool)
    for (const nb of nearest(attrs, t.attributes, pool, k, t.id)) {
      if (nb.similarity.score < min) continue;
      const [s, e] = [t.id, nb.technique.id].sort();
      const key = `${s}|${e}`;
      if (!seen.has(key)) seen.set(key, { source: s, target: e, score: nb.similarity.score });
    }
  return [...seen.values()];
}
