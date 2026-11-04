/**
 * 🕯️ The calm corner — for hard days. A breathing lantern, a few short duas,
 * the gratitude jar (good things from your nightly logs), and "call home".
 */
import { useEffect, useRef, useState } from 'react';
import { pick } from '../lib/cabin';
import { clockIn, formatDay, TASHKENT_TZ, zonedParts } from '../lib/dates';
import { sfx } from '../lib/sound';
import { XP } from '../lib/xp';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Panel } from '../ui/kit';

const BREATH = [
  { label: 'Breathe in', secs: 4, scale: 1.35 },
  { label: 'Hold', secs: 4, scale: 1.35 },
  { label: 'Breathe out', secs: 6, scale: 0.85 },
];

function Breathing() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [rounds, setRounds] = useState(0);
  const phase = BREATH[step];
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      const next = (step + 1) % BREATH.length;
      if (next === 0) setRounds((r) => r + 1);
      setStep(next);
    }, phase.secs * 1000);
    return () => clearTimeout(t);
  }, [running, step, phase.secs]);

  return (
    <Panel title="Breathe with the lantern" icon="lantern" className="calm-breath">
      <div className="calm-breath__stage" aria-live="polite">
        <span
          className="big-lantern calm-breath__lantern"
          style={{ transform: `scale(${running ? phase.scale * 2 : 2})`, transitionDuration: `${running ? phase.secs : 0.3}s` }}
          aria-hidden="true"
        />
        <p className="calm-breath__label">{running ? phase.label : 'Ready when you are'}</p>
      </div>
      <p className="muted small">In for 4 · hold for 4 · out for 6. A few rounds slow your heart down and quiet the mind.{rounds > 0 && ` Rounds: ${rounds}.`}</p>
      <button
        type="button"
        className={`btn ${running ? '' : 'btn--primary'}`}
        onClick={() => {
          setRunning(!running);
          setStep(0);
        }}
      >
        {running ? 'Stop' : 'Start breathing'}
      </button>
    </Panel>
  );
}

