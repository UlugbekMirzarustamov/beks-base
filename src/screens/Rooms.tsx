/**
 * 🚪 ROOMS — more of the cabin: Library, Kitchen, Workshop, Bedroom, Observatory, the Garden of
 * Years and the attic's Life Museum. Every room is drawn from your real life (books for notes, jars
 * for the pantry, stars for nights you wrote…), and Simba does something different in each one.
 * Original pixel art, drawn here as tiny SVG sprites. Logic lives in lib/rooms.ts. No points, no penalties.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { formatDay, zonedParts, UK_TZ } from '../lib/dates';
import { gardenOfYear, gardenYears, giftFor, giftWaiting, museum, ROOMS, roomStats, type Exhibit, type RoomId, type RoomStats } from '../lib/rooms';
import { sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { BreakSetting } from '../ui/BreakReminder';
import { Empty, Panel, useSubRoute } from '../ui/kit';

const IDS = ROOMS.map((r) => r.id);
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const BOOK_COLOURS = ['#c0392b', '#2a6fa8', '#5fa83b', '#e8a317', '#7a4fa3', '#16a085'];

// ---------------------------------------------------------------- sprites
type Rows = string[];
type Pal = Record<string, string>;
const K = '#2b1d0e';
const WOOD: Pal = { w: '#7a4a24', d: '#4a2c14', k: K };

/** A pixel sprite that scales with its box (position and width set by the room layout). */
function Sprite({ rows, pal, at, label }: { rows: Rows; pal: Pal; at: CSSProperties; label?: string }) {
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg className="room__sprite" style={at} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {rows.flatMap((row, y) => [...row].map((ch, x) => (pal[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[ch]} /> : null)))}
    </svg>
  );
}

/** A bookshelf holding `n` books (3 shelves × 12). */
function shelf(n: number): { rows: Rows; pal: Pal } {
  const rows = ['w'.repeat(14)];
  const pal: Pal = { ...WOOD };
  BOOK_COLOURS.forEach((c, i) => (pal[String(i)] = c));
  for (let level = 0; level < 3; level++) {
    for (let r = 0; r < 4; r++) {
      let row = 'd';
      for (let col = 0; col < 12; col++) {
        const i = level * 12 + col;
        const tall = (i * 7) % 3 !== 0; // some books are shorter
        row += i < n && (r > 0 || tall) ? String(i % BOOK_COLOURS.length) : '.';
      }
      rows.push(`${row}d`);
    }
    rows.push('w'.repeat(14));
  }
  return { rows, pal };
}

/** A pantry shelf with `n` jars (up to 8). */
function jars(n: number): { rows: Rows; pal: Pal } {
  const fill = ['r', 'y', 'g', 'o'];
  const pal: Pal = { ...WOOD, l: '#8a5a2e', c: '#cfe8f2', r: '#c0392b', y: '#e8c21a', g: '#5fa83b', o: '#e8892b' };
  const rows: Rows = [];
  for (let level = 0; level < 2; level++) {
    const lid: string[] = [];
    const glass: string[] = [];
    const body: string[] = [];
    for (let j = 0; j < 4; j++) {
      const has = level * 4 + j < n;
      const f = fill[(level * 4 + j) % 4];
      lid.push(has ? '.lll' : '....');
      glass.push(has ? '.ccc' : '....');
      body.push(has ? `.c${f}c` : '....');
    }
    rows.push(`d${lid.join('')}.d`, `d${glass.join('')}.d`, `d${body.join('')}.d`, `d${body.join('')}.d`, 'w'.repeat(18));
  }
  return { rows, pal };
}

const SIMBA_SIT: Rows = ['.k....k.', 'ksk..ksk', 'kssssssk', 'ksyssysk', 'ksspssk.', '.kssssk.', 'ksswwssk', 'kssssssk', '.kk..kk.'];
const SIMBA_SLEEP: Rows = ['..........k.k.', '.kkkkkkkkksksk', 'ksssssssssssssk', 'ksswwsssssskkk.', '.kkkkkkkkkkk...'];
const SIMBA_PLAY: Rows = ['k....k.....', 'sk..ks.....', 'ssssss...kk', 'sysysskkkss', 'sspssssssk.', '.ssssssss..', '.ks.ks.ks..'];
const SIMBA_PAL: Pal = { k: K, s: '#e8892b', y: '#2b1d0e', w: '#fff3d6', p: '#f27ab8' };

