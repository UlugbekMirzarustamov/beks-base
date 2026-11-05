/**
 * 🗄️ ARCHIVE — everything you've written in Bek's Base, newest first and grouped by month,
 * with search words, areas and a time range. It reads the same index as the command palette
 * (lib/search.ts): nothing is copied or stored. Sealed letters still show their title only.
 */
import { useMemo, useState } from 'react';
import { formatMonth } from '../lib/dates';
import { ARCHIVE_AREAS, archiveYears, buildIndex, groupByMonth, searchArchive, type ArchiveArea } from '../lib/search';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Panel } from '../ui/kit';

const PAGE = 150;

/** The date range for "Any time", "This month" or a year like "2026". */
function rangeOf(period: string, today: string): { from?: string; to?: string } {
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-31` };
  if (period === 'all') return {};
  return { from: `${period}-01-01`, to: `${period}-12-31` };
}

export default function Archive({ sub }: { sub?: string }) {
  const { data, today } = useStore();
  const [query, setQuery] = useState(() => {
    try {
      return sub ? decodeURIComponent(sub) : '';
    } catch {
      return '';
    }
  });
  const [areas, setAreas] = useState<ArchiveArea[]>([]);
  const [period, setPeriod] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const index = useMemo(() => buildIndex(data), [data]);
  const years = useMemo(() => archiveYears(index), [index]);
  const results = useMemo(() => searchArchive(index, { query, areas, ...rangeOf(period, today) }), [index, query, areas, period, today]);
  const groups = groupByMonth(results.slice(0, shown));

  const toggleArea = (a: ArchiveArea) => {
    setAreas((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
    setShown(PAGE);
  };

  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="shelf" size={28} /> Archive
      </h1>
      <Panel>
        <div className="form">
          <div className="palette__field archive__field">
            <PixelIcon name="search" size={20} />
            <input
              className="palette__input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search everything you've written…"
              aria-label="Search the archive"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="kitchen-chips" role="group" aria-label="Areas">
            {ARCHIVE_AREAS.map((a) => (
              <button key={a.id} type="button" className="segmented__btn" aria-pressed={areas.includes(a.id)} onClick={() => toggleArea(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <label className="form__row">
            <span className="muted small">When</span>
            <select
              className="input grow"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setShown(PAGE);
              }}
            >
              <option value="all">Any time</option>
              <option value="month">This month</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small" role="status">
            {results.length === 0 ? 'Nothing found' : `${results.length} thing${results.length === 1 ? '' : 's'}`}
            {areas.length ? ` in ${areas.map((a) => ARCHIVE_AREAS.find((x) => x.id === a)?.label).join(', ')}` : ''}
          </p>
        </div>
      </Panel>
      {results.length === 0 && <Empty>{index.length === 0 ? 'Nothing written yet. Everything you add around the base collects here.' : 'Try fewer words, another area or "Any time".'}</Empty>}
      {groups.map((g) => (
        <Panel key={g.month || 'undated'} title={`${g.month ? formatMonth(g.month) : 'No date'} · ${g.entries.length}`}>
          <ul className="list">
            {g.entries.map((e) => (
              <li key={e.key} className="list__item">
                <a href={e.href} className="list__main archive__row">
                  <span className="list__text">
                    <span>{e.title}</span>
                    <small className="muted">
                      {e.kind}
                      {e.sub ? ` · ${e.sub}` : ''}
                    </small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
      {results.length > shown && (
        <button type="button" className="btn btn--wide" onClick={() => setShown(shown + PAGE)}>
          Show more ({results.length - shown} left)
        </button>
      )}
    </div>
  );
}
