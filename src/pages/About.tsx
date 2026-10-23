import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { REPO_URL, attributes, schemeStatus } from '../lib/data';

export default function About() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <article className="prose">
      <h1>About the vault</h1>
      <p>
        The 3D Selection Vault is an open catalogue of techniques for selecting objects in virtual
        and mixed reality. It is built for researchers: when you design a new selection technique,
        the vault should help you find the existing techniques closest to yours, and so the ones
        to compare against in your paper.
      </p>
      <p>
        Every technique is coded against the same set of attributes, so techniques can be filtered,
        compared and placed in a <Link to="/graph">similarity graph</Link>.
      </p>

      <h2>Where the data lives</h2>
      <p>
        Each technique is one JSON file in{' '}
        <a href={`${REPO_URL}/tree/main/data/techniques`} target="_blank" rel="noreferrer">
          data/techniques
        </a>{' '}
        and each paper one file in{' '}
        <a href={`${REPO_URL}/tree/main/data/publications`} target="_blank" rel="noreferrer">
          data/publications
        </a>
        . Every change is checked automatically and reviewed before it appears on the site.
      </p>

      <h2 id="attributes">Attribute scheme</h2>
      {schemeStatus === 'draft' && (
        <p className="notice">
          This scheme is a draft and may still change. The first six attributes follow the
          classification in Argelaguet and Andujar's 2013 survey of 3D selection techniques.
        </p>
      )}
      <table className="scheme">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Values</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{a.label}</strong>
                <span className="muted small block">{a.description}</span>
              </td>
              <td>{a.values.map((v) => v.label).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Contributing</h2>
      <p>
        Missing a technique, or spotted an error? Open an{' '}
        <a href={`${REPO_URL}/issues/new/choose`} target="_blank" rel="noreferrer">
          issue on GitHub
        </a>{' '}
        with the technique's name and its original paper, or edit the data file directly and open
        a pull request.
      </p>

      <h2>Licence</h2>
      <p>
        The site's code and the catalogue data are released under the MIT licence. Papers,
        figures and videos linked from the vault belong to their authors and publishers.
      </p>
    </article>
  );
}