const BED_TIDY: Rows = ['ww..............', 'wd..............', 'wdpppppbbbbbbbbb', 'wdpppppbbbbbbbbb', 'wwwwwwwwwwwwwwww', 'wd............dw'];
const BED_MESSY: Rows = ['ww..............', 'wd.......bb.....', 'wdppp.bbbbbbb.b.', 'wdpppbbb.bbbbbbb', 'wwwwwwwwwwwwwwww', 'wd............dw'];
const BED_PAL: Pal = { ...WOOD, p: '#fff3d6', b: '#2a6fa8' };
const windowArt = (night: boolean): { rows: Rows; pal: Pal } => ({
  rows: ['wwwwwwwwww', 'wsssswsssw', 'wsysswsssw', 'wsssswsssw', 'wwwwwwwwww', 'wsssswsssw', 'wsssswssyw', 'wwwwwwwwww'],
  pal: { ...WOOD, s: night ? '#1d2340' : '#9fd4ff', y: night ? '#fff3a0' : '#ffd23f' },
});
const stove = (cooking: boolean): { rows: Rows; pal: Pal } => ({
  rows: [cooking ? '..q.q.....' : '..........', cooking ? '.q.q......' : '..........', '.kmmmmk...', '.mmmmmm...', 'kkkkkkkkkk', 'kggkkggkkk', 'kgggggggk.', 'kgffgffgk.', 'kgggggggk.', 'kkkkkkkkk.'],
  pal: { k: K, m: '#9a9a9a', g: '#5f6b72', f: cooking ? '#e8892b' : '#3a3f44', q: '#ffffff' },
});
const TABLE: Rows = ['wwwwwwwwwwww', '.d........d.', '.d........d.', '.d........d.'];
const TELESCOPE: Rows = ['.........kk', '.......kmmk', '.....kmmk..', '...kmmk....', '..kmk......', '...kk......', '..k..k.....', '.k....k....', 'k......k...'];
const PEGBOARD: Rows = ['dddddddddddd', 'd.m..k..y..d', 'd.m.kkk.y..d', 'd.m..k..y..d', 'd.mm.k..yy.d', 'd....k.....d', 'dddddddddddd'];
const BLUEPRINT: Rows = ['bbbbbbbbbb', 'bwwwbbwbwb', 'bwbwbbwwwb', 'bwwwbbbbwb', 'bbbbwwwwbb', 'bbbbbbbbbb'];
const CHEST: Rows = ['.kkkkkkkk.', 'kwwwwwwwwk', 'kkkkyykkkk', 'kwwwyywwwk', 'kwwwwwwwwk', 'kkkkkkkkkk'];
const BUTTERFLY: Rows = ['p.k.p', 'ppkpp', '.pkp.', 'p...p'];
const FRAME_PAL: Pal = { f: '#c9963a', k: K, a: '#5fa83b', b: '#2a6fa8', c: '#e8c21a', r: '#c0392b', p: '#f27ab8', s: '#9fd4ff' };
const EXHIBIT_ART: Record<Exhibit['kind'], Rows> = {
  badge: ['ffffffff', 'fsscsssf', 'fsccccsf', 'fssccssf', 'fscsscsf', 'ffffffff'],
  savings: ['ffffffff', 'fsskksff', 'fskcckff', 'fskcckff', 'fsskksff', 'ffffffff'],
  vision: ['ffffffff', 'fsssscsf', 'fssssssf', 'fsaasssf', 'faaaaaaf', 'ffffffff'],
  assignment: ['ffffffff', 'fsbbbbsf', 'fsbsssff', 'fsbbbbsf', 'fsbsssff', 'ffffffff'],
  campfire: ['ffffffff', 'fssrsssf', 'fsrcrssf', 'fsrccrsf', 'fskkkksf', 'ffffffff'],
  fish: ['ffffffff', 'fssssssf', 'fsbbbsbf', 'fbbkbbsf', 'fsbbbsbf', 'ffffffff'],
  gift: ['ffffffff', 'fsprpssf', 'fsrrrssf', 'fsprpssf', 'fsrrrssf', 'ffffffff'],
};

