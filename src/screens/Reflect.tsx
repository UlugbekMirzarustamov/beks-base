/**
 * 🔭 REFLECT — "the Telescope".
 * Tabs (kept simple on purpose):
 *  - Tonight  a 1-minute nightly log.
 *  - Diary    dated entries.
 *  - Week     the weekly look back (with that week's real numbers).
 *  - Month    the month story.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { addDays, formatDay } from '../lib/dates';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import { addToDiary, parseDiaryFile, sortDiary, stampNow } from '../lib/diary';
import { entryKey, forgetPublishKey, loadPublishKey, publishDiary, savePublishKey, type PublishResult } from '../lib/publish';
import type { NightLog } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Tabs, useConfirm, useSubRoute } from '../ui/kit';
import { WeekReflect } from './Extras';
import { MonthStoryView } from './Growth';

const TABS = ['tonight', 'diary', 'week', 'month'] as const;
type Tab = (typeof TABS)[number];

/** XP for lighting a star (logging a night). */
const STAR_XP = 10;

export default function Reflect({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('reflect', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="telescope" size={28} /> The Telescope
      </h1>
      <a href="#/archive" className="more-link archive-link">
        Look back through everything in the archive →
      </a>
      <Tabs<Tab>
        label="Reflect sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'tonight', label: 'Tonight', icon: 'moon' },
          { id: 'diary', label: 'Diary', icon: 'book' },
          { id: 'week', label: 'Week', icon: 'calendar' },
          { id: 'month', label: 'Month', icon: 'scroll' },
        ]}
      />
      {tab === 'tonight' && <Tonight onLit={() => setTab('diary')} />}
      {tab === 'diary' && <Diary />}
      {tab === 'week' && <WeekReflect />}
      {tab === 'month' && <MonthStoryView />}
    </div>
  );
}

// ---------------------------------------------------------------- Tonight
const emptyLog = (): NightLog => ({ line: '', good: ['', '', ''], tomorrow: '' });

