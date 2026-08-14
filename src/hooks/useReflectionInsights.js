import { useState, useEffect } from 'react';
import { readDataRows } from '../lib/sheetsApi';
import { ensureDailyWinsSheet, ensureJournalSheet } from '../lib/sheetScaffold';
import { computeWinBalance, computeEntryStreak, buildInsights } from '../lib/reflectionInsights';
import { format } from 'date-fns';

/** Derives life-balance + streak insights from DailyWins and JournalLogs. */
export function useReflectionInsights(spreadsheetId, year = new Date().getFullYear()) {
    const [balance, setBalance] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadedYear, setLoadedYear] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!spreadsheetId) return;
            setLoading(true);
            setError(null);
            setBalance([]);
            setInsights([]);
            setLoadedYear(null);
            try {
                if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                    await Promise.all([
                        ensureDailyWinsSheet(spreadsheetId),
                        ensureJournalSheet(spreadsheetId),
                    ]);
                }
                const [winsRows, journalRows] = await Promise.all([
                    readDataRows(spreadsheetId, 'DailyWins!A:F'),
                    readDataRows(spreadsheetId, 'JournalLogs!A:D'),
                ]);
                const prefix = `${year}-`;
                const selectedWins = winsRows.filter(row => String(row?.[0] || '').startsWith(prefix));
                const selectedJournal = journalRows.filter(row => String(row?.[0] || '').startsWith(prefix));
                const realYear = new Date().getFullYear();
                const todayStr = year === realYear ? format(new Date(), 'yyyy-MM-dd') : `${year}-12-31`;
                const bal = computeWinBalance(selectedWins);
                const msgs = buildInsights(
                    bal,
                    computeEntryStreak(selectedWins, todayStr),
                    computeEntryStreak(selectedJournal, todayStr)
                );
                if (alive) {
                    setBalance(bal);
                    setInsights(msgs);
                    setLoadedYear(year);
                }
            } catch (e) {
                console.error('Failed to load reflection insights', e);
                setError(e);
                if (alive) {
                    setBalance([]);
                    setInsights([]);
                    setLoadedYear(year);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [spreadsheetId, year]);

    const isSelectedYear = loadedYear === year;
    return {
        balance: isSelectedYear ? balance : [],
        insights: isSelectedYear ? insights : [],
        loading: loading || !isSelectedYear,
        error,
    };
}
