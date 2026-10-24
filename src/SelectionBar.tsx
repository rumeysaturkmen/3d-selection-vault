import type { Publication } from './lib/types';
import { downloadBibtex } from './lib/bibtex';

/** Bar pinned to the bottom of the screen while anything is selected. */
export default function SelectionBar({
  count,
  noun,
  pubs,
  onClear,
  note,
}: {
  count: number;
  noun: string;
  pubs: Publication[];
  onClear: () => void;
  note?: string;
}) {
  if (count === 0) return null;
  return (
    <div className="selection-bar" role="region" aria-label="Selection">
      <span>
        <strong>{count}</strong> {noun}
        {count === 1 ? '' : 's'} selected
        {note && <span className="muted small"> · {note}</span>}
      </span>
      <span className="selection-actions">
        <button type="button" className="button" disabled={!pubs.length} onClick={() => downloadBibtex(pubs)}>
          Download .bib
        </button>
        <button type="button" className="button button-ghost" onClick={onClear}>
          Clear
        </button>
      </span>
    </div>
  );
}
