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

    const loadJournal = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            await ensureJournalSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'JournalLogs!A2:D500');

            const rowIndex = rows.findIndex(row => row[0] === dateStr);

            if (rowIndex !== -1) {
                const row = rows[rowIndex];
                currentRowIndex.current = rowIndex + 2;
                setJournal({
                    gratitude: row[1] || '',
                    review: row[2] || '',
                    focus: row[3] || ''
                });
            } else {
                currentRowIndex.current = null;
                setJournal({ gratitude: '', review: '', focus: '' });
            }
        } catch (error) {
            console.error('Failed to load journal', error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId, dateStr]);

    useEffect(() => {
        loadJournal();
    }, [loadJournal]);

    const saveJournal = async (field, text) => {
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
                    await loadJournal();
                }
            } catch (error) {
                toast.error('Failed to save reflection');
            } finally {
                setSaving(false);
            }
        }, 1000);
    };

    return { journal, loading, saving, saveJournal, selectedDate, setSelectedDate };
}
