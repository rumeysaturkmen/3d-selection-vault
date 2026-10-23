import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { attributes, techniques, valueLabel } from '../lib/data';
import { countValues, search, type Filters, type SortKey } from '../lib/search';

const OPEN_BY_DEFAULT = new Set(['selectionTool', 'inputModality', 'disambiguation']);

// Filter state lives in the URL so a filtered view can be shared as a link.
function readFilters(params: URLSearchParams): Filters {
  const f: Filters = {};
  for (const a of attributes) {
    const v = params.get(a.id);
    if (v) f[a.id] = v.split(',');
  }
  return f;
}

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const sort = (params.get('sort') as SortKey) ?? 'name';
  const filters = useMemo(() => readFilters(params), [params]);

  const results = useMemo(() => search(techniques, query, filters, sort), [query, filters, sort]);
  const active = Object.values(filters).reduce((n, v) => n + v.length, 0);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const toggle = (attr: string, value: string) => {
    const cur = new Set(filters[attr] ?? []);
    if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    update(attr, cur.size ? [...cur].join(',') : null);
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (sort !== 'name') next.set('sort', sort);
    setParams(next, { replace: true });
  };

  // Only offer attributes that at least one technique has been coded for.
  const facetGroups = attributes
    .map((a) => ({ attr: a, counts: countValues(techniques, a.id) }))
    .filter((g) => g.counts.size > 0);

  return (
    <div className="catalogue">
      <section className="intro">
        <h1>3D selection techniques</h1>
        <p>
          A catalogue of techniques for selecting objects in virtual and mixed reality, each linked
          to the papers that introduce and evaluate it.
        </p>
      </section>

      <div className="catalogue-body">
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <h2>Filter</h2>
            {active > 0 && (
              <button type="button" className="link-button" onClick={clearAll}>
                Clear {active}
              </button>
            )}
          </div>
          {facetGroups.map(({ attr, counts }) => {
            const activeHere = filters[attr.id]?.length ?? 0;
            return (
              <details key={attr.id} className="facet" open={OPEN_BY_DEFAULT.has(attr.id) || activeHere > 0}>
                <summary title={attr.description}>
                  <span>{attr.label}</span>
                  {activeHere > 0 && <span className="facet-active">{activeHere}</span>}
                </summary>
                <div className="facet-options">
                  {attr.values
                    .filter((v) => counts.has(v.id))
                    .map((v) => {
                      const on = filters[attr.id]?.includes(v.id) ?? false;
                      return (
                        <label key={v.id} className={on ? 'facet-option on' : 'facet-option'}>
                          <input type="checkbox" checked={on} onChange={() => toggle(attr.id, v.id)} />
                          <span>{v.label}</span>
                          <span className="count">{counts.get(v.id)}</span>
                        </label>
                      );
                    })}
                </div>
              </details>
            );
          })}
          <p className="filters-note">
            What each filter means: <Link to="/about#attributes">attribute scheme</Link>.
          </p>
        </aside>

        <section className="results" aria-live="polite">
          <div className="toolbar">
            <input
              type="search"
              className="search"
              placeholder="Search names, descriptions, tags"
              value={query}
              onChange={(e) => update('q', e.target.value || null)}
              aria-label="Search techniques"
            />
            <select
              value={sort}
              onChange={(e) => update('sort', e.target.value === 'name' ? null : e.target.value)}
              aria-label="Sort"
            >
              <option value="name">Name A–Z</option>
              <option value="year-desc">Newest first</option>
              <option value="year-asc">Oldest first</option>
            </select>
          </div>
          <p className="result-count">
            {results.length === techniques.length
              ? `${results.length} techniques`
              : `${results.length} of ${techniques.length} techniques`}
          </p>

          {results.length === 0 ? (
            <div className="empty">
              <p>No techniques match these filters.</p>
              <button type="button" className="button" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="grid">
              {results.map((t) => (
                <li key={t.id}>
                  <Link to={`/technique/${t.id}`} className="card">
                    <div className="card-top">
                      <h3>{t.name}</h3>
                      {t.year != null && <span className="year">{t.year}</span>}
                    </div>
                    <p>{t.summary}</p>
                    <div className="chips">
                      {(t.attributes.inputModality ?? []).map((v) => (
                        <span key={v} className="chip">
                          {valueLabel('inputModality', v)}
                        </span>
                      ))}
                      {(t.attributes.targetDistance ?? []).map((v) => (
                        <span key={v} className="chip chip-quiet">
                          {valueLabel('targetDistance', v).replace(/ \(.*\)/, '')}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
