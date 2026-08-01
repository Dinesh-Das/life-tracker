import { useState, useEffect, useRef, useCallback } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { findLatestDateRowIndex } from '../lib/dateRows';
import { resilientBatchWrite, resilientUpsertDateRow } from '../lib/syncQueue';
import { ensureMetricsSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPTY = { water: '', weight: '' };

export function useMetrics(spreadsheetId, dateStr) {
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
        const row = [snapshot.date, snapshot.values.water, snapshot.values.weight];
        if (snapshot.rowIndex) {
            await resilientBatchWrite(spreadsheetId, [{
                range: `MetricsLogs!A${snapshot.rowIndex}:C${snapshot.rowIndex}`,
                values: [row],
            }]);
        } else {
            const result = await resilientUpsertDateRow(spreadsheetId, 'MetricsLogs!A:C', row);
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
            console.error('Failed to save metric', error);
            toast.error('Failed to save metric');
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
            await ensureMetricsSheet(spreadsheetId);
            const rows = await readDataRows(spreadsheetId, 'MetricsLogs!A:C');
            if (request !== generation.current) return;
            const index = findLatestDateRowIndex(rows, targetDateStr);
            const next = index === -1 ? { ...EMPTY } : {
                water: rows[index][1] || '', weight: rows[index][2] || '',
            };
            currentRow.current = { date: targetDateStr, index: index === -1 ? null : index + 2 };
            latest.current = next;
            setData(next);
        } catch (error) {
            if (request === generation.current) {
                console.error('Failed to load metrics', error);
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

    const saveMetric = useCallback((field, value) => {
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

    return { data, loading, saving, error, saveMetric, flushPending, reload: load };
}
