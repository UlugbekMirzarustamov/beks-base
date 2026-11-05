/**
 * 🌱 The knowledge garden (Study → Notes → Garden): every lecture note is a plant in its module's
 * bed, growing taller the more it's connected; [[links]] are vines between plants. Seeds are notes
 * you've linked to but not written yet; lonely notes have no links. Reads notes only — saves nothing.
 */
import { useMemo } from 'react';
import { gardenGraph } from '../lib/notes';
import type { LectureNote } from '../lib/types';
import { useStore } from '../state/store';
import { Empty } from '../ui/kit';

const BED_COLOURS = ['#f27ab8', '#e8c21a', '#7a4fa3', '#e8892b', '#2a6fa8', '#c0392b'];
const PER_ROW = 5;
const W = 320;
const COL = W / PER_ROW;
const ROW_H = 74;

/** Taller with more connections and a fuller note (12–46 units). */
const stemHeight = (links: number, note: LectureNote) => 12 + Math.min(4, links) * 6 + Math.min(10, Math.floor(note.body.length / 120));

export function KnowledgeGarden({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: (title: string) => void }) {
  const { data } = useStore();
  const g = useMemo(() => gardenGraph(data.lectureNotes, data.topics.map((t) => t.name)), [data.lectureNotes, data.topics]);

  // One bed per module (notes without a module share the last bed), each plant placed in a grid.
  const layout = useMemo(() => {
    const ids = [...new Set(g.plants.map((p) => p.note.subjectId ?? ''))].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : 0));
    let y = 0;
    const beds = ids.map((sid, b) => {
      const plants = g.plants
        .filter((p) => (p.note.subjectId ?? '') === sid)
        .sort((a, c) => a.note.date.localeCompare(c.note.date))
        .map((p, i) => {
          const ground = y + 16 + (Math.floor(i / PER_ROW) + 1) * ROW_H - 14;
          return { ...p, x: COL * (i % PER_ROW) + COL / 2, ground, h: stemHeight(p.links, p.note) };
        });
      const rows = Math.max(1, Math.ceil(plants.length / PER_ROW));
      const bed = { sid, name: data.subjects.find((s) => s.id === sid)?.name ?? 'No module', colour: BED_COLOURS[b % BED_COLOURS.length], top: y, rows, plants };
      y += rows * ROW_H + 18;
      return bed;
    });
    return { beds, height: y };
  }, [g, data.subjects]);

  if (!g.plants.length) return <Empty>Your garden is empty. Each lecture note becomes a plant — link notes with [[Title]] to grow vines between them.</Empty>;

  const flowerAt = new Map<string, { x: number; y: number }>();
  for (const bed of layout.beds) for (const p of bed.plants) flowerAt.set(p.note.id, { x: p.x, y: p.ground - p.h - 3 });

  return (
    <div className="kgarden">
      <svg className="kgarden__svg" viewBox={`0 0 ${W} ${layout.height}`} role="group" aria-label="Knowledge garden: your notes as plants">
        {layout.beds.map((bed) => (
          <g key={bed.sid || 'none'}>
            <text x={4} y={bed.top + 11} className="kgarden__bed-name">
              {bed.name}
            </text>
            {Array.from({ length: bed.rows }, (_, r) => (
              <rect key={r} x={0} y={bed.top + 16 + (r + 1) * ROW_H - 14} width={W} height={6} fill="#6b4423" />
            ))}
          </g>
        ))}
        {g.vines.map(([a, b]) => {
          const p = flowerAt.get(a);
          const q = flowerAt.get(b);
          if (!p || !q) return null;
          return <path key={`${a}-${b}`} d={`M${p.x},${p.y} Q${(p.x + q.x) / 2},${Math.min(p.y, q.y) - 18} ${q.x},${q.y}`} className="kgarden__vine" />;
        })}
        {layout.beds.map((bed) =>
          bed.plants.map((p) => {
            const open = () => onOpen(p.note.id);
            return (
              <g
                key={p.note.id}
                className="kgarden__plant"
                role="button"
                tabIndex={0}
                aria-label={`${p.note.title}: ${p.links} connection${p.links === 1 ? '' : 's'}`}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                  }
                }}
              >
                <rect x={p.x - COL / 2 + 2} y={p.ground - 52} width={COL - 4} height={68} fill="transparent" />
                <rect x={p.x - 1} y={p.ground - p.h} width={2} height={p.h} fill="#3f7a26" />
                <rect x={p.x - 5} y={p.ground - p.h * 0.55} width={4} height={2} fill="#5fa83b" />
                <rect x={p.x + 1} y={p.ground - p.h * 0.35} width={4} height={2} fill="#5fa83b" />
                <rect x={p.x - 3} y={p.ground - p.h - 6} width={6} height={6} fill={bed.colour} />
                <rect x={p.x - 1} y={p.ground - p.h - 4} width={2} height={2} fill="#ffd23f" />
                <text x={p.x} y={p.ground + 12} textAnchor="middle" className="kgarden__label">
                  {p.note.title.length > 11 ? `${p.note.title.slice(0, 10)}…` : p.note.title}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <p className="muted small">
        {g.plants.length} plant{g.plants.length === 1 ? '' : 's'} · {g.vines.length} vine{g.vines.length === 1 ? '' : 's'}. Plants grow taller with more links. Tap one to open it.
      </p>
      {g.seeds.length > 0 && (
        <>
          <p className="field__label">Seeds to plant (linked, not written yet)</p>
          <div className="kitchen-chips">
            {g.seeds.map((s) => (
              <button key={s.title} type="button" className="btn btn--small" onClick={() => onCreate(s.title)}>
                🌱 {s.title}
                {s.count > 1 ? ` ×${s.count}` : ''}
              </button>
            ))}
          </div>
        </>
      )}
      {g.lonely.length > 0 && (
        <>
          <p className="field__label">Lonely notes — link them to something</p>
          <div className="kitchen-chips">
            {g.lonely.map((n) => (
              <button key={n.id} type="button" className="btn btn--small" onClick={() => onOpen(n.id)}>
                {n.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
