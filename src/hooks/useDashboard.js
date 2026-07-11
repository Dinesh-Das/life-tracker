import { useState, useEffect, useCallback } from 'react';
import { batchRead, readRange, getSpreadsheet } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';
import { loadAllHabits } from '../lib/habitRepository';
import { MONTH_HABIT_ID_INDEX, decodeCheck, habitLabel, normalizeHabitLabel, normalizeHabitName } from '../lib/sheetLayout';
import { format } from 'date-fns';

function activeOn(habit, dateKey) {
    return (!habit.activeFrom || habit.activeFrom <= dateKey) &&
        (!habit.archivedAt || habit.archivedAt.slice(0, 10) > dateKey);
}

export function useDashboard(spreadsheetId, year) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalCompleted: 0,
        bestMonth: { name: '–', pct: 0 },
        bestStreak: 0,
        activeMonths: 0,
    });
    const [yearlyTrend, setYearlyTrend] = useState([]);
    const [habits, setHabits] = useState([]);
    const [streaks, setStreaks] = useState({});

    const fetchDashboardData = useCallback(async () => {
        if (!spreadsheetId || !year) return;
        setLoading(true);
        setError(null);
        try {
            const [definitions, spreadsheet] = await Promise.all([
                loadAllHabits(spreadsheetId),
                getSpreadsheet(spreadsheetId),
            ]);
            const byId = new Map(definitions.map(habit => [habit.id, habit]));
            const byLabel = new Map();
            const byName = new Map();
            definitions.forEach(habit => {
                const label = normalizeHabitLabel(habitLabel(habit));
                const values = byLabel.get(label) || [];
                values.push(habit);
                byLabel.set(label, values);
                const name = normalizeHabitName(habit.name);
                const nameValues = byName.get(name) || [];
                nameValues.push(habit);
                byName.set(name, nameValues);
            });

            const titles = spreadsheet.sheets.map(sheet => sheet.properties.title);
            const monthMappings = MONTHS.map(month => {
                const titled = `${month} ${year}`;
                if (titles.includes(titled)) return { month, title: titled };
                if (titles.includes(month) && year === new Date().getFullYear()) return { month, title: month };
                return null;
            }).filter(Boolean);
            const ranges = monthMappings.map(month => `'${month.title}'!A6:AG`);
            const monthData = ranges.length ? await batchRead(spreadsheetId, ranges) : [];

            const habitStats = new Map(definitions.map(habit => [habit.id, { ...habit, done: 0, total: 0, pct: 0 }]));
            const trend = MONTHS.map(name => ({ name, pct: 0 }));
            let totalCompleted = 0;
            let activeMonths = 0;
            let bestMonth = { name: '–', pct: 0 };
            const now = new Date();

            monthData.forEach((range, index) => {
                const mapping = monthMappings[index];
                const monthIndex = MONTHS.indexOf(mapping.month);
                const days = new Date(year, monthIndex + 1, 0).getDate();
                const isCurrent = year === now.getFullYear() && monthIndex === now.getMonth();
                const isFuture = new Date(year, monthIndex, 1) > now;
                const upToDay = isFuture ? 0 : (isCurrent ? now.getDate() : days);
                let monthDone = 0;
                let monthPossible = 0;

                (range.values || []).forEach(row => {
                    let habit = byId.get(String(row?.[MONTH_HABIT_ID_INDEX] || ''));
                    if (!habit) {
                        const exact = byLabel.get(normalizeHabitLabel(row?.[0])) || [];
                        const matches = exact.length ? exact : (byName.get(normalizeHabitName(row?.[0], { legacyLabel: true })) || []);
                        if (matches.length === 1) habit = matches[0];
                    }
                    if (!habit) return;
                    const aggregate = habitStats.get(habit.id);
                    for (let day = 1; day <= upToDay; day++) {
                        const dateKey = format(new Date(year, monthIndex, day), 'yyyy-MM-dd');
                        if (!activeOn(habit, dateKey)) continue;
                        monthPossible++;
                        aggregate.total++;
                        if (decodeCheck(row[day]) === true) {
                            monthDone++;
                            aggregate.done++;
                        }
                    }
                });

                const pct = monthPossible ? Math.round((monthDone / monthPossible) * 100) : 0;
                trend[monthIndex].pct = pct;
                if (monthPossible) activeMonths++;
                if (pct > bestMonth.pct) bestMonth = { name: mapping.month, pct };
                totalCompleted += monthDone;
            });

            const visibleHabits = [...habitStats.values()]
                .filter(habit => habit.total > 0 || !habit.archivedAt)
                .map(habit => ({ ...habit, pct: habit.total ? Math.round((habit.done / habit.total) * 100) : 0 }));

            const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E').catch(() => []);
            const streakMap = {};
            let bestStreak = 0;
            streakRows.forEach(row => {
                if (!row[0] || row[0] === '_skipTokens') return;
                streakMap[row[0]] = {
                    current: Number.parseInt(row[1], 10) || 0,
                    best: Number.parseInt(row[2], 10) || 0,
                    lastDone: row[3] || '',
                    total: Number.parseInt(row[4], 10) || 0,
                };
                bestStreak = Math.max(bestStreak, streakMap[row[0]].best);
            });

            setHabits(visibleHabits);
            setStreaks(streakMap);
            setStats({ totalCompleted, bestMonth, bestStreak, activeMonths });
            setYearlyTrend(trend);
        } catch (loadError) {
            console.error('Dashboard Fetch Error:', loadError);
            setError(loadError);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId, year]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
    return { stats, yearlyTrend, habits, streaks, loading, error, retry: fetchDashboardData };
}
