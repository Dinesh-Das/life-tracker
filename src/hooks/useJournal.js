import { useState, useEffect, useRef, useCallback } from 'react';
import { readRange, batchWrite, appendRows } from '../lib/sheetsApi';
import { ensureJournalSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function useJournal(spreadsheetId) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [journal, setJournal] = useState({
        gratitude: '',
        review: '',
        focus: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const batchTimer = useRef(null);
    const currentRowIndex = useRef(null);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // silent=true → refresh row index without triggering the loading skeleton
    const loadJournal = useCallback(async (silent = false) => {
        if (!spreadsheetId) return;
        if (!silent) setLoading(true);
        try {
            await ensureJournalSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'JournalLogs!A2:D500');

            const rowIndex = rows.findIndex(row => row[0] === dateStr);

            if (rowIndex !== -1) {
                const row = rows[rowIndex];
                currentRowIndex.current = rowIndex + 2;
                // Only overwrite displayed text on initial (non-silent) loads
                if (!silent) {
                    setJournal({
                        gratitude: row[1] || '',
                        review: row[2] || '',
                        focus: row[3] || ''
                    });
                }
            } else {
                currentRowIndex.current = null;
                if (!silent) {
                    setJournal({ gratitude: '', review: '', focus: '' });
                }
            }
        } catch (error) {
            console.error('Failed to load journal', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [spreadsheetId, dateStr]);

    useEffect(() => {
        loadJournal();
    }, [loadJournal]);

    const saveJournal = useCallback((field, text) => {
        setJournal(prev => ({ ...prev, [field]: text }));
        setSaving(true);

        if (batchTimer.current) clearTimeout(batchTimer.current);

        batchTimer.current = setTimeout(async () => {
            try {
                const fields = ['gratitude', 'review', 'focus'];
                const colIndex = fields.indexOf(field);
                if (colIndex === -1) return;

                const colLetter = String.fromCharCode(66 + colIndex); // B, C, D

                if (currentRowIndex.current) {
                    await batchWrite(spreadsheetId, [{
                        range: `JournalLogs!${colLetter}${currentRowIndex.current}`,
                        values: [[text]]
                    }]);
                } else {
                    const newRow = [dateStr, '', '', ''];
                    newRow[colIndex + 1] = text;
                    await appendRows(spreadsheetId, 'JournalLogs!A:D', [newRow]);
                    // Silent reload — get the new row index without showing the loading skeleton
                    await loadJournal(true);
                }
            } catch (error) {
                toast.error('Failed to save reflection');
            } finally {
                setSaving(false);
            }
        }, 1000);
    }, [spreadsheetId, dateStr, loadJournal]);

    return { journal, loading, saving, saveJournal, selectedDate, setSelectedDate };
}
