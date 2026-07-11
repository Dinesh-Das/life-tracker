import { useState, useEffect } from 'react';
import { batchRead, readDataRows } from '../lib/sheetsApi';
import { computeMonthlyStats, focusMinutesForMonth } from '../lib/monthlyWrapped';

/**
 * Monthly Wrapped — reads the current month tab + FocusLogs and reduces
 * them to a tight monthly recap (the yearly Wrapped's little sibling).
 */
export function useMonthlyWrapped(spreadsheetId, currentMonth, currentYear, currentMonthIndex) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!spreadsheetId || !currentMonth) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setStats(null);
            try {
                const tab = `${currentMonth} ${currentYear}`;
                const today = new Date();
                const isCurrent = today.getFullYear() === currentYear && today.getMonth() === currentMonthIndex;
                const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
                const upToDay = isCurrent
                    ? today.getDate()
                    : (new Date(currentYear, currentMonthIndex, 1) > today ? 0 : daysInMonth);

                const [labelsR, gridR, mentalR] = await batchRead(spreadsheetId, [
                    `'${tab}'!A6:A20`,
                    `'${tab}'!B6:AF`,
                    `'${tab}'!B22:AF22`,
                ]);

                let focusRows = [];
                try {
                    focusRows = await readDataRows(spreadsheetId, 'FocusLogs!A:D');
                } catch {
                    // FocusLogs tab may not exist yet — focus time simply reads 0
                }

                const monthly = computeMonthlyStats({
                    labels: (labelsR?.values || []).map(r => r?.[0]),
                    habitRows: gridR?.values || [],
                    mentalRow: mentalR?.values?.[0] || [],
                    upToDay,
                });
                monthly.focusMinutes = focusMinutesForMonth(focusRows || [], currentYear, currentMonthIndex);

                if (!cancelled) setStats(monthly);
            } catch (e) {
                console.error('Monthly Wrapped fetch failed', e);
                if (!cancelled) setStats(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [spreadsheetId, currentMonth, currentYear, currentMonthIndex]);

    return { stats, loading };
}