const DUAS = [
  { arabic: 'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ', latin: 'Hasbunallahu wa ni‘mal wakeel', meaning: 'Allah is enough for us, and He is the best to rely on.' },
  { arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', latin: 'La hawla wa la quwwata illa billah', meaning: 'There is no power and no strength except with Allah.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ', latin: 'Allahumma inni a‘udhu bika minal-hammi wal-hazan', meaning: 'O Allah, I seek refuge in You from worry and grief.' },
];

export default function CalmCorner() {
  const { data, update, today, gainXp, toast } = useStore();
  // Every "good thing" you ever wrote in Reflect → Tonight goes into the jar.
  const jar = Object.entries(data.nightLogs).flatMap(([date, log]) => log.good.filter((g) => g.trim()).map((text) => ({ date, text })));
  const [backLabel] = useState(() => pick(['Back to the cabin', 'I feel a bit better', 'Back home']));
  const tashHour = zonedParts(new Date(), TASHKENT_TZ).hour;
  const goodTime = tashHour >= 8 && tashHour < 22;
  const calledToday = data.habitLog[today]?.includes('family') ?? false;

  const called = () => {
    if (!data.habits.some((h) => h.id === 'family') || calledToday) return;
    update((d) => void (d.habitLog[today] = [...(d.habitLog[today] ?? []), 'family']));
    gainXp(XP.habit, 'called home');
    toast('That will have made their day.', 'pop');
  };

  return (
    <div className="screen calm">
      <h1 className="screen__title">
        <PixelIcon name="lantern" size={28} /> The Calm Corner
      </h1>
      <p className="calm__intro">Hard day? That's okay. Take a minute here. Nothing to tick off, nothing to fix right now.</p>
      <div className="grid grid--2">
        <Breathing />

        <Panel title="A few words" icon="mat">
          <ul className="duas">
            {DUAS.map((d) => (
              <li key={d.latin}>
                <p className="duas__arabic" lang="ar">
                  {d.arabic}
                </p>
                <p>
                  <strong>{d.latin}</strong>
                </p>
                <p className="muted">{d.meaning}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Gratitude jar · ${jar.length}`} icon="gift">
          {jar.length === 0 ? (
            <Empty>
              The jar is empty for now. Each night, write three good things in <a href="#/reflect/tonight">Reflect → Tonight</a> and they'll collect here.
            </Empty>
          ) : (
            <>
              <p>{jar.length} good things saved. Open it and pull one out whenever you need a reminder.</p>
              <button type="button" className="btn btn--primary" onClick={openJar}>
                <PixelIcon name="gift" size={16} /> Open the jar
              </button>
            </>
          )}
        </Panel>

        <Panel title="Call home" icon="phone">
          <p>
            It's <strong>{clockIn(TASHKENT_TZ)}</strong> in Tashkent — {goodTime ? 'a good time to call.' : 'they’re probably asleep. Send a voice message instead?'}
          </p>
          <button type="button" className="btn" onClick={called} disabled={calledToday}>
            {calledToday ? 'Called home today ✓' : 'I called / messaged home'}
          </button>
          <p className="muted small">
            If things feel heavy for more than a few days, please talk to someone — a friend, USIC student support, or your GP. You don't have to carry it alone.
          </p>
        </Panel>
      </div>
      <p className="center">
        <a href="#/home" className="btn">
          {backLabel}
        </a>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- the big gratitude jar
/** Open the full-screen gratitude jar from anywhere (the cabin, the calm corner…). */
export const openJar = () => window.dispatchEvent(new Event('beks:jar'));

const NOTE_COLOURS = ['#ffd93b', '#ff8c6a', '#9be36a', '#9fdcff', '#f2a6c8', '#fff3d6'];

/** Every good thing from Reflect → Tonight, newest first. */
function useJarNotes() {
  const { data } = useStore();
  return Object.entries(data.nightLogs)
    .flatMap(([date, log]) => log.good.filter((g) => g.trim()).map((text) => ({ date, text })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Full screen, background blurred: a big jar packed with folded notes.
 * Tap the jar → it shakes and one note pops out and unfolds.
 */
export function JarOverlay() {
  const notes = useJarNotes();
  const [open, setOpen] = useState(false);
  const [pulled, setPulled] = useState<{ date: string; text: string; colour: string; key: number } | null>(null);
  const [shake, setShake] = useState(0);
  const lastIndex = useRef(-1);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setPulled(null);
    };
    window.addEventListener('beks:jar', show);
    return () => window.removeEventListener('beks:jar', show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const pull = () => {
    if (!notes.length) return;
    // A random note, but never the same one twice in a row.
    let i = Math.floor(Math.random() * notes.length);
    if (notes.length > 1 && i === lastIndex.current) i = (i + 1) % notes.length;
    lastIndex.current = i;
    setShake((n) => n + 1);
    setPulled({ ...notes[i], colour: NOTE_COLOURS[i % NOTE_COLOURS.length], key: Date.now() });
    sfx('pop');
    setTimeout(() => sfx('twinkle'), 250);
  };

  // Fill level: a few notes already look like a cosy pile; ~13+ fill the jar to the top.
  const fill = notes.length ? Math.min(96, 34 + notes.length * 5) : 0;
  const rows = Math.ceil(fill / 7); // notes overlap in rows every 7% of the height
  const shown = notes.length ? rows * 5 : 0;
  return (
    <div className="jar-overlay" role="dialog" aria-modal="true" aria-label="Gratitude jar" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <p className="jar-overlay__title">Gratitude jar</p>
      <button type="button" className={`big-jar ${shake % 2 ? 'is-shake-a' : shake ? 'is-shake-b' : ''}`} onClick={pull} aria-label={notes.length ? 'Pull a note out of the jar' : 'The jar is empty'}>
        <span className="big-jar__lid" aria-hidden="true" />
        <span className="big-jar__glass" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const tilt = ((i * 37) % 7) - 3; // a little messy, like real folded notes
            return (
              <span
                key={i}
                className="big-jar__note"
                style={{
                  left: `${-2 + col * 20 + (row % 2) * 6 + ((i * 7) % 4)}%`,
                  bottom: `${row * 7 - 2 + ((i * 3) % 3)}%`,
                  background: NOTE_COLOURS[i % NOTE_COLOURS.length],
                  transform: `rotate(${tilt * 5}deg)`,
                }}
              />
            );
          })}
        </span>
      </button>
      <p className="jar-overlay__hint">
        {notes.length ? `${notes.length} good thing${notes.length === 1 ? '' : 's'} inside · tap the jar to pull one out` : 'The jar is empty for now.'}
      </p>

      {pulled && (
        <div key={pulled.key} className="jar-card" style={{ background: pulled.colour }} role="status">
          <span className="jar-card__fold" aria-hidden="true" />
          <p className="jar-card__text">{pulled.text}</p>
          <p className="jar-card__date">— {formatDay(pulled.date)}</p>
        </div>
      )}

      <div className="jar-overlay__actions">
        {notes.length ? (
          <button type="button" className="btn btn--primary" onClick={pull}>
            {pulled ? 'Another one' : 'Pull out a note'}
          </button>
        ) : (
          <a href="#/reflect/tonight" className="btn btn--primary" onClick={() => setOpen(false)}>
            Add tonight's good things
          </a>
        )}
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}
