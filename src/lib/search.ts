import type { Technique } from './types';

/** Selected values per attribute id. Within one attribute values are OR-ed; across attributes AND-ed. */
export type Filters = Record<string, string[]>;
export type SortKey = 'name' | 'year-asc' | 'year-desc';

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function haystack(t: Technique): string {
  return normalise(
    [t.name, ...(t.aliases ?? []), t.summary, t.howItWorks ?? '', ...(t.tags ?? [])].join(' '),
  );
}

export function matchesQuery(t: Technique, query: string): boolean {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = haystack(t);
  return words.every((w) => text.includes(w));
}

export function matchesFilters(t: Technique, filters: Filters): boolean {
  return Object.entries(filters).every(([attr, wanted]) => {
    if (!wanted.length) return true;
    const have = t.attributes[attr] ?? [];
    return wanted.some((v) => have.includes(v));
  });
}

export function search(
  rows: Technique[],
  query: string,
  filters: Filters,
  sort: SortKey = 'name',
): Technique[] {
  const out = rows.filter((t) => matchesQuery(t, query) && matchesFilters(t, filters));
  if (sort === 'name') return out;
  const dir = sort === 'year-asc' ? 1 : -1;
  // Techniques without a year go last either way.
  return [...out].sort((a, b) => {
    if (a.year == null && b.year == null) return 0;
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return dir * (a.year - b.year);
  });
}

/** How many techniques in `rows` have each value of `attr`. */
export function countValues(rows: Technique[], attr: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of rows) for (const v of t.attributes[attr] ?? []) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}
