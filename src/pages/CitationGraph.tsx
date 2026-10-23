import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph';
import SpriteText from 'three-spritetext';
import { getPublication, publications } from '../lib/data';
import {
  citationCoverage,
  citations,
  citedByOf,
  citesOf,
  isReview,
  pubHref,
  shortAuthors,
  techniquesOfPub,
} from '../lib/citations';

const ERAS = [
  { id: 'e1', label: 'Before 2000', test: (y: number) => y < 2000, color: '#7a4fa3' },
  { id: 'e2', label: '2000–2009', test: (y: number) => y < 2010, color: '#3f6fb0' },
  { id: 'e3', label: '2010–2019', test: (y: number) => y < 2020, color: '#2f8f8a' },
  { id: 'e4', label: '2020 onwards', test: () => true, color: '#c08a2e' },
];
const REVIEW_COLOR = '#b23a48';

interface PNode {
  id: string;
  label: string;
  year?: number | null;
  review: boolean;
  inDeg: number;
  x?: number;
  y?: number;
  z?: number;
}
interface PLink {
  source: string | PNode;
  target: string | PNode;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const idOf = (end: string | PNode) => (typeof end === 'string' ? end : end.id);
const eraColor = (y?: number | null) => (y ? ERAS.find((e) => e.test(y))!.color : '#6b7280');

function PubList({ ids, onPick }: { ids: string[]; onPick: (id: string) => void }) {
  const items = ids
    .map((id) => getPublication(id)!)
    .filter(Boolean)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  if (!items.length) return <p className="muted small">None in the vault.</p>;
  return (
    <ul className="cite-list">
      {items.map((p) => (
        <li key={p.id}>
          <button type="button" className="link-button cite-name" onClick={() => onPick(p.id)}>
            {p.title}
          </button>
          <span className="muted small">
            {' '}
            {shortAuthors(p)}
            {p.year ? `, ${p.year}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CitationGraph() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('p') ?? '';
  const [query, setQuery] = useState('');
  const [themeTick, setThemeTick] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const graph = useRef<ForceGraph3DInstance | null>(null);

  const pick = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('p', id);
    else next.delete('p');
    setParams(next, { replace: true });
  };

  const data = useMemo(() => {
    const linked = new Set(citations.flatMap((c) => [c.from, c.to]));
    const nodes: PNode[] = publications
      .filter((p) => linked.has(p.id))
      .map((p) => ({
        id: p.id,
        label: `${shortAuthors(p)}${p.year ? ` ${p.year}` : ''}`,
        year: p.year,
        review: isReview(p),
        inDeg: citedByOf(p.id).length,
      }));
    const links: PLink[] = citations.map((c) => ({ source: c.from, target: c.to }));
    return { nodes, links };
  }, []);

  const sel = getPublication(selected);
  const focus = useMemo(
    () => (sel ? new Set([sel.id, ...citesOf(sel.id), ...citedByOf(sel.id)]) : new Set<string>()),
    [sel],
  );

  useEffect(() => {
    const el = box.current!;
    const g = new ForceGraph3D(el, { controlType: 'orbit' })
      .backgroundColor(cssVar('--bg'))
      .showNavInfo(false)
      .nodeId('id')
      .nodeRelSize(3.2)
      .nodeOpacity(0.95)
      .linkOpacity(0.3)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .cooldownTicks(200)
      .onNodeClick((n: object) => pick((n as PNode).id));
    g.d3Force('charge')?.strength(-45);
    g.graphData(data);
    graph.current = g;
    const resize = () => g.width(el.clientWidth).height(el.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const retheme = () => {
      g.backgroundColor(cssVar('--bg'));
      setThemeTick((x) => x + 1);
    };
    window.addEventListener('themechange', retheme);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', retheme);
    return () => {
      ro.disconnect();
      window.removeEventListener('themechange', retheme);
      mq?.removeEventListener('change', retheme);
      g._destructor();
      el.innerHTML = '';
      graph.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = graph.current;
    if (!g) return;
    const dim = cssVar('--line-strong');
    const text = cssVar('--text');
    const accent = cssVar('--accent');
    const on = focus.size > 0;
    const touches = (l: PLink) => sel && (idOf(l.source) === sel.id || idOf(l.target) === sel.id);
    g.nodeColor((n: object) => {
      const node = n as PNode;
      if (on && !focus.has(node.id)) return dim;
      return node.review ? REVIEW_COLOR : eraColor(node.year);
    })
      .nodeVal((n: object) => {
        const node = n as PNode;
        return (node.id === sel?.id ? 3 : 1) * (1 + node.inDeg / 4);
      })
      .nodeLabel((n: object) => {
        const p = getPublication((n as PNode).id)!;
        return `<div class="graph-tip"><b>${p.title}</b><br>${shortAuthors(p)}${p.year ? ` · ${p.year}` : ''} · cited by ${citedByOf(p.id).length} in the vault</div>`;
      })
      .nodeThreeObjectExtend(true)
      .nodeThreeObject(((n: object) => {
        const node = n as PNode;
        if (!focus.has(node.id)) return null;
        const s = new SpriteText(node.label, node.id === sel?.id ? 7 : 4.5, text);
        s.fontFace = '"Source Sans 3 Variable", sans-serif';
        s.fontWeight = node.id === sel?.id ? '700' : '500';
        s.backgroundColor = cssVar('--bg') + 'cc';
        s.padding = 1.2;
        s.borderRadius = 2;
        s.position.y = node.id === sel?.id ? 13 : 9;
        return s;
      }) as never)
      .linkColor((l: object) => (on ? (touches(l as PLink) ? accent : dim) : cssVar('--muted')))
      .linkWidth((l: object) => (on && touches(l as PLink) ? 0.8 : 0))
      .linkVisibility((l: object) => !on || touches(l as PLink) || focus.size === 0)
      .linkDirectionalArrowColor((l: object) => (on && touches(l as PLink) ? accent : cssVar('--muted')));
  }, [focus, sel, themeTick]);

  useEffect(() => {
    const g = graph.current;
    if (!g || !sel) return;
    const t = setTimeout(() => {
      const node = (g.graphData().nodes as PNode[]).find((n) => n.id === sel.id);
      if (!node || node.x == null) return;
      const d = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
      const r = 1 + 260 / d;
      g.cameraPosition({ x: node.x * r, y: (node.y ?? 0) * r, z: (node.z ?? 0) * r }, node as never, 900);
    }, 600);
    return () => clearTimeout(t);
  }, [sel]);

  const matches = query.trim()
    ? publications
        .filter((p) => `${p.title} ${p.authors.join(' ')} ${p.year ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  const techs = sel ? techniquesOfPub(sel.id) : [];
  const href = sel ? pubHref(sel) : undefined;

  return (
    <>
      <div className="graph-intro">
        <h1>Citation graph</h1>
        <p className="muted">
          Each dot is a paper in the vault; an arrow means one paper cites the other. Larger dots are cited by more
          papers in the vault. Pick a paper to see what it cites and what cites it.
        </p>
      </div>

      <div className="graph-layout">
        <div className="graph-canvas-wrap">
          <div className="graph-canvas" ref={box} />
          <div className="graph-legend">
            <ul>
              {ERAS.map((e) => (
                <li key={e.id}>
                  <span className="dot" style={{ background: e.color }} />
                  {e.label}
                </li>
              ))}
              <li>
                <span className="dot" style={{ background: REVIEW_COLOR }} />
                Survey or thesis
              </li>
            </ul>
            <p className="small muted">Drag to rotate · scroll to zoom · click a dot</p>
          </div>
        </div>

        <aside className="graph-panel">
          <div className="panel-body">
            <div className="graph-search">
              <input
                type="search"
                placeholder="Find a paper…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {matches.length > 0 && (
                <ul className="graph-search-results">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          pick(p.id);
                          setQuery('');
                        }}
                      >
                        {p.title} <span className="muted small">{p.year}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {sel ? (
              <>
                <div className="graph-selected">
                  <h2 className="paper-h">{sel.title}</h2>
                  <p className="small muted">
                    {sel.authors.join(', ')}
                    {sel.year ? ` · ${sel.year}` : ''}
                    {sel.venue ? ` · ${sel.venue}` : ''}
                  </p>
                  <p className="small">
                    {href && (
                      <>
                        <a href={href} target="_blank" rel="noreferrer">
                          Open paper
                        </a>{' '}
                        ·{' '}
                      </>
                    )}
                    <button type="button" className="link-button" onClick={() => pick(null)}>
                      Clear
                    </button>
                  </p>
                  {techs.length > 0 && (
                    <p className="small">
                      Techniques:{' '}
                      {techs.slice(0, 8).map((x, i) => (
                        <span key={x.technique.id}>
                          {i > 0 && ', '}
                          <Link to={`/technique/${x.technique.id}`}>{x.technique.name}</Link>
                        </span>
                      ))}
                      {techs.length > 8 && ` and ${techs.length - 8} more`}
                    </p>
                  )}
                </div>
                <h3 className="panel-h">Cited by {citedByOf(sel.id).length} in the vault</h3>
                <PubList ids={citedByOf(sel.id)} onPick={pick} />
                <h3 className="panel-h">Cites {citesOf(sel.id).length} in the vault</h3>
                <PubList ids={citesOf(sel.id)} onPick={pick} />
              </>
            ) : (
              <p className="muted small">Click a dot or search for a paper to see its citations.</p>
            )}
          </div>
        </aside>
      </div>

      <p className="small muted graph-note">
        Citations come from OpenAlex reference lists, available for {citationCoverage.withReferenceData} of the{' '}
        {citationCoverage.publications} papers; for surveys without that data, the techniques they cover are used.
        Papers with no citation data in either direction are not shown. See every paper on the{' '}
        <Link to="/papers">Papers</Link> page.
      </p>
    </>
  );
}
