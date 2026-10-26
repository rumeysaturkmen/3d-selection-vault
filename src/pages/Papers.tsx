import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SelectionBar from '../SelectionBar';
import { isReview, pubHref, shortAuthors, sortedPublications, techniquesOfPub } from '../lib/citations';

type Sort = 'year' | 'title';
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
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [q, sort, kind]);

  const reviews = sortedPublications.filter(isReview).length;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const flip = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allShownPicked = rows.length > 0 && rows.every((p) => picked.has(p.id));

  return (
    <div className="papers">
      <header className="papers-head">
        <h1>Papers</h1>
        <p className="muted">
          The {sortedPublications.length} publications behind the vault: the papers that introduce or evaluate each
          technique, and the {reviews} surveys and theses the catalogue was built from.
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
          <option value="title">Title A–Z</option>
        </select>
      </div>
      {rows.length > 0 && (
        <div className="cite-hint">
          <svg className="cite-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p>
            Tick the papers you want and download them as a BibTeX (.bib) file.
          </p>
          <button
            type="button"
            className="button button-ghost"
            onClick={() =>
              setPicked((cur) => {
                const next = new Set(cur);
                for (const p of rows) allShownPicked ? next.delete(p.id) : next.add(p.id);
                return next;
              })
            }
          >
            {allShownPicked ? 'Unselect all shown' : `Select all ${rows.length} shown`}
          </button>
        </div>
      )}
      <p className="result-count muted small">{rows.length} papers</p>

      <ol className="paper-list">
        {rows.map((p) => {
          const href = pubHref(p);
          const techs = techniquesOfPub(p.id).filter((x) => x.role !== 'surveyed');
          const surveyed = techniquesOfPub(p.id).filter((x) => x.role === 'surveyed').length;
          return (
            <li key={p.id} className={picked.has(p.id) ? 'paper picked' : 'paper'}>
              <label className="paper-select">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => flip(p.id)} aria-label={`Select ${p.title}`} />
              </label>
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
            </li>
          );
        })}
      </ol>
      <SelectionBar
        count={picked.size}
        noun="paper"
        pubs={sortedPublications.filter((p) => picked.has(p.id))}
        onClear={() => setPicked(new Set())}
      />
    </div>
  );
}
