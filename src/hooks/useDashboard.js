import { useState, useEffect, useCallback, useRef } from 'react';
import { batchRead, getSpreadsheet } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';
import { loadAllHabits } from '../lib/habitRepository';
import { MONTH_HABIT_ID_INDEX, habitLabel, normalizeHabitLabel, normalizeHabitName } from '../lib/sheetLayout';
import { format } from 'date-fns';
import { isHabitScheduledForDate } from '../lib/habitSchedule';
import { computeStreaks } from '../lib/streakLogic';
import {
    aggregationDayLimit,
    calendarConsistencyPct,
    mergeMonthHabitRows,
    monthHasRecordedActivity,
    monthTabSources,
} from '../lib/yearlyRows';

function lifecycleActiveOn(habit, dateKey) {
    return (!habit.activeFrom || habit.activeFrom <= dateKey) &&
        (!habit.archivedAt || habit.archivedAt.slice(0, 10) > dateKey);
}

function activeOn(habit, dateKey, globalPause) {
    return lifecycleActiveOn(habit, dateKey) && isHabitScheduledForDate(habit, dateKey, globalPause);
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
            const monthMappings = monthTabSources(titles, year);
            const ranges = monthMappings.map(month => `'${month.title}'!A6:AG`);
            const hasAppSettings = titles.includes('AppSettings');
            const responses = ranges.length || hasAppSettings ? await batchRead(spreadsheetId, [...ranges, ...(hasAppSettings ? ['AppSettings!A2:C'] : [])]) : [];
            const monthData = responses.slice(0, ranges.length);
            const settingsRows = hasAppSettings ? (responses.at(-1)?.values || []) : [];
            const productSettings = Object.fromEntries(settingsRows.filter(row => row[0]).map(row => [String(row[0]), String(row[1] || '')]));
            const globalPause = { from: productSettings.pauseFrom || '', until: productSettings.pauseUntil || '' };
            const resolveHabit = (row) => {
                let habit = byId.get(String(row?.[MONTH_HABIT_ID_INDEX] || ''));
                if (!habit) {
                    const exact = byLabel.get(normalizeHabitLabel(row?.[0])) || [];
                    const matches = exact.length ? exact : (byName.get(normalizeHabitName(row?.[0], { legacyLabel: true })) || []);
                    if (matches.length === 1) habit = matches[0];
                }
                return habit;
            };
            const mergedMonths = mergeMonthHabitRows(monthMappings, monthData, resolveHabit);

            const habitStats = new Map(definitions.map(habit => [habit.id, { ...habit, done: 0, total: 0, pct: 0 }]));
            const completedDates = new Map(definitions.map(habit => [habit.id, new Set()]));
            const skippedDates = new Map(definitions.map(habit => [habit.id, new Set()]));
            const trend = MONTHS.map(name => ({ name, pct: 0 }));
            let totalCompleted = 0;
            let activeMonths = 0;
            let bestMonth = { name: '–', pct: 0 };
            const now = new Date();

            MONTHS.forEach((month, monthIndex) => {
                const upToDay = aggregationDayLimit(year, monthIndex, now);
                let monthDone = 0;
                let monthPossible = 0;
                const activeDays = new Set();

                (mergedMonths.get(month) || []).forEach(({ habit, statuses }) => {
                    const aggregate = habitStats.get(habit.id);
                    for (let day = 1; day <= upToDay; day++) {
                        const dateKey = format(new Date(year, monthIndex, day), 'yyyy-MM-dd');
                        const status = statuses[day];
                        if (status === 'skip') {
                            skippedDates.get(habit.id)?.add(dateKey);
                            continue;
                        }
                        const scheduled = activeOn(habit, dateKey, globalPause);
                        if (!scheduled && lifecycleActiveOn(habit, dateKey)) {
                            const scheduleOnlyHabit = { ...habit, activeFrom: '', archivedAt: '' };
                            if (!isHabitScheduledForDate(scheduleOnlyHabit, dateKey, globalPause)) {
                                skippedDates.get(habit.id)?.add(dateKey);
                            }
                        }
                        // A real completion in a legacy/month row is authoritative
                        // even when migrated ActiveFrom/ArchivedAt metadata is stale.
                        if (!scheduled && status !== true) continue;
                        monthPossible++;
                        aggregate.total++;
                        if (status === true) {
                            monthDone++;
                            activeDays.add(day);
                            aggregate.done++;
                            completedDates.get(habit.id)?.add(dateKey);
                        }
                    }
                });

                const pct = monthPossible ? Math.round((monthDone / monthPossible) * 100) : 0;
                trend[monthIndex].pct = pct;
                if (monthHasRecordedActivity(monthDone)) activeMonths++;
                const calendarPct = calendarConsistencyPct(activeDays.size, upToDay);
                if (calendarPct > bestMonth.pct) bestMonth = { name: month, pct: calendarPct };
                totalCompleted += monthDone;
            });

            const visibleHabits = [...habitStats.values()]
                .filter(habit => habit.total > 0 || !habit.archivedAt)
                .map(habit => ({ ...habit, pct: habit.total ? Math.round((habit.done / habit.total) * 100) : 0 }));

            const streakMap = {};
            let bestStreak = 0;
            const yearEnd = year === now.getFullYear()
                ? format(now, 'yyyy-MM-dd')
                : `${year}-12-31`;
            completedDates.forEach((dates, habitId) => {
                const recomputed = computeStreaks(
                    [...dates],
                    yearEnd,
                    [...(skippedDates.get(habitId) || [])]
                );
                streakMap[habitId] = {
                    current: recomputed.current,
                    best: recomputed.best,
                    lastDone: recomputed.lastDone,
                    total: recomputed.total,
                };
                bestStreak = Math.max(bestStreak, recomputed.best);
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
