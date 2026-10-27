import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { REPO_URL, attributes, publications, schemeStatus, techniques } from '../lib/data';
import { countValues } from '../lib/search';

const MAX_WEIGHT = Math.max(...attributes.map((a) => a.weight));

function Weight({ value }: { value: number }) {
  return (
    <span className="weight" title={`Weight ${value} of ${MAX_WEIGHT} in the similarity score`}>
      {Array.from({ length: MAX_WEIGHT }, (_, i) => (
        <span key={i} className={i < value ? 'on' : ''} />
      ))}
    </span>
  );
}

export default function About() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const years = techniques.map((t) => t.year).filter((y): y is number => y != null);
  const counts = useMemo(
    () => new Map(attributes.map((a) => [a.id, countValues(techniques, a.id)])),
    [],
  );
  const reviewed = techniques.filter((t) => t.review.status === 'reviewed').length;

  return (
    <div className="about">
      <header className="about-hero">
        <p className="eyebrow">About the vault</p>
        <h1>A shared map of 3D selection techniques</h1>
        <p className="lede">
          The 3D Selection Vault is an open catalogue of techniques for selecting objects in virtual and mixed
          reality. It is built for researchers: when you design a new technique, it helps you find the existing
          techniques closest to yours, and so the ones to compare against in your paper.
        </p>
        <div className="stats">
          <Link to="/" className="stat">
            <span className="stat-label">Techniques</span>
            <span className="stat-value">{techniques.length}</span>
          </Link>
          <Link to="/papers" className="stat" title="See all papers">
            <span className="stat-label">Papers</span>
            <span className="stat-value">{publications.length}</span>
            <span className="stat-more">See the list →</span>
          </Link>
          <a
            href="#/about#attributes"
            className="stat"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('attributes')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="stat-label">Attributes</span>
            <span className="stat-value">{attributes.length}</span>
          </a>
          {years.length > 0 && (
            <div className="stat">
              <span className="stat-label">Years covered</span>
              <span className="stat-value">
                {Math.min(...years)}–{Math.max(...years)}
              </span>
            </div>
          )}
        </div>
      </header>

      <section className="about-section">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-n">1</span>
            <h3>Collect</h3>
            <p>
              Each technique gets one record, linked to the paper that introduced it and to the studies and
              surveys that evaluated it.
            </p>
            <Link to="/">Browse the catalogue</Link>
          </li>
          <li>
            <span className="step-n">2</span>
            <h3>Code</h3>
            <p>
              Every technique is described with the same {attributes.length} attributes, so any two can be
              compared like for like.
            </p>
            <a
              href="#/about#attributes"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('attributes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See the attributes
            </a>
          </li>
          <li>
            <span className="step-n">3</span>
            <h3>Compare</h3>
            <p>
              Shared attributes give a similarity score. The graph places similar techniques together, and you
              can drop in your own to find its neighbours, then download their papers as BibTeX.
            </p>
            <Link to="/graph">Open the similarity graph</Link>
          </li>
        </ol>
      </section>

      <section className="about-section" id="attributes">
        <div className="section-head">
          <h2>Attribute scheme</h2>
          <p className="muted">
            What each technique is coded on. The dots show how much each attribute counts in the similarity
            score; click a value to see the techniques that have it.
          </p>
        </div>
        {schemeStatus === 'draft' && (
          <p className="notice">
            This scheme is a draft and may still change. Selection tool, tool origin, motor and visual space, and disambiguation follow the classification in
            Argelaguet and Andujar's 2013 survey of 3D selection techniques.
          </p>
        )}
        <div className="attr-grid">
          {attributes.map((a) => {
            const c = counts.get(a.id)!;
            return (
              <article key={a.id} className="attr-card">
                <div className="attr-card-head">
                  <h3>{a.label}</h3>
                  <Weight value={a.weight} />
                </div>
                <p>{a.description}</p>
                <ul className="value-chips">
                  {a.values.map((v) => (
                    <li key={v.id}>
                      <Link to={`/?${a.id}=${v.id}`}>
                        {v.label}
                        <span className="n">{c.get(v.id) ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="attr-foot">
                  {a.multiple ? 'Several values allowed' : 'One value'}
                  {a.basis ? ` · ${a.basis === 'Addition' ? 'Added for this vault' : a.basis}` : ''}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="about-section" id="people">
        <h2>People</h2>
        <p className="muted">The vault is maintained at Concordia University in Montréal, Canada.</p>
        <div className="people">
          <div className="person">
            <span className="avatar" aria-hidden="true">RT</span>
            <div>
              <h3>Rumeysa Turkmen</h3>
              <p>PhD candidate</p>
              <p className="muted small">Department of Computer Science and Software Engineering, Concordia University</p>
            </div>
          </div>
          <div className="person">
            <span className="avatar" aria-hidden="true">AUB</span>
            <div>
              <h3>Anil Ufuk Batmaz</h3>
              <p>Assistant Professor</p>
              <p className="muted small">Department of Computer Science and Software Engineering, Concordia University</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-cols">
        <div className="about-card">
          <h2>Contribute</h2>
          <p>
            Missing a technique, or spotted a coding you disagree with? Suggest it with the technique's name and
            its original paper, or edit its data file and open a pull request.
          </p>
          <p className="about-actions">
            <a className="button" href={`${REPO_URL}/issues/new/choose`} target="_blank" rel="noreferrer">
              Suggest a technique
            </a>
            <a className="button button-ghost" href={REPO_URL} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </p>
        </div>
        <div className="about-card">
          <h2>The data</h2>
          <p>
            Each technique is one JSON file in{' '}
            <a href={`${REPO_URL}/tree/main/data/techniques`} target="_blank" rel="noreferrer">
              data/techniques
            </a>{' '}
            and each paper one file in{' '}
            <a href={`${REPO_URL}/tree/main/data/publications`} target="_blank" rel="noreferrer">
              data/publications
            </a>
            . Every change is checked automatically before it appears on the site.
          </p>
          <p className="muted small">
            {reviewed} of {techniques.length} techniques reviewed so far; the rest are draft codings awaiting a
            check against their papers.
          </p>
        </div>
        <div className="about-card">
          <h2>Licence</h2>
          <p>
            The site's code and the catalogue data are released under the MIT licence. Papers, figures and videos
            linked from the vault belong to their authors and publishers.
          </p>
        </div>
      </section>
    </div>
  );
}
