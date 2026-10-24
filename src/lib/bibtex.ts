import type { Publication } from './types';

// Venues that are journals rather than conference proceedings.
const JOURNAL = /transactions|journal|computers & graphics|presence|electronics|ieee access|intelligent hardware|displays|visual computer|interacting with computers/i;

const esc = (s: string) => s.replace(/([&%$#_])/g, '\\$1').replace(/\s+/g, ' ').trim();

const surname = (a: string) =>
  (a.includes(',') ? a.split(',')[0] : a.split(' ').slice(-1)[0]).normalize('NFD').replace(/[^A-Za-z]/g, '');

const STOP = new Set(['a', 'an', 'the', 'on', 'of', 'for', 'in', 'to', 'and', 'with', 'towards', 'toward']);
function baseKey(p: Publication) {
  const first = p.authors[0] ? surname(p.authors[0]).toLowerCase() : 'anon';
  const word =
    p.title
      .normalize('NFD')
      .replace(/[^A-Za-z0-9 ]/g, ' ')
      .split(/\s+/)
      .find((w) => w && !STOP.has(w.toLowerCase()))
      ?.toLowerCase() ?? 'paper';
  return `${first}${p.year ?? ''}${word}`;
}

function entryType(p: Publication) {
  const v = p.venue ?? '';
  if (p.type === 'thesis') return /master/i.test(v) ? 'mastersthesis' : 'phdthesis';
  if (/technical report/i.test(v)) return 'techreport';
  if (p.type === 'book') return 'book';
  if (!v) return 'misc';
  return JOURNAL.test(v) ? 'article' : 'inproceedings';
}

/** BibTeX for one publication; uses the stored entry if there is one. */
export function toBibtex(p: Publication, key = baseKey(p)): string {
  if (p.bibtex) return p.bibtex.replace(/^@(\w+)\{[^,]*,/, `@$1{${key},`);
  const type = entryType(p);
  const v = p.venue ? esc(p.venue) : '';
  const fields: [string, string | undefined][] = [
    ['title', `{${esc(p.title)}}`],
    ['author', p.authors.length ? esc(p.authors.join(' and ')) : undefined],
    ['year', p.year ? String(p.year) : undefined],
    type === 'article' ? ['journal', v] : undefined,
    type === 'inproceedings' ? ['booktitle', v] : undefined,
    type === 'phdthesis' || type === 'mastersthesis'
      ? ['school', v.replace(/^(PhD|Master'?s) thesis,\s*/i, '')]
      : undefined,
    type === 'techreport' ? ['institution', v] : undefined,
    type === 'misc' && p.venue ? ['howpublished', v] : undefined,
    ['doi', p.doi ?? undefined],
    ['url', p.doi ? `https://doi.org/${p.doi}` : p.url ?? undefined],
  ].filter((f): f is [string, string | undefined] => Boolean(f));
  const body = fields
    .filter(([, val]) => val)
    .map(([k, val]) => `  ${k} = {${val}}`)
    .join(',\n');
  return `@${type}{${key},\n${body}\n}`;
}

/** BibTeX for several publications, with unique citation keys. */
export function toBibtexFile(pubs: Publication[]): string {
  const used = new Map<string, number>();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pubs) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    let key = baseKey(p);
    const n = used.get(key) ?? 0;
    used.set(key, n + 1);
    if (n > 0) key += String.fromCharCode(97 + n); // smith2020a, smith2020b…
    out.push(toBibtex(p, key));
  }
  return `% Exported from the 3D Selection Vault — https://rumeysaturkmen.github.io/3d-selection-vault/\n% ${out.length} entries\n\n${out.join('\n\n')}\n`;
}

export function downloadBibtex(pubs: Publication[], name = '3d-selection-vault.bib') {
  const blob = new Blob([toBibtexFile(pubs)], { type: 'application/x-bibtex;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
