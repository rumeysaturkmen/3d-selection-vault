import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { citedByOf, citesOf, isReview, pubHref, shortAuthors, sortedPublications, techniquesOfPub } from '../lib/citations';

type Sort = 'year' | 'cited' | 'title';
type Kind = 'all' | 'papers' | 'reviews';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export default function Papers() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = (params.get('sort') as Sort) || 'year';
  const kind = (params.get('kind') as Kind) || 'all';
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = sortedPublications.filter((p) => {
      if (kind === 'papers' && isReview(p)) return false;
      if (kind === 'reviews' && !isReview(p)) return false;
      if (!words.length) return true;
      const hay = norm(`${p.title} ${p.authors.join(' ')} ${p.venue ?? ''} ${p.year ?? ''}`);
      return words.every((w) => hay.includes(w));
    });
    if (sort === 'cited') list.sort((a, b) => citedByOf(b.id).length - citedByOf(a.id).length || (b.year ?? 0) - (a.year ?? 0));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [q, sort, kind]);

  const reviews = sortedPublications.filter(isReview).length;

  return (
    <div className="papers">
      <header className="papers-head">
        <h1>Papers</h1>
        <p className="muted">
          The {sortedPublications.length} publications behind the vault: the papers that introduce or evaluate each
          technique, and the {reviews} surveys and theses the catalogue was built from. "Cited by" counts only
          citations from other papers in the vault.
        </p>
      </header>

      <div className="toolbar papers-toolbar">
        <input
          type="search"
          placeholder="Search titles, authors, venues"
          value={q}
          onChange={(e) => set('q', e.target.value || null)}
          aria-label="Search papers"
        />
        <select value={kind} onChange={(e) => set('kind', e.target.value === 'all' ? null : e.target.value)} aria-label="Type">
          <option value="all">All types</option>
          <option value="papers">Technique papers</option>
          <option value="reviews">Surveys and theses</option>
        </select>
        <select value={sort} onChange={(e) => set('sort', e.target.value === 'year' ? null : e.target.value)} aria-label="Sort">
          <option value="year">Newest first</option>
          <option value="cited">Most cited in the vault</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      <p className="result-count muted small">{rows.length} papers</p>

      <ol className="paper-list">
        {rows.map((p) => {
          const href = pubHref(p);
          const techs = techniquesOfPub(p.id).filter((x) => x.role !== 'surveyed');
          const surveyed = techniquesOfPub(p.id).filter((x) => x.role === 'surveyed').length;
          const nCitedBy = citedByOf(p.id).length;
          const nCites = citesOf(p.id).length;
          return (
            <li key={p.id} className="paper">
              <div className="paper-main">
                <p className="paper-title">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                  {isReview(p) && <span className="badge">{p.type === 'thesis' ? 'Thesis' : 'Survey'}</span>}
                </p>
                <p className="paper-meta">
                  {shortAuthors(p)}
                  {p.year ? ` · ${p.year}` : ''}
                  {p.venue ? ` · ${p.venue}` : ''}
                </p>
                {techs.length > 0 && (
                  <p className="paper-techs">
                    {techs.map((x, i) => (
                      <span key={x.technique.id}>
                        {i > 0 && ', '}
                        <Link to={`/technique/${x.technique.id}`}>{x.technique.name}</Link>
                        {x.role === 'evaluated' && <span className="muted"> (evaluated)</span>}
                      </span>
                    ))}
                  </p>
                )}
                {surveyed > 0 && <p className="paper-techs muted">Covers {surveyed} techniques in the vault</p>}
              </div>
              <div className="paper-side">
                {nCitedBy + nCites > 0 ? (
                  <Link to={`/graph?view=citations&p=${p.id}`} className="paper-cites" title="Show in the citation graph">
                    Cited by <strong>{nCitedBy}</strong>
                    <span className="muted"> · cites {nCites}</span>
                  </Link>
                ) : (
                  <span className="paper-cites muted small">No citation data</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