/** Flower for one month of the Garden of Years: stage 0 (bare earth) to 4 (in full bloom). */
function flower(stage: number, colour: string): { rows: Rows; pal: Pal } {
  const stem = ['..g..', '..g..', '.gg..', '..gg.', '..g..'];
  const heads: Rows[] = [[], ['.g.g.', '..g..'], ['.ccc.', '..g..', '.gg..'], ['.c.c.', 'ccycc', '.ccc.', '..g..'], ['c.c.c', '.ccc.', 'ccycc', '.ccc.', 'c.c.c', '..g..']];
  const body = stage === 0 ? ['.....'] : [...heads[stage], ...stem.slice(0, stage + 1)];
  // Pad to the same height so all flowers stand on the same ground line.
  const padded = [...new Array<string>(12 - body.length).fill('.....'), ...body];
  return { rows: [...padded, 'ddddd', 'eeeee'], pal: { g: '#3f7a26', c: colour, y: '#ffd23f', d: '#6b4423', e: '#4a2c14' } };
}
const FLOWER_COLOURS = ['#f27ab8', '#e8c21a', '#c0392b', '#7a4fa3', '#ffffff', '#e8892b'];

/** Where Simba is in each room (percent of the room). */
const SIMBA_SPOT: Record<RoomId, { left: string; bottom: string; width: string }> = {
  library: { left: '44%', bottom: '8%', width: '9%' },
  kitchen: { left: '58%', bottom: '8%', width: '9%' },
  workshop: { left: '40%', bottom: '6%', width: '12%' },
  bedroom: { left: '14%', bottom: '25%', width: '16%' },
  observatory: { left: '30%', bottom: '8%', width: '9%' },
  garden: { left: '72%', bottom: '4%', width: '12%' },
  attic: { left: '56%', bottom: '8%', width: '9%' },
};

// ---------------------------------------------------------------- screen
export default function Rooms({ sub }: { sub?: string }) {
  const { data, update, today, toast } = useStore();
  const [room, setRoom] = useSubRoute<RoomId>('rooms', sub, IDS);
  const info = ROOMS.find((r) => r.id === room)!;
  const stats = useMemo(() => roomStats(data, today), [data, today]);
  const [line, setLine] = useState('');
  const hour = zonedParts(new Date(), UK_TZ).hour;
  const night = hour >= 19 || hour < 7;
  const spot = SIMBA_SPOT[room];

  const petSimba = () => {
    sfx('purr');
    setLine(info.lines[(info.lines.indexOf(line) + 1) % info.lines.length]);
  };
  const takeGift = () => {
    const gift = giftFor(today);
    update((d) => void d.simbaGifts.push({ date: today, gift }));
    sfx('purr');
    toast(`Simba brought you ${gift}! It's in the Life Museum.`, 'pop');
  };

  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="house" size={28} /> Rooms
      </h1>
      <div className="room-doors" role="tablist" aria-label="Rooms">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === room}
            className="segmented__btn"
            onClick={() => {
              setRoom(r.id);
              setLine('');
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {giftWaiting(data, today) && (
        <div className="alert alert--ok room-gift">
          <span>Simba left something by the door…</span>
          <button type="button" className="btn btn--small btn--primary" onClick={takeGift}>
            Take it
          </button>
        </div>
      )}

      <div className={`room room--${room} ${night ? 'is-night' : ''}`}>
        <Scene room={room} stats={stats} night={night} />
        <button type="button" className="room__simba" style={spot} onClick={petSimba} aria-label={`Pet Simba — ${info.simba.toLowerCase()}`}>
          <Sprite rows={room === 'bedroom' ? SIMBA_SLEEP : room === 'garden' || room === 'workshop' ? SIMBA_PLAY : SIMBA_SIT} pal={SIMBA_PAL} at={{ position: 'static', width: '100%' }} />
        </button>
        {line && (
          <p className="room__bubble" role="status">
            {line}
          </p>
        )}
      </div>
      <p className="muted small center">{info.simba} — tap Simba.</p>

      <RoomInfo room={room} stats={stats} />
    </div>
  );
}

