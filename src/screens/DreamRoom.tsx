/**
 * 🛋️ Money → Plan & save → Dream room: the dream room jar (the part of each day's share above your
 * daily maximum) builds a room, piece by piece. List what you want with real prices; pieces turn from a
 * faint blueprint to "ready" as the jar covers them, and "I bought it" records the purchase from the jar
 * (it never touches your daily allowance or wish fund). Logic: lib/pot.ts (the jar) and lib/dream.ts.
 */
import { useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import { DREAM_IDEAS, dreamProgress, type DreamProgress } from '../lib/dream';
import { uid } from '../lib/id';
import { formatMoney, parseAmount } from '../lib/money';
import { potStatus } from '../lib/pot';
import type { DreamItem, DreamKind } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, useConfirm } from '../ui/kit';
import { Sprite, type Pal, type Rows } from '../ui/Sprite';

const K = '#2b1d0e';
/** Each kind of piece: its pixel art and where it stands in the room (percent). */
const ART: Record<DreamKind, { rows: Rows; pal: Pal; left: number; bottom: number; width: number }> = {
  rug: { rows: ['.rrrrrrrrrrrrrr.', 'rryyrryyrryyrryr', 'rrrrrrrrrrrrrrrr', '.rrrrrrrrrrrrrr.'], pal: { r: '#c0392b', y: '#e8c21a' }, left: 30, bottom: 3, width: 40 },
  bed: { rows: ['ww..............', 'wd..............', 'wdpppppbbbbbbbbb', 'wdpppppbbbbbbbbb', 'wwwwwwwwwwwwwwww', 'wd............dw'], pal: { w: '#7a4a24', d: '#4a2c14', p: '#fff3d6', b: '#5fa83b' }, left: 3, bottom: 8, width: 34 },
  desk: { rows: ['wwwwwwwwwwwwww', 'dddddddddddddd', '.d..........d.', '.d..........d.', '.d..........d.'], pal: { w: '#a0703c', d: '#6b4423' }, left: 56, bottom: 8, width: 30 },
  monitor: { rows: ['kkkkkkkk', 'kssssssk', 'kssssssk', 'kkkkkkkk', '...kk...', '..kkkk..'], pal: { k: K, s: '#9fd4ff' }, left: 63, bottom: 27, width: 13 },
  lamp: { rows: ['.yyyy.', 'yyyyyy', '..kk..', '..kk..', '.kkkk.'], pal: { y: '#ffd23f', k: '#6b4423' }, left: 79, bottom: 27, width: 6 },
  chair: { rows: ['kkkk..', 'kbbk..', 'kbbk..', 'kbbkkk', 'kbbbbk', 'k....k', 'k....k'], pal: { k: K, b: '#2a6fa8' }, left: 47, bottom: 8, width: 9 },
  shelf: { rows: ['wwwwwwwwww', 'w01234012w', 'wwwwwwwwww', 'w23401230w', 'wwwwwwwwww'], pal: { w: '#7a4a24', '0': '#c0392b', '1': '#2a6fa8', '2': '#5fa83b', '3': '#e8a317', '4': '#7a4fa3' }, left: 40, bottom: 48, width: 18 },
  poster: { rows: ['kkkkkkk', 'ksssyyk', 'ksssyyk', 'kgggggk', 'kgggggk', 'kkkkkkk'], pal: { k: K, s: '#9fd4ff', y: '#ffd23f', g: '#5fa83b' }, left: 8, bottom: 50, width: 12 },
  wardrobe: { rows: ['wwwwwwww', 'wddwwddw', 'wddwwddw', 'wddywddw', 'wddwwddw', 'wddwwddw', 'wwwwwwww', 'w......w'], pal: { w: '#8a5a2e', d: '#6b4423', y: '#e8c21a' }, left: 87, bottom: 8, width: 11 },
  plant: { rows: ['.g.g.', 'ggggg', '.ggg.', '..g..', 'ppppp', '.ppp.'], pal: { g: '#3f7a26', p: '#c0392b' }, left: 40, bottom: 8, width: 6 },
  speaker: { rows: ['kkkk', 'kssk', 'kkkk', 'kssk', 'kssk', 'kkkk'], pal: { k: K, s: '#5f6b72' }, left: 24, bottom: 48, width: 5 },
  other: { rows: ['kkkkkk', 'kyyyyk', 'kkkkkk', 'kyyyyk', 'kkkkkk'], pal: { k: K, y: '#c9963a' }, left: 70, bottom: 48, width: 8 },
};
const KIND_LABEL: Record<DreamKind, string> = {
  desk: 'Desk',
  chair: 'Chair',
  bed: 'Bed',
  lamp: 'Lamp',
  plant: 'Plant',
  rug: 'Rug',
  shelf: 'Shelf',
  monitor: 'Monitor / screen',
  wardrobe: 'Wardrobe',
  poster: 'Poster / art',
  speaker: 'Speaker',
  other: 'Something else',
};

