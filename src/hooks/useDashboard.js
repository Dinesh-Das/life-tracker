import { useState, useEffect, useCallback } from 'react';
import { batchRead, readRange } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';

export function useDashboard(spreadsheetId) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCompleted: 0,
        bestMonth: { name: '–', pct: 0 },
        bestStreak: 0,
        activeMonths: 0
    });
    const [yearlyTrend, setYearlyTrend] = useState([]);
    const [habits, setHabits] = useState([]);
    const [streaks, setStreaks] = useState({});

    const fetchDashboardData = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            // 1. Load all Habit settings (A-J = 10 cols, up to 50 habits)
            const habitRows = await readRange(spreadsheetId, 'Settings!A2:J50');
            const loadedHabits = habitRows
                .filter(r => r[1])
                .map(r => ({
                    id: r[0],
                    name: r[1],
                    emoji: r[2],
                    goal: parseInt(r[3]) || 30,
                    category: r[4] || 'General',
                    femaleOnly: r[5] === 'TRUE',
                    color: r[9] || '',
                }));
            setHabits(loadedHabits);

            // 2. Load all month data in one batch call
            const ranges = MONTHS.map(m => `${m}!B6:AF15`);
            const monthDataRanges = await batchRead(spreadsheetId, ranges);

            let totalDone = 0;
            let activeCount = 0;
            let bestM = { name: '–', pct: 0 };
            const trend = [];

            monthDataRanges.forEach((range, idx) => {
                const monthName = MONTHS[idx];
                const rows = range.values || [];
                let monthDone = 0;
                let monthTotal = 0;

                rows.forEach((row) => {
                    const checks = row.filter(c => c === true || c === 'TRUE').length;
                    const totalCells = row.filter(c => c !== '' && c !== null && c !== undefined).length;
                    monthDone += checks;
                    monthTotal += totalCells;
                });

                const monthPct = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
                if (monthPct > 0) activeCount++;
                if (monthPct > bestM.pct) bestM = { name: monthName, pct: monthPct };

                totalDone += monthDone;
                trend.push({ name: monthName, pct: monthPct });
            });

            // 3. Load streaks from Streaks tab
            let bestStreakVal = 0;
            try {
                const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E50');
                const streakMap = {};
                streakRows.forEach(row => {
                    if (row[0]) {
                        streakMap[row[0]] = {
                            current: parseInt(row[1]) || 0,
                            best: parseInt(row[2]) || 0,
                            lastDone: row[3] || '',
                            total: parseInt(row[4]) || 0,
                        };
                        if ((parseInt(row[2]) || 0) > bestStreakVal) {
                            bestStreakVal = parseInt(row[2]) || 0;
                        }
                    }
                });
                setStreaks(streakMap);
            } catch {
                // Streaks tab might not have data yet — that's fine
            }

            setStats({
                totalCompleted: totalDone,
                bestMonth: bestM,
                bestStreak: bestStreakVal,
                activeMonths: activeCount
            });
            setYearlyTrend(trend);

        } catch (error) {
            console.error('Dashboard Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return { stats, yearlyTrend, habits, streaks, loading };
}
