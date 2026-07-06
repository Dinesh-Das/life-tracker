import { useState, useEffect, useRef, useCallback } from 'react';
import { readRange } from '../lib/sheetsApi';
import { resilientBatchWrite, resilientAppendRows } from '../lib/syncQueue';
import { ensureMetricsSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * Quick daily metrics (water glasses, weight) for a given date.
 * MetricsLogs columns: Date | Water (glasses) | Weight
 */
export function useMetrics(spreadsheetId, dateStr) {
    const [data, setData] = useState({ water: '', weight: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const batchTimer = useRef(null);
    const currentRowIndex = useRef(null);
    const latest = useRef({ water: '', weight: '' });
    const targetDateStr = dateStr || format(new Date(), 'yyyy-MM-dd');

    const load = useCallback(async (silent = false) => {
        if (!spreadsheetId) return;
        if (!silent) setLoading(true);
        try {
            await ensureMetricsSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'MetricsLogs!A2:C500');
            const rowIndex = rows.findIndex(r => r[0] === targetDateStr);
            if (rowIndex !== -1) {
                currentRowIndex.current = rowIndex + 2;
                if (!silent) {
                    const row = rows[rowIndex];
                    const next = { water: row[1] || '', weight: row[2] || '' };
                    latest.current = next;
                    setData(next);
                }
            } else {
                currentRowIndex.current = null;
                if (!silent) {
                    const next = { water: '', weight: '' };
                    latest.current = next;
                    setData(next);
                }
            }
        } catch (e) {
            console.error('Failed to load metrics', e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [spreadsheetId, targetDateStr]);

    useEffect(() => { load(); }, [load]);

    const saveMetric = useCallback((field, value) => {
        const next = { ...latest.current, [field]: value };
        latest.current = next;
        setData(next);
        setSaving(true);

        if (batchTimer.current) clearTimeout(batchTimer.current);
        batchTimer.current = setTimeout(async () => {
            try {
                const d = latest.current;
                const row = [targetDateStr, d.water, d.weight];
                if (currentRowIndex.current) {
                    await resilientBatchWrite(spreadsheetId, [{
                        range: `MetricsLogs!A${currentRowIndex.current}:C${currentRowIndex.current}`,
                        values: [row]
                    }]);
                } else {
                    await resilientAppendRows(spreadsheetId, 'MetricsLogs!A:C', [row]);
                    await load(true);
                }
            } catch (e) {
                console.error('Failed to save metric', e);
                toast.error('Failed to save metric');
            } finally {
                setSaving(false);
            }
        }, 800);
    }, [spreadsheetId, targetDateStr, load]);

    return { data, loading, saving, saveMetric };
}