export default function DreamRoom() {
  const { data, update, today, toast } = useStore();
  const ask = useConfirm();
  const s = data.pot ? potStatus(data.pot, data.expenses, today) : null;
  const jar = s?.dreamJar ?? 0;
  const perDay = s?.dreamPerDay ?? 0;
  const progress = dreamProgress(data.dreamRoom, jar, perDay);

  const moveUp = (id: string) =>
    update((d) => {
      const i = d.dreamRoom.findIndex((x) => x.id === id);
      if (i > 0) [d.dreamRoom[i - 1], d.dreamRoom[i]] = [d.dreamRoom[i], d.dreamRoom[i - 1]];
    });
  const remove = async (it: DreamItem) => {
    if (!(await ask(`Remove ${it.name} from your dream room?${it.bought ? ' (The purchase stays in your spending.)' : ''}`, { ok: 'Remove' }))) return;
    update((d) => void (d.dreamRoom = d.dreamRoom.filter((x) => x.id !== it.id)));
  };
  const buy = async (p: DreamProgress) => {
    const it = p.item;
    const short = p.state !== 'ready';
    if (!(await ask(`Record ${formatMoney(it.price)} for ${it.name} from the dream room jar?${short ? ` The jar only covers part of it — it will go below zero.` : ''}`, { ok: 'I bought it' }))) return;
    update((d) => {
      const x = d.dreamRoom.find((y) => y.id === it.id);
      if (!x) return;
      x.bought = today;
      const category = d.categories.find((c) => c.icon === 'house') ?? d.categories.find((c) => c.icon === 'box') ?? d.categories[0];
      d.expenses.push({ id: uid(), amount: it.price, categoryId: category?.id ?? 'other', note: `Dream room: ${it.name}`, date: today, fromDream: true });
    });
    toast(`${it.name} is in your room! 🎉`, 'pop');
  };

  const next = progress.find((p) => p.state === 'saving');
  return (
    <div className="grid grid--2">
      <Panel title="Dream room jar" icon="house">
        {!data.pot ? (
          <Empty>Start a money plan first (Money → Plan). Set a daily maximum, and everything above it builds your dream room.</Empty>
        ) : perDay <= 0 ? (
          <Empty>Set a "most I can spend a day" in Money → Plan → Change the plan. Everything above it lands here every day.</Empty>
        ) : (
          <>
            <p className="big-number big-number--small">{formatMoney(jar)}</p>
            <p className="muted">
              +{formatMoney(perDay)} every day · about {formatMoney(s!.dreamTotal)} by {formatDay(s!.end)}
            </p>
            {next && next.daysToGo !== null && (
              <p className="small">
                Next: {next.item.name} in about {next.daysToGo} day{next.daysToGo === 1 ? '' : 's'}.
              </p>
            )}
          </>
        )}
      </Panel>

      <div className="room room--dream" role="img" aria-label={`Your dream room: ${progress.filter((p) => p.state !== 'saving').length} of ${progress.length} pieces ready or bought`}>
        {progress.map((p, i) => {
          const art = ART[p.item.kind];
          const same = progress.slice(0, i).filter((q) => q.item.kind === p.item.kind).length;
          return (
            <span key={p.item.id} className={`dream-piece is-${p.state}`}>
              <Sprite rows={art.rows} pal={art.pal} at={{ left: `${Math.min(92, art.left + same * 4)}%`, bottom: `${art.bottom + same * 2}%`, width: `${art.width}%` }} />
            </span>
          );
        })}
        {!progress.length && <p className="room__bubble">An empty room, waiting for you. Add your first piece below.</p>}
      </div>

      <Panel title="My dream room" icon="star">
        {progress.length === 0 && <Empty>Add what you'd love in your room — with the real price — and watch it come together.</Empty>}
        <ul className="list">
          {progress.map((p, i) => (
            <li key={p.item.id} className={`list__item dream-row is-${p.state}`}>
              <div className="list__main">
                <span className="list__text">
                  <span>
                    {p.item.name} · <strong>{formatMoney(p.item.price)}</strong>
                  </span>
                  <small className="muted">
                    {p.state === 'bought'
                      ? `Bought ${formatDay(p.item.bought!)} ✨`
                      : p.state === 'ready'
                        ? 'Ready — the jar covers it'
                        : p.daysToGo !== null
                          ? `About ${p.daysToGo} day${p.daysToGo === 1 ? '' : 's'} to go`
                          : 'Saving for it'}
                  </small>
                </span>
              </div>
              {!p.item.bought && (
                <button type="button" className={`btn btn--small ${p.state === 'ready' ? 'btn--primary' : ''}`} onClick={() => buy(p)}>
                  I bought it
                </button>
              )}
              <button type="button" className="icon-btn" onClick={() => moveUp(p.item.id)} disabled={i === 0} aria-label={`Move ${p.item.name} up`}>
                ↑
              </button>
              <button type="button" className="icon-btn" onClick={() => remove(p.item)} aria-label={`Remove ${p.item.name}`}>
                <PixelIcon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
        <AddPiece />
      </Panel>
    </div>
  );
}

function AddPiece() {
  const { data, update, toast } = useStore();
  const [f, setF] = useState({ name: '', price: '', kind: 'desk' as DreamKind });
  const add = (name: string, price: number, kind: DreamKind) => {
    update((d) => void d.dreamRoom.push({ id: uid(), name, price, kind }));
    toast(`${name} added to your dream room`, 'pop');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = parseAmount(f.price);
    if (!f.name.trim() || !(price > 0)) {
      toast('Give it a name and a price', 'error');
      return;
    }
    add(f.name.trim(), price, f.kind);
    setF({ ...f, name: '', price: '' });
  };
  const have = new Set(data.dreamRoom.map((x) => x.name.toLowerCase()));
  return (
    <>
      <form className="form" onSubmit={submit}>
        <p className="field__label">Add a piece</p>
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Standing desk" aria-label="What" maxLength={60} />
        <div className="form__row">
          <Field label="Price ($)" className="grow">
            <input className="input" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Looks like" className="grow">
            <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as DreamKind })}>
              {(Object.keys(KIND_LABEL) as DreamKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" className="btn btn--primary">
          <PixelIcon name="plus" size={16} /> Add
        </button>
      </form>
      <p className="muted small">Ideas — the prices are only a guess, so type your own if you know it:</p>
      <div className="kitchen-chips">
        {DREAM_IDEAS.filter((i) => !have.has(i.name.toLowerCase())).map((i) => (
          <button key={i.name} type="button" className="btn btn--small" onClick={() => add(i.name, i.price, i.kind)}>
            + {i.name} ~{formatMoney(i.price)}
          </button>
        ))}
      </div>
    </>
  );
}
