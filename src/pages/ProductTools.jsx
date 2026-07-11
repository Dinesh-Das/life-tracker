import { useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveRestore, BellRing, Download, History, PauseCircle, RotateCcw, ShieldCheck, Sparkles, Upload, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useProductSettings } from '../hooks/useProductSettings';
import { createBackup, parseBackupFile, repairWorkbook, restoreBackup, validateWorkbook } from '../lib/backupRepair';
import { clearActivityLog, getActivityLog, recordActivity, removeActivity } from '../lib/activityLog';
import { pushConfiguration, subscribeToPush } from '../lib/pushNotifications';

const TEMPLATES = {
    'Morning reset': [
        { name: 'Wake without snooze', emoji: '⏰', category: 'Health' },
        { name: 'Morning hydration', emoji: '💧', category: 'Health' },
        { name: 'Plan the day', emoji: '📝', category: 'Mind' },
    ],
    'Deep work': [
        { name: 'Choose one priority', emoji: '🎯', category: 'Work' },
        { name: 'Focused work session', emoji: '💻', category: 'Work', focusLink: true },
        { name: 'Shutdown review', emoji: '✅', category: 'Work' },
    ],
    'Evening reset': [
        { name: 'Prepare tomorrow', emoji: '🗓️', category: 'Mind' },
        { name: 'Screen-free wind down', emoji: '🌙', category: 'Health' },
        { name: 'Daily reflection', emoji: '📖', category: 'Mind' },
    ],
};

const card = { padding: '20px', minWidth: 0 };
const action = 'system-action-button';

