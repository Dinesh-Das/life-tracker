import { useState, useEffect, useCallback } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { resilientAppendUniqueRow } from '../lib/syncQueue';
import { ensureFocusSheet } from '../lib/sheetScaffold';
import { autoCheckLinkedHabits } from '../lib/focusHabitLink';
import { format, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * Focus session persistence — completed Pomodoro work sessions are
 * appended to the FocusLogs sheet ([Date, Start Time, Minutes, Mode, Session ID])
 * so focus hours survive navigation, refreshes and devices.
 */
export function useFocusSessions(spreadsheetId) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        setError(null);
        try {
            if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                await ensureFocusSheet(spreadsheetId);
            }
            const rows = await readDataRows(spreadsheetId, 'FocusLogs!A:E');
            setSessions((rows || [])
                .filter(r => r && r[0])
                .map(r => ({
                    date: String(r[0]),
                    start: r[1] ? String(r[1]) : '',
                    minutes: parseInt(r[2]) || 0,
                    mode: r[3] ? String(r[3]) : 'WORK',
                    id: r[4] ? String(r[4]) : '',
                })));
        } catch (loadError) {
            // Tab may not exist yet for older spreadsheets — treat as empty
            setSessions([]);
            setError(loadError);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => { load(); }, [load]);

    const logSession = useCallback(async (minutes, mode = 'WORK', session = {}) => {
        if (!spreadsheetId || !minutes) return;
        const now = session.startedAt ? new Date(session.startedAt) : new Date();
        const entry = {
            date: format(now, 'yyyy-MM-dd'),
            start: format(now, 'HH:mm'),
            minutes,
            mode,
            id: session.id || crypto.randomUUID(),
        };
        // Optimistic update — the stable ID also prevents a restored session
        // from appearing twice if completion reconciliation runs again.
        setSessions(prev => prev.some(item => item.id === entry.id) ? prev : [...prev, entry]);
        try {
            // Avoid a live metadata request while offline so the durable queue
            // can accept the completion. Online legacy workbooks are upgraded.
            if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                await ensureFocusSheet(spreadsheetId);
            }
            const result = await resilientAppendUniqueRow(spreadsheetId, 'FocusLogs!A:E',
                [entry.date, entry.start, entry.minutes, entry.mode, entry.id]);
            toast.success(result?.queued
                ? `${minutes} min focus session saved offline 🌿`
                : `${minutes} min focus session logged 🌿`);
            if (mode === 'WORK') {
                // Focus-to-habit linking — best effort, never blocks the log
                try {
                    const checked = await autoCheckLinkedHabits(spreadsheetId);
                    checked.forEach(h => toast.success(`${h.emoji} ${h.name} checked off 🔗`, { duration: 4000 }));
                } catch (err) {
                    console.error('Focus habit link failed', err);
                }
            }
            return result;
        } catch (e) {
            console.error('Failed to log focus session', e);
            setSessions(prev => prev.filter(item => item.id !== entry.id));
            toast.error('Focus session could not be synced');
            throw e;
        }
    }, [spreadsheetId]);

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const workSessions = sessions.filter(s => s.mode === 'WORK');
    const todayMinutes = workSessions.filter(s => s.date === todayKey).reduce((sum, s) => sum + s.minutes, 0);
    const weekMinutes = workSessions.filter(s => s.date >= weekStart).reduce((sum, s) => sum + s.minutes, 0);

    return {
        loading,
        error,
        todayMinutes,
        weekMinutes,
        totalSessions: workSessions.length,
        logSession,
        reload: load,
    };
}
