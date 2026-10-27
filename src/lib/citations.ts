import data from '../../data/citations.json';
import { getPublication, publications, techniques } from './data';
import type { Publication, PublicationLink, Technique } from './types';

export interface Citation {
  from: string;
  to: string;
  source: 'openalex' | 'survey';
}

export const citations = data.citations as Citation[];
export const citationCoverage = data.coverage;

const cites = new Map<string, string[]>();
const citedBy = new Map<string, string[]>();
for (const c of citations) {
  cites.set(c.from, [...(cites.get(c.from) ?? []), c.to]);
  citedBy.set(c.to, [...(citedBy.get(c.to) ?? []), c.from]);
}
export const citesOf = (id: string) => cites.get(id) ?? [];
export const citedByOf = (id: string) => citedBy.get(id) ?? [];
/** Whether a paper appears as a node in the citation graph (it cites or is cited by another vault paper). */
export const inCitationGraph = (id: string) => cites.has(id) || citedBy.has(id);
export const citationGraphHref = (id: string) => `/graph?view=citations&p=${encodeURIComponent(id)}`;

/** Techniques that link to a publication, with the role the publication plays for each. */
const techByPub = new Map<string, { technique: Technique; role: PublicationLink['role'] }[]>();
for (const t of techniques)
  for (const p of t.publications)
    techByPub.set(p.publication, [...(techByPub.get(p.publication) ?? []), { technique: t, role: p.role }]);
export const techniquesOfPub = (id: string) => techByPub.get(id) ?? [];

export const pubHref = (p: Publication) => (p.doi ? `https://doi.org/${p.doi}` : p.url ?? undefined);

export function shortAuthors(p: Publication) {
  const surname = (a: string) => (a.includes(',') ? a.split(',')[0] : a.split(' ').slice(-1)[0]).trim();
  if (!p.authors.length) return 'Unknown authors';
  if (p.authors.length === 1) return surname(p.authors[0]);
  if (p.authors.length === 2) return `${surname(p.authors[0])} & ${surname(p.authors[1])}`;
  return `${surname(p.authors[0])} et al.`;
}

export const isReview = (p: Publication) => p.type === 'survey' || p.type === 'thesis' || p.type === 'book';

export const sortedPublications = [...publications].sort(
  (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
);

/** The paper(s) to cite for a technique: the one that introduced it, else any non-survey reference. */
export function citePubsOf(t: Technique): Publication[] {
  const pick = (roles: PublicationLink['role'][]) =>
    t.publications.filter((p) => roles.includes(p.role)).map((p) => getPublication(p.publication)!).filter(Boolean);
  const intro = pick(['introduced']);
  return intro.length ? intro : pick(['reference', 'evaluated']).slice(0, 1);
}
