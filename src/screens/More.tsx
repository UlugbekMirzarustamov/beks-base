/**
 * ⚙️ MORE — reflect, words, habits, mood, journal, plus settings,
 * backups (Export / Import) and example-data cleanup.
 */
import { useState } from 'react';
import { backupFileName, exportJson, parseBackup } from '../lib/backup';
import { clearExampleData, emptyData, hasExampleData } from '../lib/seed';
import type { Settings } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel, Segmented, Tabs, useConfirm, useSubRoute } from '../ui/kit';
import { Habits, Journal, MoodCheckIn, MoodWeek, Reflect, Vocab } from './Extras';

const TABS = ['reflect', 'words', 'habits', 'mood', 'journal', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function More({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('more', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="scroll" size={28} /> The Lantern Corner
      </h1>
      <Tabs<Tab>
        label="More sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'reflect', label: 'Reflect', icon: 'star' },
          { id: 'words', label: 'Words', icon: 'book' },
          { id: 'habits', label: 'Habits', icon: 'check' },
          { id: 'mood', label: 'Mood', icon: 'heart' },
          { id: 'journal', label: 'Journal', icon: 'scroll' },
          { id: 'settings', label: 'Settings', icon: 'gear' },
        ]}
      />
      {tab === 'reflect' && <Reflect />}
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

  const doExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(today);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded', 'pop');
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError('');
    try {
      const restored = parseBackup(await file.text(), today);
      if (!(await ask('Replace ALL current data with this backup? (Tip: export first if unsure.)', { ok: 'Replace', danger: false }))) return;
      replaceAll(restored);
      toast('Backup restored!', 'pop');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const clearExamples = async () => {
    if (!(await ask('Remove all example items? Your own items stay.', { ok: 'Clear examples', danger: false }))) return;
    replaceAll(clearExampleData(data, today));
    toast('Example data cleared', 'info');
  };

  const resetAll = async () => {
    if (!(await ask('Delete EVERYTHING and start fresh? This cannot be undone.'))) return;
    if (!(await ask('Really sure? Maybe export a backup first.', { ok: 'Yes, delete all' }))) return;
    replaceAll(emptyData(today));
    toast('Fresh start!', 'info');
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
        <Segmented
          label="Background sound"
          value={data.settings.sound}
          onChange={(v) => set('sound', v)}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'rain', label: 'Rain' },
            { value: 'fire', label: 'Fire' },
          ]}
        />
      </Panel>

      <Panel title="Backups" icon="chest">
        <p>
          Your data lives <strong>only on this device</strong>, in this browser. Export a backup now and then (e.g. every Sunday) and keep the file
          somewhere safe (Google Drive, email it to yourself…).
        </p>
        <div className="form__actions">
          <button type="button" className="btn btn--primary grow" onClick={doExport}>
            <PixelIcon name="arrowR" size={16} /> Export backup
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
      </Panel>

      <Panel title="Clean up" icon="trash">
        {hasExampleData(data) ? (
          <>
            <p>The app started with some example items (marked "example") so it didn't look empty.</p>
            <button type="button" className="btn btn--primary" onClick={clearExamples}>
              Clear example data
            </button>
          </>
        ) : (
          <p className="muted">No example data left. Everything here is yours.</p>
        )}
        <hr className="divider" />
        <button type="button" className="btn btn--danger" onClick={resetAll}>
          Delete everything
        </button>
      </Panel>

      <Panel title="About" icon="scroll">
        <p>Bek's Base · private by default. No accounts, no bank connection, no tracking. Works offline once opened.</p>
        <p className="muted small">
          Install it: on iPhone open in Safari → Share → "Add to Home Screen". On Android Chrome → menu ⋮ → "Install app".
        </p>
      </Panel>
    </div>
  );
}
