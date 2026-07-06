import { useState, useEffect, useCallback } from 'react';
import { batchRead, readRange, getSpreadsheet } from '../lib/sheetsApi';
import { MONTHS, DEFAULT_HABITS } from '../lib/constants';

export function useDashboard(spreadsheetId, year) {
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
        if (!spreadsheetId || !year) return;
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

            // Fetch existing sheets to avoid requesting non-existent tabs
            const spreadsheet = await getSpreadsheet(spreadsheetId);
            const existingTitles = spreadsheet.sheets.map(s => s.properties.title);

            // 2. Load all month data for the given year.
            // Support both new "Month YYYY" format and legacy "Month" format.
            const monthMappings = MONTHS.map(m => {
                const yearPrefix = `${m} ${year}`;
                if (existingTitles.includes(yearPrefix)) return { month: m, title: yearPrefix };
                if (existingTitles.includes(m)) return { month: m, title: m };
                return null;
            }).filter(Boolean);

            const ranges = monthMappings.map(m => `'${m.title}'!B6:AF21`);
            
            // Also fetch habit names from the first available tab
            const habitNamesRange = monthMappings.length > 0 ? [`'${monthMappings[0].title}'!A6:A21`] : [];
            
            let monthDataRanges = [];
            let habitNamesRows = [];
            
            if (ranges.length > 0) {
                const [monthRes, namesRes] = await Promise.all([
                    batchRead(spreadsheetId, ranges),
                    habitNamesRange.length > 0 ? batchRead(spreadsheetId, habitNamesRange) : Promise.resolve([{ values: [] }])
                ]);
                monthDataRanges = monthRes;
                habitNamesRows = namesRes[0].values || [];
            }

            // Extract habit names
            const habitList = habitNamesRows.map(row => row[0]).filter(Boolean).map(name => ({
                name,
                done: 0,
                total: 0,
                pct: 0,
                category: 'Other' // Default, will refine if possible
            }));

            let totalDone = 0;
            let activeCount = 0;
            let bestM = { name: '–', pct: 0 };
            
            // Initialize trend with 0 for all months to keep the chart full
            const trend = MONTHS.map(m => ({ name: m, pct: 0 }));

            monthDataRanges.forEach((range, idx) => {
                const monthName = monthMappings[idx].month;
                const trendIdx = MONTHS.indexOf(monthName);
                const rows = range.values || [];
                let monthDone = 0;
                let monthTotal = 0;

                rows.forEach((row, rowIdx) => {
                    const checks = row.filter(c => c === true || c === 'TRUE' || c === '✓' || c === 'checked').length;
                    const totalCells = row.filter(c => c !== '' && c !== null && c !== undefined).length;
                    
                    monthDone += checks;
                    monthTotal += totalCells;

                    // Accumulate per-habit stats if habit exists
                    if (habitList[rowIdx]) {
                        habitList[rowIdx].done += checks;
                        habitList[rowIdx].total += totalCells;
                    }
                });

                const monthPct = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
                if (monthPct > 0) activeCount++;
                if (monthPct > bestM.pct) bestM = { name: monthName, pct: monthPct };

                totalDone += monthDone;
                if (trendIdx !== -1) {
                    trend[trendIdx].pct = monthPct;
                }
            });

            // Finalize habits list with percentages
            habitList.forEach(h => {
                h.pct = h.total > 0 ? Math.round((h.done / h.total) * 100) : 0;
                // Prefer real category and id from Settings, matched by name
                const settingsHabit = loadedHabits.find(lh =>
                    lh.name === h.name || h.name.includes(lh.name) || lh.name.includes(h.name)
                );
                if (settingsHabit) {
                    h.id = settingsHabit.id;
                    h.category = settingsHabit.category;
                    h.emoji = settingsHabit.emoji;
                } else {
                    const def = DEFAULT_HABITS.find(dh => h.name.includes(dh.name));
                    if (def) h.category = def.category;
                }
            });
            setHabits(habitList);

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
    }, [spreadsheetId, year]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return { stats, yearlyTrend, habits, streaks, loading };
}
