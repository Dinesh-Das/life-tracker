import { useState, useEffect, useRef, useCallback } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { findLatestDateRowIndex } from '../lib/dateRows';
import { resilientBatchWrite, resilientUpsertDateRow } from '../lib/syncQueue';
import { ensureSleepSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPTY = { bedtime: '', wakeTime: '', quality: '', nap: '' };

export function computeSleepHours(bedtime, wakeTime) {
    if (!bedtime || !wakeTime) return null;
    const [bh, bm] = String(bedtime).split(':').map(Number);
    const [wh, wm] = String(wakeTime).split(':').map(Number);
    if ([bh, bm, wh, wm].some(Number.isNaN)) return null;
    let minutes = (wh * 60 + wm) - (bh * 60 + bm);
    if (minutes <= 0) minutes += 24 * 60;
    return Math.round((minutes / 60) * 10) / 10;
}

export function useSleep(spreadsheetId, dateStr) {
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const timer = useRef(null);
    const pending = useRef(null);
    const currentRow = useRef(null);
    const latest = useRef(EMPTY);
    const generation = useRef(0);
    const targetDateStr = dateStr || format(new Date(), 'yyyy-MM-dd');

    const persistSnapshot = useCallback(async (snapshot) => {
        const value = snapshot.values;
        const hours = computeSleepHours(value.bedtime, value.wakeTime);
        const row = [snapshot.date, value.bedtime, value.wakeTime, hours ?? '', value.quality, value.nap];
        if (snapshot.rowIndex) {
            await resilientBatchWrite(spreadsheetId, [{
                range: `SleepLogs!A${snapshot.rowIndex}:F${snapshot.rowIndex}`,
                values: [row],
            }]);
        } else {
            const result = await resilientUpsertDateRow(spreadsheetId, 'SleepLogs!A:F', row);
            const match = result?.result?.updates?.updatedRange?.match(/!A(\d+)/);
            if (match && currentRow.current?.date === snapshot.date) currentRow.current.index = Number(match[1]);
        }
    }, [spreadsheetId]);

    const flushPending = useCallback(async () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        const snapshot = pending.current;
        pending.current = null;
        if (!snapshot) return;
        setSaving(true);
        try {
            await persistSnapshot(snapshot);
        } catch (error) {
            console.error('Failed to save sleep', error);
            toast.error('Failed to save sleep');
        } finally {
            setSaving(false);
        }
    }, [persistSnapshot]);

    const load = useCallback(async () => {
        if (!spreadsheetId) return;
        const request = ++generation.current;
        setLoading(true);
        setError(null);
        const empty = { ...EMPTY };
        latest.current = empty;
        currentRow.current = { date: targetDateStr, index: null };
        setData(empty);
        try {
            await ensureSleepSheet(spreadsheetId);
            const rows = await readDataRows(spreadsheetId, 'SleepLogs!A:F');
            if (request !== generation.current) return;
            const index = findLatestDateRowIndex(rows, targetDateStr);
            const next = index === -1 ? { ...EMPTY } : {
                bedtime: rows[index][1] || '',
                wakeTime: rows[index][2] || '',
                quality: rows[index][4] || '',
                nap: rows[index][5] || '',
            };
            currentRow.current = { date: targetDateStr, index: index === -1 ? null : index + 2 };
            latest.current = next;
            setData(next);
        } catch (error) {
            if (request === generation.current) {
                console.error('Failed to load sleep log', error);
                setError(error);
            }
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [spreadsheetId, targetDateStr]);

    useEffect(() => {
        load();
        return () => {
            generation.current += 1;
            void flushPending();
        };
    }, [load, flushPending]);

    const saveSleep = useCallback((field, value) => {
        if (!(field in EMPTY)) return;
        const next = { ...latest.current, [field]: value };
        latest.current = next;
        setData(next);
        setSaving(true);
        pending.current = {
            date: targetDateStr,
            rowIndex: currentRow.current?.date === targetDateStr ? currentRow.current.index : null,
            values: { ...next },
        };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void flushPending(); }, 600);
    }, [flushPending, targetDateStr]);

    const nightHours = computeSleepHours(data.bedtime, data.wakeTime);
    const napMinutes = Number.parseInt(data.nap, 10) || 0;
    const totalHours = (nightHours != null || napMinutes > 0)
        ? Math.round(((nightHours || 0) + napMinutes / 60) * 10) / 10
        : null;

    return { data, hours: nightHours, napMinutes, totalHours, loading, saving, error, saveSleep, flushPending, reload: load };
}
