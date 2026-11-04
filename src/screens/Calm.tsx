/**
 * 🕯️ The calm corner — for hard days. A breathing lantern, a few short duas,
 * the gratitude jar (good things from your nightly logs), and "call home".
 */
import { useEffect, useState } from 'react';
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
  const [opened, setOpened] = useState<typeof jar>([]);
  const [backLabel] = useState(() => pick(['Back to the cabin', 'I feel a bit better', 'Back home']));
  const tashHour = zonedParts(new Date(), TASHKENT_TZ).hour;
  const goodTime = tashHour >= 8 && tashHour < 22;
  const calledToday = data.habitLog[today]?.includes('family') ?? false;

  const openJar = () => {
    const shuffled = [...jar].sort(() => Math.random() - 0.5);
    setOpened(shuffled.slice(0, 3));
    sfx('twinkle');
  };
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
              <button type="button" className="btn btn--primary" onClick={openJar}>
                {opened.length ? 'Pick three more' : 'Open the jar'}
              </button>
              <ul className="jar-notes">
                {opened.map((n, i) => (
                  <li key={i}>
                    <PixelIcon name="star" size={14} /> {n.text} <small className="muted">— {formatDay(n.date)}</small>
                  </li>
                ))}
              </ul>
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
