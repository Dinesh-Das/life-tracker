import { useState, useEffect, useRef, useCallback } from 'react';
import { readRange, batchWrite, appendRows } from '../lib/sheetsApi';
import { ensureDailyWinsSheet } from '../lib/sheetScaffold';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function useWins(spreadsheetId) {
    const [wins, setWins] = useState({
        Physical: '',
        Mental: '',
        Social: '',
        Financial: '',
        Spiritual: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const batchTimer = useRef(null);
    const currentRowIndex = useRef(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // silent=true → refresh row index in background without triggering the loading state
    const loadDailyWins = useCallback(async (silent = false) => {
        if (!spreadsheetId) return;
        if (!silent) setLoading(true);
        try {
            await ensureDailyWinsSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'DailyWins!A2:F500');

            const rowIndex = rows.findIndex(row => row[0] === todayStr);

            if (rowIndex !== -1) {
                const row = rows[rowIndex];
                currentRowIndex.current = rowIndex + 2; // +2 for header and 0-indexing
                // Only update wins state on non-silent loads to avoid overwriting typed text
                if (!silent) {
                    setWins({
                        Physical: row[1] || '',
                        Mental: row[2] || '',
                        Social: row[3] || '',
                        Financial: row[4] || '',
                        Spiritual: row[5] || ''
                    });
                }
            } else {
                currentRowIndex.current = null;
                if (!silent) {
                    setWins({
                        Physical: '',
                        Mental: '',
                        Social: '',
                        Financial: '',
                        Spiritual: ''
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load daily wins', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [spreadsheetId, todayStr]);

    useEffect(() => {
        loadDailyWins();
    }, [loadDailyWins]);

    const saveWin = useCallback((category, text) => {
        setWins(prev => ({ ...prev, [category]: text }));
        setSaving(true);

        if (batchTimer.current) clearTimeout(batchTimer.current);

        batchTimer.current = setTimeout(async () => {
            try {
                const categories = ['Physical', 'Mental', 'Social', 'Financial', 'Spiritual'];
                const colIndex = categories.indexOf(category);
                if (colIndex === -1) return;

                const colLetter = String.fromCharCode(66 + colIndex); // B, C, D, E, F

                if (currentRowIndex.current) {
                    // Update existing row
                    await batchWrite(spreadsheetId, [{
                        range: `DailyWins!${colLetter}${currentRowIndex.current}`,
                        values: [[text]]
                    }]);
                } else {
                    // Create new row for today
                    const newRow = [todayStr, '', '', '', '', ''];
                    newRow[colIndex + 1] = text;
                    await appendRows(spreadsheetId, 'DailyWins!A:F', [newRow]);
                    // Silent reload — only refresh the row index, don't show loading state
                    // so the user's textarea doesn't unmount/remount
                    await loadDailyWins(true);
                }
            } catch (error) {
                console.error('Failed to save win', error);
                toast.error('Failed to save win');
            } finally {
                setSaving(false);
            }
        }, 1000); // 1s debounce
    }, [spreadsheetId, todayStr, loadDailyWins]);

    return { wins, loading, saving, saveWin };
}
