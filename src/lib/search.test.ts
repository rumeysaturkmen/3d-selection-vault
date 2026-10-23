import { describe, expect, it } from 'vitest';
import { countValues, search } from './search';
import type { Technique } from './types';

const t = (id: string, year: number | null, attrs: Record<string, string[]>, summary = ''): Technique => ({
  id,
  name: id,
  year,
  summary,
  primaryTask: 'selection',
  tasks: ['selection'],
  attributes: attrs,
  publications: [],
  review: { status: 'draft' },
});

const rows = [
  t('Raycasting', 1995, { inputModality: ['controller', 'hand'], targetDistance: ['far'] }, 'A ray from the hand'),
  t('Virtual Hand', 1996, { inputModality: ['hand'], targetDistance: ['near'] }),
  t('Gaze Pinch', 2017, { inputModality: ['gaze', 'hand'], targetDistance: ['far'] }),
  t('Mystery', null, { inputModality: [] }),
];

describe('search', () => {
  it('matches every word of the query, ignoring case and accents', () => {
    expect(search(rows, 'RAY hand', {}).map((r) => r.id)).toEqual(['Raycasting']);
    expect(search(rows, 'gazé', {}).map((r) => r.id)).toEqual(['Gaze Pinch']);
  });

  it('ORs values within an attribute and ANDs across attributes', () => {
    const ids = (f: Record<string, string[]>) => search(rows, '', f).map((r) => r.id);
    expect(ids({ inputModality: ['controller', 'gaze'] })).toEqual(['Raycasting', 'Gaze Pinch']);
    expect(ids({ inputModality: ['hand'], targetDistance: ['near'] })).toEqual(['Virtual Hand']);
    expect(ids({ inputModality: [] })).toHaveLength(4);
  });

  it('sorts by year with unknown years last', () => {
    expect(search(rows, '', {}, 'year-desc').map((r) => r.id)).toEqual([
      'Gaze Pinch',
      'Virtual Hand',
      'Raycasting',
      'Mystery',
    ]);
    expect(search(rows, '', {}, 'year-asc').at(-1)?.id).toBe('Mystery');
  });

  it('counts attribute values', () => {
    expect(countValues(rows, 'inputModality').get('hand')).toBe(3);
  });
});
