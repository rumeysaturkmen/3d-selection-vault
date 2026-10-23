import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph';
import SpriteText from 'three-spritetext';
import { attributes, getTechnique, techniques, valueLabel } from '../lib/data';
import { nearest, similarityLinks, type Coding, type Neighbour } from '../lib/similarity';

const MINE = '__mine__';
const NEIGHBOURS = 8;
const COLOR_BY = ['selectionTool', 'inputModality', 'toolOrigin', 'disambiguation'] as const;

// Mid-tone colours that read on both the light and the dark background.
const PALETTE = ['#b23a48', '#3f6fb0', '#4f8a4b', '#c08a2e', '#7a4fa3', '#2f8f8a', '#b8613a', '#6b7280'];

interface GNode {
  id: string;
  name: string;
  year?: number | null;
  group: string;
  mine?: boolean;
  x?: number;
  y?: number;
  z?: number;
}
interface GLink {
  source: string | GNode;
  target: string | GNode;
  score: number;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const idOf = (end: string | GNode) => (typeof end === 'string' ? end : end.id);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function NeighbourList({ items, onPick }: { items: Neighbour[]; onPick: (id: string) => void }) {
  if (!items.length) return <p className="muted small">Code a few more attributes to find similar techniques.</p>;
  return (
    <ol className="nb-list">
      {items.map(({ technique: t, similarity: s }) => {
        const shared = s.matches.filter((m) => m.shared.length > 0);
        return (
          <li key={t.id}>
            <div className="nb-head">
              <button type="button" className="link-button nb-name" onClick={() => onPick(t.id)}>
                {t.name}
              </button>
              <span className="nb-score">{pct(s.score)}</span>
            </div>
            <div className="nb-bar">
              <span style={{ width: pct(s.score) }} />
            </div>
            <p className="nb-shared">
              {shared.length
                ? `Shares: ${shared
                    .map((m) => m.shared.map((v) => valueLabel(m.attribute, v)).join(', '))
                    .join(' · ')}`
                : 'No identical values; similar only on ordered attributes.'}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function GraphPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('t') ?? '';
  const colorBy = (COLOR_BY as readonly string[]).includes(params.get('color') ?? '')
    ? (params.get('color') as string)
    : 'selectionTool';
  const [mode, setMode] = useState<'explore' | 'mine'>(params.get('mode') === 'mine' ? 'mine' : 'explore');
  const [mine, setMine] = useState<Coding>({});
  const [query, setQuery] = useState('');
  const [themeTick, setThemeTick] = useState(0);

  const box = useRef<HTMLDivElement>(null);
  const graph = useRef<ForceGraph3DInstance | null>(null);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const pick = (id: string) => {
    setMode('explore');
    setParam('t', id);
  };

  const mineCoded = Object.values(mine).some((v) => v.length > 0);
  const mineNeighbours = useMemo(
    () => (mineCoded ? nearest(attributes, mine, techniques, NEIGHBOURS) : []),
    [mine, mineCoded],
  );
  const sel = getTechnique(selected);
  const selNeighbours = useMemo(
    () => (sel ? nearest(attributes, sel.attributes, techniques, NEIGHBOURS, sel.id) : []),
    [sel],
  );

  // Which node is in focus and which are its neighbours.
  const focusId = mode === 'mine' && mineCoded ? MINE : sel?.id ?? '';
  const focusSet = useMemo(() => {
    const list = focusId === MINE ? mineNeighbours : selNeighbours;
    return new Set([focusId, ...list.map((n) => n.technique.id)].filter(Boolean));
  }, [focusId, mineNeighbours, selNeighbours]);

  const groupValues = useMemo(() => attributes.find((a) => a.id === colorBy)!.values, [colorBy]);
  const colorOf = (group: string) => {
    const i = groupValues.findIndex((v) => v.id === group);
    return i < 0 ? PALETTE[PALETTE.length - 1] : PALETTE[i % PALETTE.length];
  };

  const baseLinks = useMemo(() => similarityLinks(attributes, techniques, 3), []);

  // Create the graph once.
  useEffect(() => {
    const el = box.current!;
    const g = new ForceGraph3D(el, { controlType: 'orbit' })
      .backgroundColor(cssVar('--bg'))
      .showNavInfo(false)
      .nodeId('id')
      .nodeRelSize(4)
      .nodeOpacity(0.95)
      .linkOpacity(0.35)
      .cooldownTicks(160)
      .onNodeClick((n: object) => {
        const node = n as GNode;
        if (!node.mine) pick(node.id);
      });
    g.d3Force('link')?.distance((l: GLink) => 20 + (1 - l.score) * 160);
    g.d3Force('charge')?.strength(-60);
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

  // Data: every technique, plus "your technique" when one is being placed.
  useEffect(() => {
    const g = graph.current;
    if (!g) return;
    const old = new Map((g.graphData().nodes as GNode[]).map((n) => [n.id, n]));
    const keep = (n: GNode): GNode => {
      const o = old.get(n.id);
      return o ? { ...n, x: o.x, y: o.y, z: o.z } : n;
    };
    const nodes: GNode[] = techniques.map((t) =>
      keep({ id: t.id, name: t.name, year: t.year, group: t.attributes[colorBy]?.[0] ?? '' }),
    );
    const links: GLink[] = baseLinks.map((l) => ({ ...l }));
    if (mode === 'mine' && mineCoded) {
      nodes.push(keep({ id: MINE, name: 'Your technique', group: mine[colorBy]?.[0] ?? '', mine: true }));
      for (const n of mineNeighbours.slice(0, 5))
        links.push({ source: MINE, target: n.technique.id, score: n.similarity.score });
    }
    g.graphData({ nodes, links });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorBy, mode, mineCoded, mineNeighbours, baseLinks]);

  // Styling follows the focus.
  useEffect(() => {
    const g = graph.current;
    if (!g) return;
    const dim = cssVar('--line-strong');
    const text = cssVar('--text');
    const accent = cssVar('--accent');
    const focused = focusSet.size > 0;
    g.nodeColor((n: object) => {
      const node = n as GNode;
      if (node.mine) return accent;
      if (focused && !focusSet.has(node.id)) return dim;
      return colorOf(node.group);
    })
      .nodeVal((n: object) => ((n as GNode).id === focusId ? 3 : focusSet.has((n as GNode).id) ? 1.6 : 1))
      .nodeLabel((n: object) => {
        const node = n as GNode;
        return `<div class="graph-tip"><b>${node.name}</b>${node.year ? ` · ${node.year}` : ''}</div>`;
      })
      .nodeThreeObjectExtend(true)
      .nodeThreeObject(((n: object) => {
        const node = n as GNode;
        if (!focusSet.has(node.id)) return null;
        const s = new SpriteText(node.name, node.id === focusId ? 9 : 6.5, text);
        s.fontFace = '"Source Sans 3 Variable", sans-serif';
        s.fontWeight = node.id === focusId ? '700' : '500';
        s.position.y = node.id === focusId ? 15 : 11;
        s.backgroundColor = cssVar('--bg') + 'cc';
        s.padding = 1.5;
        s.borderRadius = 2;
        return s;
      }) as never)
      .linkColor((l: object) => {
        const link = l as GLink;
        const on = focusSet.has(idOf(link.source)) && focusSet.has(idOf(link.target));
        return focused ? (on ? accent : dim) : cssVar('--muted');
      })
      .linkWidth((l: object) => {
        const link = l as GLink;
        return focusSet.has(idOf(link.source)) && focusSet.has(idOf(link.target)) && focused ? 1.2 : 0;
      });
  }, [focusSet, focusId, colorBy, groupValues, themeTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to the focused node once the layout has placed it.
  useEffect(() => {
    const g = graph.current;
    if (!g || !focusId) return;
    const t = setTimeout(() => {
      const node = (g.graphData().nodes as GNode[]).find((n) => n.id === focusId);
      if (!node || node.x == null) return;
      const d = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
      const r = 1 + 320 / d;
      g.cameraPosition({ x: node.x * r, y: (node.y ?? 0) * r, z: (node.z ?? 0) * r }, node as never, 900);
    }, 500);
    return () => clearTimeout(t);
  }, [focusId]);

  const matches = query.trim()
    ? techniques.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="graph-page">
      <div className="graph-intro">
        <h1>Similarity graph</h1>
        <p className="muted">
          Techniques that share more attributes sit closer together and are linked. Pick one to see its nearest
          neighbours and what they have in common, or place your own technique to find which existing ones to
          compare it with.
        </p>
      </div>

      <div className="graph-layout">
        <div className="graph-canvas-wrap">
          <div className="graph-canvas" ref={box} />
          <div className="graph-legend">
            <label>
              Colour by{' '}
              <select value={colorBy} onChange={(e) => setParam('color', e.target.value)}>
                {COLOR_BY.map((id) => (
                  <option key={id} value={id}>
                    {attributes.find((a) => a.id === id)!.label}
                  </option>
                ))}
              </select>
            </label>
            <ul>
              {groupValues.map((v, i) => (
                <li key={v.id}>
                  <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {v.label}
                </li>
              ))}
            </ul>
            <p className="small muted">Drag to rotate · scroll to zoom · click a dot</p>
          </div>
        </div>

        <aside className="graph-panel">
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'explore'}
              className={mode === 'explore' ? 'on' : ''}
              onClick={() => setMode('explore')}
            >
              Explore
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'mine'}
              className={mode === 'mine' ? 'on' : ''}
              onClick={() => setMode('mine')}
            >
              Place my technique
            </button>
          </div>

          {mode === 'explore' && (
            <div className="panel-body">
              <div className="graph-search">
                <input
                  type="search"
                  placeholder="Find a technique…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {matches.length > 0 && (
                  <ul className="graph-search-results">
                    {matches.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => {
                            pick(t.id);
                            setQuery('');
                          }}
                        >
                          {t.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {sel ? (
                <>
                  <div className="graph-selected">
                    <h2>{sel.name}</h2>
                    <p className="small muted">{sel.summary}</p>
                    <p className="small">
                      <Link to={`/technique/${sel.id}`}>Open technique page</Link> ·{' '}
                      <button type="button" className="link-button" onClick={() => setParam('t', null)}>
                        Clear
                      </button>
                    </p>
                  </div>
                  <h3 className="panel-h">Most similar</h3>
                  <NeighbourList items={selNeighbours} onPick={pick} />
                </>
              ) : (
                <p className="muted small">Click a dot or search for a technique to see its nearest neighbours.</p>
              )}
            </div>
          )}

          {mode === 'mine' && (
            <div className="panel-body">
              <p className="small muted">
                Tick what describes your technique. Leave an attribute empty if it does not apply or you are not
                sure; it is then left out of the comparison.
              </p>
              <form className="mine-form" onSubmit={(e) => e.preventDefault()}>
                {attributes.map((a) => (
                  <fieldset key={a.id}>
                    <legend title={a.description}>{a.label}</legend>
                    <div className="mine-options">
                      {a.values.map((v) => {
                        const on = (mine[a.id] ?? []).includes(v.id);
                        return (
                          <label key={v.id} className={on ? 'on' : ''}>
                            <input
                              type={a.multiple ? 'checkbox' : 'radio'}
                              name={a.id}
                              checked={on}
                              onChange={() =>
                                setMine((m) => {
                                  const cur = m[a.id] ?? [];
                                  const next = a.multiple
                                    ? on
                                      ? cur.filter((x) => x !== v.id)
                                      : [...cur, v.id]
                                    : on
                                      ? []
                                      : [v.id];
                                  return { ...m, [a.id]: next };
                                })
                              }
                            />
                            {v.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                {mineCoded && (
                  <button type="button" className="link-button" onClick={() => setMine({})}>
                    Clear all
                  </button>
                )}
              </form>
              <h3 className="panel-h">Closest existing techniques</h3>
              {mineCoded ? (
                <NeighbourList items={mineNeighbours} onPick={pick} />
              ) : (
                <p className="muted small">Your technique appears in the graph once you tick something.</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <p className="small muted graph-note">
        Similarity is the weighted overlap of the attributes both techniques have coded (weights from the{' '}
        <Link to="/about#attributes">attribute scheme</Link>). Most codings are still drafts, so treat the graph as a
        starting point for your related-work search, not a final answer.
      </p>
    </div>
  );
}
