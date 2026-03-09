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

    const pendingWins = useRef({});
    const batchTimer = useRef(null);
    const currentRowIndex = useRef(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const loadDailyWins = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            await ensureDailyWinsSheet(spreadsheetId);
            const rows = await readRange(spreadsheetId, 'DailyWins!A2:F500'); // Load recent wins

            // Find today's row
            const rowIndex = rows.findIndex(row => row[0] === todayStr);

            if (rowIndex !== -1) {
                const row = rows[rowIndex];
                currentRowIndex.current = rowIndex + 2; // +2 for header and 0-indexing
                setWins({
                    Physical: row[1] || '',
                    Mental: row[2] || '',
                    Social: row[3] || '',
                    Financial: row[4] || '',
                    Spiritual: row[5] || ''
                });
            } else {
                currentRowIndex.current = null;
                setWins({
                    Physical: '',
                    Mental: '',
                    Social: '',
                    Financial: '',
                    Spiritual: ''
                });
            }
        } catch (error) {
            console.error('Failed to load daily wins', error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId, todayStr]);

    useEffect(() => {
        loadDailyWins();
    }, [loadDailyWins]);

    const saveWin = async (category, text) => {
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

                    // We use append here to avoid finding the next empty row manually
                    const res = await appendRows(spreadsheetId, 'DailyWins!A:F', [newRow]);

                    // Try to extract row index from response if needed, 
                    // but for simplicity, we'll just reload or assume it worked.
                    // Actually, let's just reload to be safe and get the correct index for future updates
                    await loadDailyWins();
                }
            } catch (error) {
                console.error('Failed to save win', error);
                toast.error('Failed to save win');
            } finally {
                setSaving(false);
            }
        }, 1000); // 1s debounce
    };

    return { wins, loading, saving, saveWin };
}
