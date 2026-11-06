/**
 * ⚙️ MORE — words, habits, mood, journal, plus settings,
 * backups (Export / Import) and example-data cleanup.
 */
import { useEffect, useRef, useState } from 'react';
import { backupPhotos, parseBackup } from '../lib/backup';
import { lastBackup, shareBackup } from './Daily';
import { setPhotos, usePhotos } from './Photos';
import { HardModeToggle } from './Push';
import { idb } from '../lib/db';
import { listAllSnapshots, type SnapshotInfo } from '../lib/persist';
import { createInitialData, upgrade } from '../lib/seed';
import type { Settings } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { GroupedTabs, Panel, Segmented, useConfirm, useSubRoute } from '../ui/kit';
import { SoundMixer } from '../ui/SoundMixer';
import { BreakSetting } from '../ui/BreakReminder';
import { InstallCard } from '../ui/AppFeel';
import { BEK_H, BEK_W, drawBek } from '../scene/Cabin';
import type { BekPose } from '../lib/cabin';
import { BadgeShelf } from './Badges';
import { CabinShop } from './Shop';
import { Habits, Journal, MoodCheckIn, MoodWeek, Vocab } from './Extras';

const TABS = ['shop', 'badges', 'words', 'habits', 'mood', 'journal', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function More({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('more', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="scroll" size={28} /> The Lantern Corner
      </h1>
      <GroupedTabs<Tab>
        label="More sections"
        active={tab}
        onChange={setTab}
        groups={[
          {
            id: 'me',
            label: 'Me',
            icon: 'heart',
            tabs: [
              { id: 'mood', label: 'Mood' },
              { id: 'habits', label: 'Habits' },
              { id: 'journal', label: 'Journal' },
            ],
          },
          {
            id: 'words',
            label: 'Words',
            icon: 'book',
            tabs: [
              { id: 'words', label: 'Words' },
            ],
          },
          {
            id: 'cabin',
            label: 'Cabin',
            icon: 'coin',
            tabs: [
              { id: 'shop', label: 'Shop' },
              { id: 'badges', label: 'Badges' },
            ],
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: 'gear',
            tabs: [
              { id: 'settings', label: 'Settings' },
            ],
          },
        ]}
      />
      {tab === 'shop' && <CabinShop />}
      {tab === 'badges' && <BadgeShelf />}
      {tab === 'words' && <Vocab />}
      {tab === 'habits' && <Habits />}
      {tab === 'mood' && (
        <div className="grid grid--2">
          <Panel title="Today's mood" icon="heart">
            <MoodCheckIn />
          </Panel>
          <Panel title="This week" icon="calendar">
            <MoodWeek />
          </Panel>
        </div>
      )}
      {tab === 'journal' && <Journal />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

export function SettingsPanel() {
  const ask = useConfirm();
  const { data, update, replaceAll, toast, today } = useStore();
  const [importError, setImportError] = useState('');
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => update((d) => void (d.settings[key] = value));

  const photos = usePhotos();
  const doExport = async () => {
    const r = await shareBackup(data, photos, today);
    if (r !== 'cancelled') toast(r === 'shared' ? 'Backup sent' : 'Backup downloaded', 'pop');
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const restored = upgrade(parseBackup(text, today), today);
      if (!(await ask('Replace ALL current data with this backup? (A safety copy of your current data is kept first.)', { ok: 'Replace', danger: false }))) return;
      if (!(await replaceAll(restored, 'Before importing a backup'))) return;
      const restoredPhotos = backupPhotos(text);
      if (restoredPhotos.length) setPhotos(restoredPhotos);
      toast('Backup restored!', 'pop');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const resetAll = async () => {
    if (!(await ask('Delete EVERYTHING and start fresh? This cannot be undone.'))) return;
    if (!(await ask('Really sure? Maybe export a backup first.', { ok: 'Yes, delete all' }))) return;
    // Keeps the starter topics, formulas and school timetable (and a safety copy of everything before).
    if (await replaceAll(createInitialData(today), 'Before a full reset')) toast('Fresh start!', 'info');
  };

  return (
    <div className="grid grid--2">
      <Panel title="Look & sound" icon="sun">
        <p className="field__label">Theme</p>
        <Segmented
          label="Theme"
          value={data.settings.theme}
          onChange={(v) => set('theme', v)}
          options={[
            { value: 'auto', label: 'Auto (UK time)' },
            { value: 'day', label: 'Day' },
            { value: 'night', label: 'Night' },
          ]}
        />
        <p className="muted small">Auto switches to night mode from 19:00 to 07:00 UK time.</p>
        <p className="field__label">Background sound</p>
        <SoundMixer />
        <p className="field__label">Breaks</p>
        <BreakSetting />
      </Panel>

      <HardModeToggle />

      <AvatarEditor />

      <Panel title="Backups" icon="chest">
        <p>
          Your data lives <strong>only on this device</strong>, in this browser. Export a backup now and then (e.g. every Sunday) and keep the file
          somewhere safe (Google Drive, email it to yourself…).
        </p>
        <p className="muted small">
          <strong>Phone ↔ laptop:</strong> tap “Send / export backup”, choose AirDrop (or Telegram to yourself), then on the other device open Bek's Base and tap
          “Import backup”. Your family photos travel with it. {lastBackup() ? `Last backup: ${lastBackup()}.` : ''}
        </p>
        <div className="form__actions">
          <button type="button" className="btn btn--primary grow" onClick={doExport}>
            <PixelIcon name="arrowR" size={16} /> Send / export backup
          </button>
          <label className="btn grow file-btn">
            <PixelIcon name="arrowL" size={16} /> Import backup
            <input type="file" accept="application/json,.json" className="visually-hidden" onChange={(e) => doImport(e.target.files?.[0])} />
          </label>
        </div>
        {importError && (
          <p className="alert alert--over" role="alert">
            {importError}
          </p>
        )}
        <SafetyCopies />
      </Panel>

      <Panel title="Start over" icon="trash">
        <p className="muted">Deletes everything you've entered. Your school timetable, starter topics and formula cards come back.</p>
        <button type="button" className="btn btn--danger" onClick={resetAll}>
          Delete everything
        </button>
      </Panel>

      <Panel title="About" icon="scroll">
        <p>Bek's Base · private by default. No accounts, no bank connection, no tracking. Works offline once opened.</p>
        <InstallCard />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- your character
const SWATCHES: Record<'skin' | 'hair' | 'shirt' | 'pants', { value: string; name: string }[]> = {
  skin: [
    { value: '#f3d2b3', name: 'light' },
    { value: '#e0b48a', name: 'medium light' },
    { value: '#c68e5e', name: 'medium' },
    { value: '#8d5a3b', name: 'dark' },
  ],
  hair: [
    { value: '#1a1410', name: 'black' },
    { value: '#2b1d14', name: 'dark brown' },
    { value: '#5a3a1d', name: 'brown' },
    { value: '#8a5a2e', name: 'light brown' },
  ],
  shirt: [
    { value: '#3f8f5a', name: 'green' },
    { value: '#2a6fa8', name: 'blue' },
    { value: '#b8322a', name: 'red' },
    { value: '#e08a2a', name: 'orange' },
    { value: '#7a4fa3', name: 'purple' },
    { value: '#2f2f38', name: 'black' },
    { value: '#f3ead2', name: 'white' },
  ],
  pants: [
    { value: '#2f3e66', name: 'navy' },
    { value: '#1f1f24', name: 'black' },
    { value: '#5a3a1d', name: 'brown' },
    { value: '#4a5a3a', name: 'olive' },
  ],
};
const POSES: { value: BekPose; label: string }[] = [
  { value: 'stand', label: 'Hanging out' },
  { value: 'book', label: 'Studying' },
  { value: 'pray', label: 'Praying' },
  { value: 'think', label: 'Thinking' },
  { value: 'tea', label: 'Tea time' },
];

/** Make Bek (the little character in the cabin) look like you. */
function AvatarEditor() {
  const { data, update } = useStore();
  const look = data.settings.avatar;
  const [pose, setPose] = useState<BekPose>('stand');
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, BEK_W + 4, BEK_H + 2);
    drawBek(ctx, 2, 1, pose, look);
  }, [look, pose]);
  const set = (change: Partial<typeof look>) => update((d) => void (d.settings.avatar = { ...d.settings.avatar, ...change }));

  return (
    <Panel title="Your character" icon="house">
      <div className="avatar-editor">
        <canvas ref={ref} width={BEK_W + 4} height={BEK_H + 2} className="avatar-editor__preview" role="img" aria-label={`Bek, ${pose}`} />
        <div className="avatar-editor__options">
          {(Object.keys(SWATCHES) as (keyof typeof SWATCHES)[]).map((part) => (
            <div key={part} className="swatches" role="radiogroup" aria-label={part}>
              <span className="field__label">{part === 'pants' ? 'Trousers' : part[0].toUpperCase() + part.slice(1)}</span>
              {SWATCHES[part].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={look[part] === c.value}
                  aria-label={c.name}
                  className="swatch"
                  style={{ background: c.value }}
                  onClick={() => set({ [part]: c.value })}
                />
              ))}
            </div>
          ))}
          <label className="check">
            <input type="checkbox" checked={look.doppi} onChange={(e) => set({ doppi: e.target.checked })} />
            <span>Wear a doppi</span>
          </label>
        </div>
      </div>
      <Segmented label="Preview pose" value={pose} onChange={setPose} options={POSES} />
      <p className="muted small">Bek lives in the cabin next to Simba and changes what he's doing with your day. Tap him on Home!</p>
    </Panel>
  );
}

/** Automatic copies: safety copies (before imports, resets, conversions, app updates) and daily backups. */
function SafetyCopies() {
  const { restoreSnapshot } = useStore();
  const ask = useConfirm();
  const [list, setList] = useState<SnapshotInfo[] | null>(null);
  useEffect(() => {
    listAllSnapshots(idb).then(setList, () => setList([]));
  }, []);
  if (!list?.length) return null;
  const restore = async (s: SnapshotInfo) => {
    if (!(await ask(`Go back to the safety copy from ${new Date(s.createdAt).toLocaleString('en-GB')}? Your current data is kept as a safety copy first.`, { ok: 'Restore', danger: false }))) return;
    await restoreSnapshot(s.id);
  };
  return (
    <details className="details">
      <summary>Automatic backups ({list.length})</summary>
      <ul className="recovery__list">
        {list.map((s) => (
          <li key={s.id}>
            <span>
              <strong>{new Date(s.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
              <small className="muted"> · {s.reason}</small>
            </span>
            <button type="button" className="btn btn--small" onClick={() => restore(s)}>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
