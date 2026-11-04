/**
 * The trophy shelf: every badge, shiny if earned (with the date), dark with
 * a hint if not yet.
 */
import { BADGES } from '../lib/badges';
import { formatDay } from '../lib/dates';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Panel } from '../ui/kit';

export function BadgeShelf() {
  const { data } = useStore();
  const earned = BADGES.filter((b) => data.badges[b.id]);
  // Earned first (newest first), then the rest in their normal order.
  const sorted = [...earned.sort((a, b) => data.badges[b.id].localeCompare(data.badges[a.id])), ...BADGES.filter((b) => !data.badges[b.id])];

  return (
    <Panel title={`Badges · ${earned.length} / ${BADGES.length}`} icon="star">
      <Bar value={earned.length} max={BADGES.length} label="Badges collected" color="var(--gold)" />
      <ul className="badges">
        {sorted.map((b) => {
          const when = data.badges[b.id];
          return (
            <li key={b.id} className={`badge badge--${b.tier} ${when ? 'is-earned' : 'is-locked'}`}>
              <span className="badge__medal" aria-hidden="true">
                <PixelIcon name={b.icon} size={30} />
              </span>
              <span className="badge__ribbon" aria-hidden="true" />
              <strong className="badge__name">{when ? b.name : '???'}</strong>
              <small className="badge__how">{when ? `Earned ${formatDay(when)}` : b.how}</small>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** A one-line summary for Home: "Badges 3/23 →". */
export function BadgeSummary() {
  const { data } = useStore();
  const count = Object.keys(data.badges).length;
  return (
    <a href="#/more/badges" className="badge-summary">
      <PixelIcon name="star" size={16} /> Badges {count}/{BADGES.length} →
    </a>
  );
}