function Tonight({ onLit }: { onLit: () => void }) {
  const { data, update, today, gainXp, toast } = useStore();
  const log = data.nightLogs[today] ?? emptyLog();
  const yesterday = data.nightLogs[addDays(today, -1)];
  const ready = log.line.trim().length > 0;

  const edit = (change: Partial<NightLog>) =>
    update((d) => {
      d.nightLogs[today] = { ...(d.nightLogs[today] ?? emptyLog()), ...change, savedAt: stampNow().time };
    });

  const light = () => {
    if (!ready) {
      toast('Write today in one sentence first', 'error');
      return;
    }
    if (!log.rewarded) {
      sfx('twinkle');
      edit({ rewarded: true });
      gainXp(STAR_XP, 'a new star in your sky');
    }
    onLit();
  };

  return (
    <div className="grid grid--2">
      <Panel title={`Tonight · ${formatDay(today)}`} icon="moon" className="tonight">
        <p className="muted small">One minute before bed. No essays — just honest notes. Saved automatically.{log.savedAt ? ` Last saved at ${log.savedAt}.` : ''}</p>
        {yesterday?.tomorrow && (
          <p className="tonight__echo">
            <PixelIcon name="scroll" size={16} /> Last night you planned: <strong>“{yesterday.tomorrow}”</strong>. Did you?
          </p>
        )}
        <Field label="Today in one sentence">
          <textarea className="input" rows={2} value={log.line} onChange={(e) => edit({ line: e.target.value })} placeholder="e.g. Hard physics day, but I finally got momentum." />
        </Field>
        <fieldset className="field">
          <legend className="field__label">Three good things (tiny ones count)</legend>
          <div className="good-things">
            {log.good.map((g, i) => (
              <label key={i} className="good-thing">
                <PixelIcon name="star" size={18} />
                <input
                  className="input"
                  aria-label={`Good thing ${i + 1}`}
                  value={g}
                  placeholder={['Nice chat with a classmate', 'Cooked plov', 'Sunny walk to class'][i]}
                  onChange={(e) => edit({ good: log.good.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Tomorrow I will…">
          <input className="input" value={log.tomorrow} onChange={(e) => edit({ tomorrow: e.target.value })} placeholder="e.g. Do 2 Pomodoros of Maths before lunch" />
        </Field>
        <button type="button" className={`btn ${log.rewarded ? '' : 'btn--primary'} btn--wide`} onClick={light}>
          <PixelIcon name="star" size={18} /> {log.rewarded ? 'Star lit — see my sky' : "Light tonight's star"}
        </button>
      </Panel>
      <Panel title="Why bother?" icon="telescope">
        <p>
          Looking back for one minute a day helps you notice what's working, catch stress early, and remember the good bits of a busy year
          far from home.
        </p>
        <p className="muted small">
          Every night you log becomes a star in <a href="#/reflect/sky">your sky</a>. Nights in a row join up into constellations — try not
          to break the chain.
        </p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Diary
function Diary() {
  const { data, update, toast } = useStore();
  const ask = useConfirm();
  const [text, setText] = useState('');
  const entries = sortDiary(data.diary);

  const [liveKey, setLiveKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<PublishResult | 'sending' | null>(null);

  useEffect(() => {
    loadPublishKey().then(setLiveKey).catch(() => {});
  }, []);

  // Every time the Diary opens: bring in anything new from the site.
  useEffect(() => {
    let cancelled = false;
    fetch('./four-nights.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : null))
      .then((body) => {
        const incoming = body ? parseDiaryFile(body) : null;
        if (!incoming || cancelled) return;
        update((d) => {
          addToDiary(d.diary, incoming.filter((e) => !d.diaryRemoved.includes(entryKey(e))));
        });
      })
      .catch(() => {}); // offline: try again next time
    return () => {
      cancelled = true;
    };
  }, [update]);

  // When connected: keep the site matching this diary.
  useEffect(() => {
    if (!liveKey) return;
    let cancelled = false;
    setStatus('sending');
    publishDiary(liveKey, data.diary, data.diaryRemoved).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveKey, data.diary, data.diaryRemoved]);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    await savePublishKey(key);
    setKeyInput('');
    setLiveKey(key);
  };

  const disconnect = async () => {
    await forgetPublishKey();
    setLiveKey(null);
    setStatus(null);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const stamp = stampNow();
    update((d) => {
      d.diary.push({ id: uid(), ...stamp, text });
    });
    setText('');
    toast(`Saved · ${formatDay(stamp.date)} at ${stamp.time}`, 'pop');
  };

  const addFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const incoming = parseDiaryFile(await file.text());
    if (!incoming) {
      toast("That isn't a diary file. Nothing was changed.", 'error');
      return;
    }
    const added = addToDiary([...data.diary], incoming);
    update((d) => {
      addToDiary(d.diary, incoming);
    });
    toast(added ? `Added ${added} diary ${added === 1 ? 'entry' : 'entries'}` : 'Those entries are already here', 'pop');
  };

  const remove = async (id: string) => {
    if (!(await ask('Delete this diary entry?'))) return;
    update((d) => {
      const entry = d.diary.find((x) => x.id === id);
      if (entry) d.diaryRemoved.push(entryKey(entry));
      d.diary = d.diary.filter((x) => x.id !== id);
    });
  };

  return (
    <div className="grid grid--2">
      <Panel title="Write" icon="scroll">
        <form className="form" onSubmit={save}>
          <Field label="Anything you want to say">
            <textarea className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn--primary btn--wide" disabled={!text.trim()}>
            Save with today's date and time
          </button>
        </form>
        {liveKey ? (
          <div className="form">
            <p className="small">
              <strong>Live.</strong>{' '}
              {status === 'sending' && 'Posting to your site…'}
              {status === 'live' && 'Your site is up to date. New entries appear there within a few minutes.'}
              {status === 'failed' && "Couldn't reach your site. It will try again next time the Diary opens."}
              {status === 'bad-key' && 'GitHub refused the key. Disconnect and paste a new one.'}
            </p>
            <button type="button" className="btn btn--small" onClick={disconnect}>
              Disconnect from my site
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={connect}>
            <p className="muted small">Not live: new entries stay in this browser. If you connect, every diary entry goes on your public site.</p>
            <Field label="GitHub key">
              <input className="input" type="password" autoComplete="off" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            </Field>
            <button type="submit" className="btn btn--wide" disabled={!keyInput.trim()}>
              Connect and go live
            </button>
          </form>
        )}
        <label className="btn btn--wide">
          Add entries from a file
          <input type="file" accept="application/json,.json" className="visually-hidden" onChange={addFile} />
        </label>
      </Panel>
      <Panel title="Your diary" icon="moon">
        {entries.length === 0 ? (
          <Empty>Nothing written yet.</Empty>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="diary-entry">
              <h3 className="diary-entry__when">
                {formatDay(entry.date)}
                {entry.time ? ` · ${entry.time}` : ''}
              </h3>
              <p className="diary-entry__text">{entry.text}</p>
              <button type="button" className="btn btn--small" onClick={() => remove(entry.id)}>
                Delete
              </button>
            </article>
          ))
        )}
      </Panel>
    </div>
  );
}
