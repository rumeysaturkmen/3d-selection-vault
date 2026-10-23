import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attributes, editUrl, getPublication, getTechnique, valueLabel } from '../lib/data';
import type { Publication, PublicationLink, Relationship } from '../lib/types';

const ROLE_LABEL: Record<PublicationLink['role'], string> = {
  introduced: 'Introduces the technique',
  evaluated: 'Evaluates the technique',
  surveyed: 'Survey covering the technique',
  reference: 'Reference (role not yet classified)',
};
const ROLE_ORDER: PublicationLink['role'][] = ['introduced', 'evaluated', 'reference', 'surveyed'];

const REL_LABEL: Record<Relationship['type'], string> = {
  extends: 'Extends',
  'variant-of': 'Variant of',
  'compared-with': 'Compared with',
  related: 'Related to',
};

const REVIEW_LABEL = {
  migrated: 'Imported from the old catalogue, not yet reviewed',
  draft: 'Draft, awaiting review',
  reviewed: 'Reviewed',
};

function cite(p: Publication) {
  const authors =
    p.authors.length > 3 ? `${p.authors[0]} et al.` : p.authors.join(', ') || 'Unknown authors';
  return `${authors}${p.year ? ` (${p.year})` : ''}`;
}

function CopyBibtex({ bibtex }: { bibtex: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="link-button"
      onClick={() => {
        navigator.clipboard?.writeText(bibtex).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => undefined,
        );
      }}
    >
      {done ? 'Copied' : 'Copy BibTeX'}
    </button>
  );
}

export default function TechniquePage() {
  const { id = '' } = useParams();
  const t = getTechnique(id);

  if (!t)
    return (
      <div className="empty">
        <h1>Technique not found</h1>
        <p>
          There is no technique with the id “{id}”. <Link to="/">See all techniques</Link>.
        </p>
      </div>
    );

  const pubs = [...t.publications].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
  const coded = attributes.filter((a) => (t.attributes[a.id] ?? []).length > 0).length;
  const uncertain = new Set(t.review.uncertain ?? []);

  return (
    <article className="technique">
      <Link to="/" className="back">
        ← All techniques
      </Link>

      <header className="technique-head">
        <h1>{t.name}</h1>
        <p className="meta">
          {t.year != null ? <span>{t.year}</span> : <span>Year unknown</span>}
          {t.aliases && t.aliases.length > 0 && <span>Also known as {t.aliases.join(', ')}</span>}
          {t.tasks.length > 1 && <span>Also used for {t.tasks.filter((x) => x !== 'selection').join(', ')}</span>}
        </p>
        <p className="lead">{t.summary}</p>
      </header>

      <div className="technique-body">
        <div className="technique-main">
          {t.howItWorks && (
            <section>
              <h2>How it works</h2>
              <p>{t.howItWorks}</p>
            </section>
          )}

          {((t.advantages?.length ?? 0) > 0 || (t.limitations?.length ?? 0) > 0) && (
            <section className="pros-cons">
              {(t.advantages?.length ?? 0) > 0 && (
                <div>
                  <h2>Strengths</h2>
                  <ul>
                    {t.advantages!.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(t.limitations?.length ?? 0) > 0 && (
                <div>
                  <h2>Limitations</h2>
                  <ul>
                    {t.limitations!.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section>
            <h2>Publications</h2>
            {pubs.length === 0 && <p className="muted">No publications linked yet.</p>}
            <ul className="pub-list">
              {pubs.map((link) => {
                const p = getPublication(link.publication);
                if (!p) return null;
                const href = p.doi ? `https://doi.org/${p.doi}` : p.url;
                return (
                  <li key={link.publication}>
                    <span className="pub-role">{ROLE_LABEL[link.role]}</span>
                    <span className="pub-title">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer">
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}
                    </span>
                    <span className="pub-meta">
                      {cite(p)}
                      {p.venue ? ` · ${p.venue}` : ''}
                      {link.where ? ` · ${link.where}` : ''}
                    </span>
                    {p.bibtex && <CopyBibtex bibtex={p.bibtex} />}
                  </li>
                );
              })}
            </ul>
          </section>

          {(t.relationships?.length ?? 0) > 0 && (
            <section>
              <h2>Related techniques</h2>
              <ul className="rel-list">
                {t.relationships!.map((r) => {
                  const other = getTechnique(r.technique);
                  if (!other) return null;
                  return (
                    <li key={`${r.type}-${r.technique}`}>
                      <span className="rel-type">{REL_LABEL[r.type]}</span>{' '}
                      <Link to={`/technique/${other.id}`}>{other.name}</Link>
                      {r.note && <span className="muted"> · {r.note}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="technique-side">
          <section className="panel">
            <h2>Attributes</h2>
            <p className="muted small">
              {coded} of {attributes.length} coded
              {uncertain.size > 0 && ` · ? = not yet confirmed`}
            </p>
            <dl className="attr-list">
              {attributes.map((a) => {
                const vals = t.attributes[a.id] ?? [];
                return (
                  <div key={a.id}>
                    <dt title={a.description}>{a.label}</dt>
                    <dd className={vals.length ? '' : 'muted'}>
                      {vals.length ? vals.map((v) => valueLabel(a.id, v)).join(', ') : 'Not coded'}
                      {vals.length > 0 && uncertain.has(a.id) && (
                        <span className="unsure" title="Best guess, still to be checked against the paper">
                          ?
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="panel">
            <h2>Record</h2>
            <p className={`review review-${t.review.status}`}>{REVIEW_LABEL[t.review.status]}</p>
            <p className="small">
              <a href={editUrl(`data/techniques/${t.id}.json`)} target="_blank" rel="noreferrer">
                Suggest a correction on GitHub
              </a>
            </p>
          </section>
        </aside>
      </div>
    </article>
  );
}