export default function ProductTools() {
    const { spreadsheetId } = useAuth();
    const { habits, status, saving, saveHabits } = useSettings(spreadsheetId);
    const { settings, save: saveSetting } = useProductSettings(spreadsheetId);
    const [report, setReport] = useState(null);
    const [busy, setBusy] = useState('');
    const [pause, setPause] = useState({ from: settings.pauseFrom || '', until: settings.pauseUntil || '' });
    const [activity, setActivity] = useState(getActivityLog);
    const [backupPreview, setBackupPreview] = useState(null);
    const fileRef = useRef(null);
    const push = useMemo(pushConfiguration, []);
    useEffect(() => setPause({ from: settings.pauseFrom || '', until: settings.pauseUntil || '' }), [settings.pauseFrom, settings.pauseUntil]);

    const run = async (name, operation, success) => {
        setBusy(name);
        try { const value = await operation(); if (success) toast.success(success); return value; }
        catch (error) { console.error(error); toast.error(error.message || 'Operation failed'); }
        finally { setBusy(''); }
    };
    const applyTemplate = async (name) => {
        if (status !== 'success') return;
        const snapshot = habits;
        const additions = TEMPLATES[name].filter(item => !habits.some(habit => habit.name.toLowerCase() === item.name.toLowerCase())).map((item, index) => ({
            ...item, id: crypto.randomUUID(), goal: 30, routine: name, frequency: 'Daily', order: habits.length + index + 1,
        }));
        if (!additions.length) return toast('This routine is already present.');
        if (await saveHabits([...habits, ...additions])) {
            recordActivity('template', `Added ${name} routine`, snapshot);
            setActivity(getActivityLog());
        }
    };
    const undo = async entry => {
        if (!entry.undoSnapshot || !Array.isArray(entry.undoSnapshot)) return;
        if (await saveHabits(entry.undoSnapshot)) { removeActivity(entry.id); setActivity(getActivityLog()); toast.success('Change undone'); }
    };
    return <div className="flex-1 flex flex-col">
        <Header title="Tools & Safety" subtitle="Backup, repair, routines, pauses and notifications" />
        <div className="page-content responsive-grid" style={{ gap: 16, padding: '0 clamp(16px, 5vw, 40px) 80px' }}>
            <section className="glass-card" style={card}>
                <h2 className="tool-title"><ShieldCheck size={19} /> Backup & repair</h2>
                <p className="tool-copy">Download a complete snapshot before major changes. Validation never edits data; Repair recreates missing structure and IDs without clearing history.</p>
                <div className="tool-actions">
                    <button className={action} disabled={!!busy} onClick={() => run('backup', () => createBackup(spreadsheetId), 'Backup downloaded')}><Download size={15} /> Backup</button>
                    <button className={action} disabled={!!busy} onClick={async () => setReport(await run('validate', () => validateWorkbook(spreadsheetId)))}><ShieldCheck size={15} /> Validate</button>
                    <button className={action} disabled={!!busy} onClick={async () => setReport((await run('repair', () => repairWorkbook(spreadsheetId), 'Repair complete'))?.validation)}><Wrench size={15} /> Repair</button>
                    <button className={action} disabled={!!busy} onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore</button>
                    <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async event => {
                        const file = event.target.files?.[0]; if (!file) return;
                        await run('preview', async () => setBackupPreview(await parseBackupFile(file)));
                        event.target.value = '';
                    }} />
                </div>
                {report && <div className="tool-report"><strong>{report.healthy ? 'Workbook healthy' : `${report.issues.length} issue(s) found`}</strong><span>{report.tabs} tabs · {report.habits} habits</span>{report.issues.map((issue, index) => <span key={index}>• {issue.type}: {issue.title || issue.count}</span>)}</div>}
                {backupPreview && <div className="tool-report"><strong>Restore preview</strong><span>{Object.keys(backupPreview.sheets).length} tabs · created {backupPreview.createdAt ? new Date(backupPreview.createdAt).toLocaleString() : 'legacy export'}</span><button className={action} disabled={!!busy} onClick={() => { if (confirm('Replace current sheet values with this backup? Create a fresh backup first.')) run('restore', () => restoreBackup(spreadsheetId, backupPreview), 'Backup restored').then(() => setBackupPreview(null)); }}><ArchiveRestore size={15} /> Confirm restore</button></div>}
            </section>

            <section className="glass-card" style={card}>
                <h2 className="tool-title"><PauseCircle size={19} /> Vacation / pause mode</h2>
                <p className="tool-copy">Scheduled days in this range are neutral and excluded from the Daily checklist.</p>
                <div className="tool-fields"><label>From<input type="date" value={pause.from} onChange={e => setPause({ ...pause, from: e.target.value })} /></label><label>Until<input type="date" value={pause.until} onChange={e => setPause({ ...pause, until: e.target.value })} /></label></div>
                <div className="tool-actions"><button className={action} onClick={() => run('pause', async () => { await saveSetting('pauseFrom', pause.from); await saveSetting('pauseUntil', pause.until); }, 'Pause dates saved')}><PauseCircle size={15} /> Save pause</button><button className={action} onClick={() => run('pause', async () => { setPause({ from: '', until: '' }); await saveSetting('pauseFrom', ''); await saveSetting('pauseUntil', ''); }, 'Pause cleared')}><RotateCcw size={15} /> Clear</button></div>
            </section>

            <section className="glass-card" style={card}>
                <h2 className="tool-title"><Sparkles size={19} /> Routine templates</h2>
                <p className="tool-copy">Templates create independent stable-ID habits grouped under a routine. Existing names are not duplicated.</p>
                <div className="tool-actions">{Object.keys(TEMPLATES).map(name => <button key={name} className={action} disabled={saving} onClick={() => applyTemplate(name)}>{name}</button>)}</div>
            </section>

            <section className="glass-card" style={card}>
                <h2 className="tool-title"><BellRing size={19} /> Background reminders</h2>
                <p className="tool-copy">The installed PWA now handles Web Push while closed. A VAPID subscription endpoint is required to send notifications.</p>
                <p className="tool-copy">Browser: {push.supported ? 'supported' : 'not supported'} · Service: {push.configured ? 'configured' : 'not configured'}</p>
                <button className={action} disabled={!push.supported || !push.configured || !!busy} onClick={() => run('push', subscribeToPush, 'Background reminders enabled')}><BellRing size={15} /> Enable push</button>
            </section>

            <section className="glass-card" style={{ ...card, gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><h2 className="tool-title"><History size={19} /> Activity & undo</h2><button className="glass-button" onClick={() => { clearActivityLog(); setActivity([]); }}>Clear history</button></div>
                {!activity.length ? <p className="tool-copy">No reversible habit-management actions on this device yet.</p> : activity.map(entry => <div className="activity-row" key={entry.id}><span><strong>{entry.label}</strong><small>{new Date(entry.at).toLocaleString()}</small></span>{entry.undoSnapshot && <button className={action} disabled={saving} onClick={() => undo(entry)}><RotateCcw size={14} /> Undo</button>}</div>)}
            </section>
        </div>
    </div>;
}
