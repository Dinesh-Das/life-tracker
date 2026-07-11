import { useState, useEffect } from 'react';
import { readDataRows, readRange } from '../lib/sheetsApi';
import { computeMonthlyStats, extractMonthlyInputs, focusMinutesForMonth } from '../lib/monthlyWrapped';

/**
 * Monthly Wrapped — reads the current month tab + FocusLogs and reduces
 * them to a tight monthly recap (the yearly Wrapped's little sibling).
 */
export function useMonthlyWrapped(spreadsheetId, currentMonth, currentYear, currentMonthIndex) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!spreadsheetId || !currentMonth) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            setStats(null);
            try {
                const tab = `${currentMonth} ${currentYear}`;
                const today = new Date();
                const isCurrent = today.getFullYear() === currentYear && today.getMonth() === currentMonthIndex;
                const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
                const upToDay = isCurrent
                    ? today.getDate()
                    : (new Date(currentYear, currentMonthIndex, 1) > today ? 0 : daysInMonth);

                const [monthRows, dailyStateRows] = await Promise.all([
                    readRange(spreadsheetId, `'${tab}'!A6:AG`),
                    readDataRows(spreadsheetId, 'DailyState!A:C').catch(() => []),
                ]);

                let focusRows = [];
                try {
                    focusRows = await readDataRows(spreadsheetId, 'FocusLogs!A:D');
                } catch {
                    // FocusLogs tab may not exist yet — focus time simply reads 0
                }

                const inputs = extractMonthlyInputs(monthRows, dailyStateRows, currentYear, currentMonthIndex);
                const monthly = computeMonthlyStats({
                    ...inputs,
                    upToDay,
                });
                monthly.focusMinutes = focusMinutesForMonth(focusRows || [], currentYear, currentMonthIndex);

                if (!cancelled) setStats(monthly);
            } catch (e) {
                console.error('Monthly Wrapped fetch failed', e);
                if (!cancelled) {
                    setStats(null);
                    setError(e);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [spreadsheetId, currentMonth, currentYear, currentMonthIndex]);

    return { stats, loading, error };
}
