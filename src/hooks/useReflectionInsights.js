import { useState, useEffect } from 'react';
import { readRange } from '../lib/sheetsApi';
import { ensureDailyWinsSheet, ensureJournalSheet } from '../lib/sheetScaffold';
import { computeWinBalance, computeEntryStreak, buildInsights } from '../lib/reflectionInsights';
import { format } from 'date-fns';

/** Derives life-balance + streak insights from DailyWins and JournalLogs. */
export function useReflectionInsights(spreadsheetId) {
    const [balance, setBalance] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!spreadsheetId) return;
            try {
                await Promise.all([
                    ensureDailyWinsSheet(spreadsheetId),
                    ensureJournalSheet(spreadsheetId),
                ]);
                const [winsRows, journalRows] = await Promise.all([
                    readRange(spreadsheetId, 'DailyWins!A2:F'),
                    readRange(spreadsheetId, 'JournalLogs!A2:D'),
                ]);
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const bal = computeWinBalance(winsRows);
                const msgs = buildInsights(
                    bal,
                    computeEntryStreak(winsRows, todayStr),
                    computeEntryStreak(journalRows, todayStr)
                );
                if (alive) {
                    setBalance(bal);
                    setInsights(msgs);
                }
            } catch (e) {
                console.error('Failed to load reflection insights', e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [spreadsheetId]);

    return { balance, insights, loading };
}
