import { useState, useEffect, useRef, useCallback } from 'react';
import { readRange } from '../lib/sheetsApi';
import { resilientBatchWrite, resilientAppendRows } from '../lib/syncQueue';
import { ensureSleepSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/** Derive slept hours from 'HH:mm' strings; handles overnight spans. */
export function computeSleepHours(bedtime, wakeTime) {
    if (!bedtime || !wakeTime) return null;
    const [bh, bm] = String(bedtime).split(':').map(Number);
    const [wh, wm] = String(wakeTime).split(':').map(Number);
    if ([bh, bm, wh, wm].some(Number.isNaN)) return null;
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins <= 0) mins += 24 * 60; // crossed midnight
    return Math.round((mins / 60) * 10) / 10;
}

/**
 * Sleep log for a given date. Mirrors useWins: debounced, offline-resilient.
 * SleepLogs columns: Date | Bedtime | Wake Time | Hours | Quality (1-5)
 */
export function useSleep(spreadsheetId, dateStr) {
    const [data, setData] = useState({ bedtime: '', wakeTime: '', quality: '', nap: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const batchTimer = useRef(null);
    const currentRowIndex = useRef(null);
    const latest = useRef({ bedtime: '', wakeTime: '', quality: '', nap: '' });
    const targetDateStr = dateStr || format(new Date(), 'yyyy-MM-dd');

    const load = useCallback(async (silent = false) => {
        if (!spreadsheetId) return;
        if (!silent) setLoading(true);
        try {
            await ensureSleepSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'SleepLogs!A2:F500');
            const rowIndex = rows.findIndex(r => r[0] === targetDateStr);
            if (rowIndex !== -1) {
                currentRowIndex.current = rowIndex + 2;
                if (!silent) {
                    const row = rows[rowIndex];
                    const next = { bedtime: row[1] || '', wakeTime: row[2] || '', quality: row[4] || '', nap: row[5] || '' };
                    latest.current = next;
                    setData(next);
                }
            } else {
                currentRowIndex.current = null;
                if (!silent) {
                    const next = { bedtime: '', wakeTime: '', quality: '', nap: '' };
                    latest.current = next;
                    setData(next);
                }
            }
        } catch (e) {
            console.error('Failed to load sleep log', e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [spreadsheetId, targetDateStr]);

    useEffect(() => { load(); }, [load]);

    const saveSleep = useCallback((field, value) => {
        const next = { ...latest.current, [field]: value };
        latest.current = next;
        setData(next);
        setSaving(true);

        if (batchTimer.current) clearTimeout(batchTimer.current);
        batchTimer.current = setTimeout(async () => {
            try {
                const d = latest.current;
                const hours = computeSleepHours(d.bedtime, d.wakeTime);
                const row = [targetDateStr, d.bedtime, d.wakeTime, hours ?? '', d.quality, d.nap];
                if (currentRowIndex.current) {
                    await resilientBatchWrite(spreadsheetId, [{
                        range: `SleepLogs!A${currentRowIndex.current}:F${currentRowIndex.current}`,
                        values: [row]
                    }]);
                } else {
                    await resilientAppendRows(spreadsheetId, 'SleepLogs!A:F', [row]);
                    await load(true);
                }
            } catch (e) {
                console.error('Failed to save sleep', e);
                toast.error('Failed to save sleep');
            } finally {
                setSaving(false);
            }
        }, 800);
    }, [spreadsheetId, targetDateStr, load]);

    const nightHours = computeSleepHours(data.bedtime, data.wakeTime);
    const napMinutes = parseInt(data.nap) || 0;
    const totalHours = (nightHours != null || napMinutes > 0)
        ? Math.round(((nightHours || 0) + napMinutes / 60) * 10) / 10
        : null;

    return {
        data,
        hours: nightHours,
        napMinutes,
        totalHours,
        loading,
        saving,
        saveSleep
    };
}