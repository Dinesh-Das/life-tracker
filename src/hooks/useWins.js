import { useState, useEffect, useRef, useCallback } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { findLatestDateRowIndex } from '../lib/dateRows';
import { resilientBatchWrite, resilientUpsertDateRow } from '../lib/syncQueue';
import { ensureDailyWinsSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPTY = { Physical: '', Mental: '', Social: '', Financial: '', Spiritual: '' };
const CATEGORIES = Object.keys(EMPTY);
const MAX_WIN_LENGTH = 2000;

export function useWins(spreadsheetId, dateStr) {
    const [wins, setWins] = useState(EMPTY);
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
        if (!snapshot || !spreadsheetId) return;
        const row = [snapshot.date, ...CATEGORIES.map(category => snapshot.values[category] || '')];
        if (snapshot.rowIndex) {
            await resilientBatchWrite(spreadsheetId, [{
                range: `DailyWins!A${snapshot.rowIndex}:F${snapshot.rowIndex}`,
                values: [row],
            }]);
        } else {
            const result = await resilientUpsertDateRow(spreadsheetId, 'DailyWins!A:F', row);
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
            console.error('Failed to save wins', error);
            toast.error('Failed to save daily wins');
        } finally {
            setSaving(false);
        }
    }, [persistSnapshot]);

    const loadDailyWins = useCallback(async () => {
        if (!spreadsheetId) return;
        const request = ++generation.current;
        setLoading(true);
        setError(null);
        const empty = { ...EMPTY };
        latest.current = empty;
        currentRow.current = { date: targetDateStr, index: null };
        setWins(empty);
        try {
            await ensureDailyWinsSheet(spreadsheetId);
            const rows = await readDataRows(spreadsheetId, 'DailyWins!A:F');
            if (request !== generation.current) return;
            const index = findLatestDateRowIndex(rows, targetDateStr);
            const next = index === -1 ? { ...EMPTY } : {
                Physical: rows[index][1] || '',
                Mental: rows[index][2] || '',
                Social: rows[index][3] || '',
                Financial: rows[index][4] || '',
                Spiritual: rows[index][5] || '',
            };
            currentRow.current = { date: targetDateStr, index: index === -1 ? null : index + 2 };
            latest.current = next;
            setWins(next);
        } catch (error) {
            if (request === generation.current) {
                console.error('Failed to load daily wins', error);
                setError(error);
            }
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [spreadsheetId, targetDateStr]);

    useEffect(() => {
        loadDailyWins();
        return () => {
            generation.current += 1;
            void flushPending();
        };
    }, [loadDailyWins, flushPending]);

    const saveWin = useCallback((category, text) => {
        if (!CATEGORIES.includes(category)) return;
        const value = String(text ?? '').slice(0, MAX_WIN_LENGTH);
        const next = { ...latest.current, [category]: value };
        latest.current = next;
        setWins(next);
        setSaving(true);
        const rowIndex = currentRow.current?.date === targetDateStr ? currentRow.current.index : null;
        pending.current = { date: targetDateStr, rowIndex, values: { ...next } };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void flushPending(); }, 800);
    }, [flushPending, targetDateStr]);

    return { wins, loading, saving, error, saveWin, flushPending, reload: loadDailyWins };
}