function Scene({ room, stats, night }: { room: RoomId; stats: RoomStats; night: boolean }) {
  const { data, today } = useStore();
  switch (room) {
    case 'library':
      return (
        <>
          <Sprite {...shelf(Math.min(36, stats.books))} at={{ left: '6%', bottom: '8%', width: '30%' }} label={`Bookshelf with ${Math.min(36, stats.books)} books`} />
          <Sprite {...shelf(Math.max(0, Math.min(36, stats.books - 36)))} at={{ left: '64%', bottom: '8%', width: '30%' }} />
          <Sprite rows={TABLE} pal={WOOD} at={{ left: '38%', bottom: '8%', width: '24%' }} />
          {stats.readingToday && <Sprite rows={['.wwww.wwww.', 'wbbbbwbbbbw']} pal={{ w: '#fff3d6', b: '#c9b48a' }} at={{ left: '41%', bottom: '27%', width: '16%' }} label="An open book: you wrote a lecture note today" />}
        </>
      );
    case 'kitchen':
      return (
        <>
          <Sprite {...jars(Math.min(8, stats.jars))} at={{ left: '6%', bottom: '44%', width: '34%' }} label={`${stats.jars} jars in the pantry`} />
          <Sprite {...stove(stats.cookingToday)} at={{ left: '70%', bottom: '8%', width: '24%' }} label={stats.cookingToday ? 'A pot steaming on the stove' : 'A quiet stove'} />
          <Sprite rows={TABLE} pal={WOOD} at={{ left: '8%', bottom: '8%', width: '30%' }} />
          <Sprite rows={['.kkk.', 'kwwwk', '.kkk.']} pal={{ k: K, w: '#c0392b' }} at={{ left: '48%', bottom: '8%', width: '7%' }} />
        </>
      );
    case 'workshop': {
      const n = Math.min(10, stats.finished);
      const top = Array.from({ length: 12 }, (_, i) => (i > 0 && i <= n ? 'b' : '.')).join('');
      return (
        <>
          <Sprite rows={PEGBOARD} pal={{ d: '#8a6a3c', m: '#9a9a9a', k: K, y: '#e8c21a' }} at={{ left: '6%', bottom: '48%', width: '34%' }} />
          <Sprite rows={BLUEPRINT} pal={{ b: '#2a6fa8', w: '#cfe8f2' }} at={{ left: '62%', bottom: '54%', width: '28%' }} />
          <Sprite rows={[top, top, ...TABLE]} pal={{ ...WOOD, b: '#c9963a' }} at={{ left: '58%', bottom: '8%', width: '36%' }} label={`${stats.finished} finished pieces of work on the bench`} />
        </>
      );
    }
    case 'bedroom':
      return (
        <>
          <Sprite {...windowArt(night)} at={{ left: '62%', bottom: '48%', width: '24%' }} />
          <Sprite rows={stats.sleptWell ? BED_TIDY : BED_MESSY} pal={BED_PAL} at={{ left: '6%', bottom: '8%', width: '46%' }} label={stats.sleptWell ? 'A tidy bed — in bed on time last night' : 'A messy bed'} />
          <Sprite rows={['.yy.', 'yyyy', '.kk.', '.kk.', 'kkkk']} pal={{ y: '#ffd23f', k: '#6b4423' }} at={{ left: '58%', bottom: '8%', width: '7%' }} />
        </>
      );
    case 'observatory':
      return (
        <>
          {Array.from({ length: Math.min(80, stats.stars) }, (_, i) => (
            <span key={i} className="room__star" style={{ left: `${((i * 37) % 96) + 2}%`, top: `${((i * 53) % 48) + 4}%` }} />
          ))}
          <Sprite rows={['.yyy.', 'yyyy.', 'yyy..', 'yyyy.', '.yyy.']} pal={{ y: '#fff3a0' }} at={{ left: '12%', top: '10%', width: '7%' }} />
          <Sprite rows={TELESCOPE} pal={{ k: K, m: '#c9963a' }} at={{ left: '56%', bottom: '8%', width: '28%' }} label={`A telescope under ${stats.stars} stars`} />
        </>
      );
    case 'garden':
      return (
        <>
          {gardenOfYear(data, Number(today.slice(0, 4))).map((m, i) => (
            <Sprite key={m.month} {...flower(m.stage, FLOWER_COLOURS[i % FLOWER_COLOURS.length])} at={{ left: `${2 + i * 8}%`, bottom: '4%', width: '6%' }} />
          ))}
          <Sprite rows={BUTTERFLY} pal={{ p: '#f27ab8', k: K }} at={{ left: '84%', bottom: '44%', width: '5%' }} />
        </>
      );
    case 'attic':
      return (
        <>
          {museum(data)
            .slice(0, 6)
            .map((e, i) => (
              <Sprite key={`${e.date}-${e.title}`} rows={EXHIBIT_ART[e.kind]} pal={FRAME_PAL} at={{ left: `${6 + (i % 3) * 16}%`, bottom: `${i < 3 ? 62 : 38}%`, width: '13%' }} label={e.title} />
            ))}
          <Sprite rows={CHEST} pal={{ k: K, w: '#8a5a2e', y: '#e8c21a' }} at={{ left: '70%', bottom: '8%', width: '22%' }} />
        </>
      );
  }
}

