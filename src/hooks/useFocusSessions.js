import { useState, useEffect, useCallback } from 'react';
import { readRange, appendRows } from '../lib/sheetsApi';
import { ensureFocusSheet } from '../lib/sheetScaffold';
import { format, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * Focus session persistence — completed Pomodoro work sessions are
 * appended to the FocusLogs sheet ([Date, Start Time, Minutes, Mode])
 * so focus hours survive navigation, refreshes and devices.
 */
export function useFocusSessions(spreadsheetId) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            const rows = await readRange(spreadsheetId, 'FocusLogs!A2:D1000');
            setSessions((rows || [])
                .filter(r => r && r[0])
                .map(r => ({
                    date: String(r[0]),
                    start: r[1] ? String(r[1]) : '',
                    minutes: parseInt(r[2]) || 0,
                    mode: r[3] ? String(r[3]) : 'WORK',
                })));
        } catch {
            // Tab may not exist yet for older spreadsheets — treat as empty
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => { load(); }, [load]);

    const logSession = useCallback(async (minutes, mode = 'WORK') => {
        if (!spreadsheetId || !minutes) return;
        const now = new Date();
        const entry = {
            date: format(now, 'yyyy-MM-dd'),
            start: format(now, 'HH:mm'),
            minutes,
            mode,
        };
        // Optimistic update — stats reflect the session immediately
        setSessions(prev => [...prev, entry]);
        try {
            await ensureFocusSheet(spreadsheetId);
            await appendRows(spreadsheetId, 'FocusLogs!A:D', [
                [entry.date, entry.start, entry.minutes, entry.mode]
            ]);
            toast.success(`${minutes} min focus session logged 🌿`);
        } catch (e) {
            console.error('Failed to log focus session', e);
            toast.error('Focus session could not be synced');
        }
    }, [spreadsheetId]);

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const workSessions = sessions.filter(s => s.mode === 'WORK');
    const todayMinutes = workSessions.filter(s => s.date === todayKey).reduce((sum, s) => sum + s.minutes, 0);
    const weekMinutes = workSessions.filter(s => s.date >= weekStart).reduce((sum, s) => sum + s.minutes, 0);

    return {
        loading,
        todayMinutes,
        weekMinutes,
        totalSessions: workSessions.length,
        logSession,
        reload: load,
    };
}