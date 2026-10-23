import type { AttributeDef, Publication, Technique } from './types';
import scheme from '../../schema/attributes.json';

// Every JSON file in data/ is bundled at build time. Adding a technique is
// just adding a file; nothing else needs to change.
const techniqueFiles = import.meta.glob<Technique>('../../data/techniques/*.json', {
  eager: true,
  import: 'default',
});
const publicationFiles = import.meta.glob<Publication>('../../data/publications/*.json', {
  eager: true,
  import: 'default',
});

export const techniques: Technique[] = Object.values(techniqueFiles).sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
);
export const publications: Publication[] = Object.values(publicationFiles);
export const attributes: AttributeDef[] = scheme.attributes as AttributeDef[];
export const schemeStatus: string = scheme.status;

const techniqueById = new Map(techniques.map((t) => [t.id, t]));
const publicationById = new Map(publications.map((p) => [p.id, p]));
const attributeById = new Map(attributes.map((a) => [a.id, a]));

export const getTechnique = (id: string) => techniqueById.get(id);
export const getPublication = (id: string) => publicationById.get(id);
export const getAttribute = (id: string) => attributeById.get(id);

export function valueLabel(attributeId: string, valueId: string): string {
  return getAttribute(attributeId)?.values.find((v) => v.id === valueId)?.label ?? valueId;
}

export const REPO_URL = 'https://github.com/rumeysaturkmen/3d-selection-vault';
export const editUrl = (path: string) => `${REPO_URL}/edit/main/${path}`;