function RoomInfo({ room, stats }: { room: RoomId; stats: RoomStats }) {
  const { data, today } = useStore();
  const years = useMemo(() => gardenYears(data, today), [data, today]);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  switch (room) {
    case 'library':
      return (
        <Panel title="Library" icon="book">
          <p>
            <strong>{stats.books}</strong> books — one for every lecture note, word, formula card and recipe you've written.
          </p>
          <a href="#/study/notes" className="more-link">
            Lecture notes →
          </a>
        </Panel>
      );
    case 'kitchen':
      return (
        <Panel title="Kitchen" icon="apple">
          <p>
            <strong>{stats.jars}</strong> jars on the shelf (what's in your pantry). {stats.cookingToday ? 'Something is on the stove — you planned a meal today.' : 'Nothing on the stove: no meal planned today.'}
          </p>
          <a href="#/kitchen" className="more-link">
            Kitchen →
          </a>
        </Panel>
      );
    case 'workshop':
      return (
        <Panel title="Workshop" icon="table">
          <p>
            <strong>{stats.finished}</strong> finished pieces on the bench: coursework you handed in and admin you finished.
          </p>
          <a href="#/study/tools" className="more-link">
            Engineering tools →
          </a>
        </Panel>
      );
    case 'bedroom':
      return (
        <Panel title="Bedroom" icon="moon">
          <p>{stats.sleptWell ? 'The bed is made — you were in bed on time last night.' : 'The bed is a mess. An earlier night tonight? Log your bedtime in the night wind-down on Home.'}</p>
          <BreakSetting />
        </Panel>
      );
    case 'observatory':
      return (
        <Panel title="Observatory" icon="telescope">
          <p>
            <strong>{stats.stars}</strong> stars — one for every night you wrote in Reflect.
          </p>
          <a href="#/reflect/sky" className="more-link">
            My sky →
          </a>
        </Panel>
      );
    case 'garden': {
      const months = gardenOfYear(data, year);
      return (
        <Panel title={`Garden of Years · ${year}`} icon="star">
          <p className="muted small">One flower a month. It grows with your good days: nights you wrote in Reflect, or a mood of 4–5.</p>
          {years.length > 1 && (
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <ul className="garden-months">
            {months.map((m) => (
              <li key={m.month} aria-label={`${MONTHS[m.month - 1]}: ${m.days} good days`}>
                <Sprite {...flower(m.stage, FLOWER_COLOURS[(m.month - 1) % FLOWER_COLOURS.length])} at={{ position: 'static', width: '100%' }} />
                <span>{MONTHS[m.month - 1]}</span>
                <small className="muted">{m.days}</small>
              </li>
            ))}
          </ul>
        </Panel>
      );
    }
    case 'attic': {
      const all = museum(data);
      return (
        <Panel title="Life Museum" icon="photo">
          <p className="muted small">Milestones you've reached, newest first. Prayer and Qur'an stay private, so they're never on display. Simba's gifts so far: {data.simbaGifts.length}.</p>
          {all.length === 0 ? (
            <Empty>The museum is waiting for its first exhibit — a badge, a savings jar reached, a dream come true, or one of Simba's gifts.</Empty>
          ) : (
            <ul className="list">
              {all.map((e) => (
                <li key={`${e.date}-${e.title}`} className="list__item">
                  <div className="list__main">
                    <Sprite rows={EXHIBIT_ART[e.kind]} pal={FRAME_PAL} at={{ position: 'static', width: '32px', flex: 'none' }} />
                    <span className="list__text">
                      <span>{e.title}</span>
                      <small className="muted">
                        {formatDay(e.date)} {e.date.slice(0, 4)}
                      </small>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      );
    }
  }
}
