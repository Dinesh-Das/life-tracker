import { useState, useEffect, useCallback, useRef } from 'react';
import { batchRead, getSpreadsheet } from '../lib/sheetsApi';
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
    const [loadedYear, setLoadedYear] = useState(null);
    const generation = useRef(0);

    const fetchDashboardData = useCallback(async () => {
        if (!spreadsheetId || !year) return;
        const request = ++generation.current;
        setLoading(true);
        setError(null);
        setStats({ totalCompleted: 0, bestMonth: { name: '–', pct: 0 }, bestStreak: 0, activeMonths: 0 });
        setYearlyTrend([]);
        setHabits([]);
        setStreaks({});
        setLoadedYear(null);
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
            const completedDates = new Map(definitions.map(habit => [habit.id, new Set()]));
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
                            completedDates.get(habit.id)?.add(dateKey);
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

            const streakMap = {};
            let bestStreak = 0;
            completedDates.forEach((dates, habitId) => {
                const sorted = [...dates].sort();
                let run = 0;
                let habitBest = 0;
                let previousDay = null;
                sorted.forEach(dateKey => {
                    const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000);
                    run = previousDay !== null && dayNumber === previousDay + 1 ? run + 1 : 1;
                    previousDay = dayNumber;
                    habitBest = Math.max(habitBest, run);
                });
                streakMap[habitId] = {
                    current: habitBest,
                    best: habitBest,
                    lastDone: sorted.at(-1) || '',
                    total: dates.size,
                };
                bestStreak = Math.max(bestStreak, habitBest);
            });

            if (request !== generation.current) return;
            setHabits(visibleHabits);
            setStreaks(streakMap);
            setStats({ totalCompleted, bestMonth, bestStreak, activeMonths });
            setYearlyTrend(trend);
            setLoadedYear(year);
        } catch (loadError) {
            if (request !== generation.current) return;
            console.error('Dashboard Fetch Error:', loadError);
            setLoadedYear(year);
            setError(loadError);
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [spreadsheetId, year]);

    useEffect(() => {
        fetchDashboardData();
        return () => { generation.current += 1; };
    }, [fetchDashboardData]);
    const isSelectedYear = loadedYear === year;
    return {
        stats: isSelectedYear ? stats : { totalCompleted: 0, bestMonth: { name: '–', pct: 0 }, bestStreak: 0, activeMonths: 0 },
        yearlyTrend: isSelectedYear ? yearlyTrend : [],
        habits: isSelectedYear ? habits : [],
        streaks: isSelectedYear ? streaks : {},
        loading: loading || !isSelectedYear,
        error,
        retry: fetchDashboardData,
    };
}
