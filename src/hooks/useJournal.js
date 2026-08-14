import { useState, useEffect, useRef, useCallback } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { findLatestDateRowIndex } from '../lib/dateRows';
import { resilientUpsertDateRow } from '../lib/syncQueue';
import { ensureJournalSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { createSerializedWriter } from '../lib/serializedWriter';

const EMPTY = { gratitude: '', review: '', focus: '' };
const FIELDS = Object.keys(EMPTY);
const MAX_JOURNAL_LENGTH = 5000;

export function useJournal(spreadsheetId, dateStr) {
    const [journal, setJournal] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const timer = useRef(null);
    const pending = useRef(null);
    const currentRow = useRef(null);
    const latest = useRef(EMPTY);
    const generation = useRef(0);
    const writer = useRef(createSerializedWriter());
    const targetDateStr = dateStr || format(new Date(), 'yyyy-MM-dd');

    const persistSnapshot = useCallback(async (snapshot) => {
        const row = [snapshot.date, ...FIELDS.map(field => snapshot.values[field] || '')];
        const result = await resilientUpsertDateRow(spreadsheetId, 'JournalLogs!A:D', row, snapshot.rowIndex);
        const match = result?.result?.updates?.updatedRange?.match(/!A(\d+)/);
        if (match && currentRow.current?.date === snapshot.date) currentRow.current.index = Number(match[1]);
    }, [spreadsheetId]);

    const flushPending = useCallback(async () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        const snapshot = pending.current;
        pending.current = null;
        if (!snapshot) return;
        setSaving(true);
        try {
            await writer.current.run(() => persistSnapshot(snapshot));
        } catch (error) {
            console.error('Failed to save reflection', error);
            toast.error('Failed to save reflection');
        } finally {
            if (!writer.current.hasPending() && !pending.current) setSaving(false);
        }
    }, [persistSnapshot]);

    const loadJournal = useCallback(async () => {
        if (!spreadsheetId) return;
        const request = ++generation.current;
        setLoading(true);
        setError(null);
        const empty = { ...EMPTY };
        latest.current = empty;
        currentRow.current = { date: targetDateStr, index: null };
        setJournal(empty);
        try {
            if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                await ensureJournalSheet(spreadsheetId);
            }
            const rows = await readDataRows(spreadsheetId, 'JournalLogs!A:D');
            if (request !== generation.current) return;
            const index = findLatestDateRowIndex(rows, targetDateStr);
            const next = index === -1 ? { ...EMPTY } : {
                gratitude: rows[index][1] || '',
                review: rows[index][2] || '',
                focus: rows[index][3] || '',
            };
            currentRow.current = { date: targetDateStr, index: index === -1 ? null : index + 2 };
            latest.current = next;
            setJournal(next);
        } catch (error) {
            if (request === generation.current) {
                console.error('Failed to load journal', error);
                setError(error);
            }
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [spreadsheetId, targetDateStr]);

    useEffect(() => {
        loadJournal();
        return () => {
            generation.current += 1;
            void flushPending();
        };
    }, [loadJournal, flushPending]);

    const saveJournal = useCallback((field, text) => {
        if (!FIELDS.includes(field)) return;
        const value = String(text ?? '').slice(0, MAX_JOURNAL_LENGTH);
        const next = { ...latest.current, [field]: value };
        latest.current = next;
        setJournal(next);
        setSaving(true);
        pending.current = {
            date: targetDateStr,
            rowIndex: currentRow.current?.date === targetDateStr ? currentRow.current.index : null,
            values: { ...next },
        };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void flushPending(); }, 800);
    }, [targetDateStr, flushPending]);

    return { journal, loading, saving, error, saveJournal, flushPending, reload: loadJournal };
}
