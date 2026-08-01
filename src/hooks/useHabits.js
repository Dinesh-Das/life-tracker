import { useState, useEffect, useCallback, useRef } from 'react';
import { appendRows, readDataRows, readRange } from '../lib/sheetsApi';
import { resilientBatchWrite, resilientUpsertDateRow } from '../lib/syncQueue';
import { getDaysInMonth, format } from 'date-fns';
import { scheduleStreakRecompute } from '../lib/streakRecompute';
import {
    archiveHabitRecord, createHabit, loadAllHabits, updateHabitRecord,
} from '../lib/habitRepository';
import { ensureDailyStateSheet, ensureMonthTab } from '../lib/sheetScaffold';
import {
    DAILY_STATE_TAB, MONTH_HABIT_ID_INDEX, MONTH_HABIT_START_ROW,
    dayColumn, decodeCheck, encodeCheck, habitLabel, monthHabitRange,
    normalizeHabitLabel, normalizeHabitName,
} from '../lib/sheetLayout';
import toast from 'react-hot-toast';

const localDateKey = (date) => format(date, 'yyyy-MM-dd');

export function useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex) {
    const [habits, setHabits] = useState([]);
    const [checks, setChecks] = useState({});
    const [mentalState, setMentalState] = useState({});
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [pendingWrites, setPendingWrites] = useState(0);
    const generation = useRef(0);
    const trustedSnapshot = useRef(false);
    const rowByHabitId = useRef(new Map());
    const dailyStateRowByDate = useRef(new Map());
    const checksRef = useRef({});
    const habitWriteChains = useRef(new Map());
    const cellWriteVersions = useRef(new Map());

    const daysInMonth = currentYear && currentMonthIndex !== undefined
        ? getDaysInMonth(new Date(currentYear, currentMonthIndex))
        : 31;

    const loadMonthData = useCallback(async () => {
        if (!spreadsheetId || !currentMonth || currentMonthIndex === undefined) return;
        const request = ++generation.current;
        trustedSnapshot.current = false;
        rowByHabitId.current = new Map();
        dailyStateRowByDate.current = new Map();
        checksRef.current = {};
        setHabits([]);
        setChecks({});
        setMentalState({});
        setStatus('loading');
        setError(null);

        try {
            const monthStartKey = localDateKey(new Date(currentYear, currentMonthIndex, 1));
            const monthEndKey = localDateKey(new Date(currentYear, currentMonthIndex + 1, 0));
            const allHabits = await loadAllHabits(spreadsheetId);
            const activeHabits = allHabits.filter(habit =>
                (!habit.activeFrom || habit.activeFrom <= monthEndKey) &&
                (!habit.archivedAt || habit.archivedAt.slice(0, 10) > monthStartKey)
            );
            const tabName = `${currentMonth} ${currentYear}`;

            await Promise.all([
                ensureMonthTab(spreadsheetId, currentMonth, currentYear, activeHabits),
                ensureDailyStateSheet(spreadsheetId),
            ]);

            const [monthRows, dailyRows] = await Promise.all([
                readRange(spreadsheetId, monthHabitRange(tabName)),
                readDataRows(spreadsheetId, `${DAILY_STATE_TAB}!A:C`),
            ]);
            const legacyMentalSource = (monthRows || []).find(row => /mental state/i.test(String(row?.[0] || ''))) || [];
            const legacyMental = [legacyMentalSource.slice(1, 32)];

            // Match against every definition. Migrated legacy habits often have an
            // ActiveFrom equal to the migration date even though older month rows
            // already contain history; the existing row is authoritative evidence.
            const habitsById = new Map(allHabits.map(habit => [habit.id, habit]));
            const idsByLabel = new Map();
            const idsByName = new Map();
            allHabits.forEach(habit => {
                const key = normalizeHabitLabel(habitLabel(habit));
                const ids = idsByLabel.get(key) || [];
                ids.push(habit.id);
                idsByLabel.set(key, ids);

                const nameKey = normalizeHabitName(habit.name);
                const nameIds = idsByName.get(nameKey) || [];
                nameIds.push(habit.id);
                idsByName.set(nameKey, nameIds);
            });

            const resolvedRows = new Map();
            (monthRows || []).forEach((row, index) => {
                const sheetRow = MONTH_HABIT_START_ROW + index;
                let habitId = String(row?.[MONTH_HABIT_ID_INDEX] || '');
                if (!habitsById.has(habitId)) {
                    const exactMatches = idsByLabel.get(normalizeHabitLabel(row?.[0])) || [];
                    const nameMatches = idsByName.get(normalizeHabitName(row?.[0], { legacyLabel: true })) || [];
                    const matches = exactMatches.length ? exactMatches : nameMatches;
                    habitId = matches.length === 1 ? matches[0] : '';
                }
                if (habitId && habitsById.has(habitId) && !resolvedRows.has(habitId)) {
                    resolvedRows.set(habitId, { sheetRow, row });
                }
            });

            const missing = activeHabits.filter(habit => !resolvedRows.has(habit.id));
            if (missing.length) {
                const firstRow = MONTH_HABIT_START_ROW + (monthRows?.length || 0);
                const values = missing.map(habit => [habitLabel(habit), ...Array(31).fill(''), habit.id]);
                await appendRows(spreadsheetId, `'${tabName}'!A:AG`, values);
                missing.forEach((habit, index) => {
                    resolvedRows.set(habit.id, { sheetRow: firstRow + index, row: values[index] });
                });
            }

            const activeIds = new Set(activeHabits.map(habit => habit.id));
            const loadedHabits = allHabits.filter(habit => resolvedRows.has(habit.id) || activeIds.has(habit.id));

            const nextChecks = {};
            loadedHabits.forEach(habit => {
                const row = resolvedRows.get(habit.id)?.row || [];
                nextChecks[habit.id] = {};
                for (let day = 1; day <= daysInMonth; day++) {
                    nextChecks[habit.id][day] = decodeCheck(row[day]);
                }
            });

            const stateRows = dailyRows || [];
            const stateRowMap = new Map();
            const nextMental = {};
            stateRows.forEach((row, index) => {
                const date = String(row?.[0] || '');
                if (!date) return;
                stateRowMap.set(date, index + 2);
                if (date.startsWith(`${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-`)) {
                    const day = Number.parseInt(date.slice(8, 10), 10);
                    const score = Number.parseInt(row[1], 10);
                    if (day >= 1 && day <= daysInMonth && score >= 1 && score <= 10) nextMental[day] = score;
                }
            });

            const legacyRowsToAppend = [];
            (legacyMental?.[0] || []).forEach((value, index) => {
                const score = Number.parseInt(value, 10);
                const day = index + 1;
                if (score < 1 || score > 10 || day > daysInMonth || nextMental[day] !== undefined) return;
                const date = localDateKey(new Date(currentYear, currentMonthIndex, day));
                nextMental[day] = score;
                legacyRowsToAppend.push([date, score, new Date().toISOString()]);
            });
            if (legacyRowsToAppend.length) {
                const first = stateRows.length + 2;
                await appendRows(spreadsheetId, `${DAILY_STATE_TAB}!A:C`, legacyRowsToAppend);
                legacyRowsToAppend.forEach((row, index) => stateRowMap.set(row[0], first + index));
            }

            if (request !== generation.current) return;
            rowByHabitId.current = resolvedRows;
            dailyStateRowByDate.current = stateRowMap;
            checksRef.current = nextChecks;
            setHabits(loadedHabits);
            setChecks(nextChecks);
            setMentalState(nextMental);
            setStatus('success');
            trustedSnapshot.current = true;
        } catch (loadError) {
            if (request !== generation.current) return;
            console.error('Failed to load month data', loadError);
            setError(loadError);
            setStatus('error');
        }
    }, [spreadsheetId, currentMonth, currentYear, currentMonthIndex, daysInMonth]);

    useEffect(() => {
        loadMonthData();
        return () => { generation.current += 1; };
    }, [loadMonthData]);

    const withPending = useCallback(async (operation) => {
        setPendingWrites(count => count + 1);
        try {
            return await operation();
        } finally {
            setPendingWrites(count => Math.max(0, count - 1));
        }
    }, []);

    const serializeHabitWrite = useCallback((habitId, operation) => {
        const previous = habitWriteChains.current.get(habitId) || Promise.resolve();
        const run = previous.catch(() => {}).then(operation);
        habitWriteChains.current.set(habitId, run);
        return run.finally(() => {
            if (habitWriteChains.current.get(habitId) === run) habitWriteChains.current.delete(habitId);
        });
    }, []);

    const toggleCheck = useCallback(async (habitId, day) => {
        if (!trustedSnapshot.current || status === 'error') {
            toast.error('Habit data is not loaded. Retry before editing.');
            return;
        }
        const row = rowByHabitId.current.get(habitId);
        if (!row) {
            toast.error('Habit history row is unavailable. Reload and try again.');
            return;
        }
        const currentValue = checksRef.current[habitId]?.[day] || false;
        const nextValue = currentValue === true ? false : true;
        const versionKey = `${habitId}:${day}`;
        const version = (cellWriteVersions.current.get(versionKey) || 0) + 1;
        cellWriteVersions.current.set(versionKey, version);
        const optimistic = {
            ...checksRef.current,
            [habitId]: { ...(checksRef.current[habitId] || {}), [day]: nextValue },
        };
        checksRef.current = optimistic;
        setChecks(optimistic);

        const tabName = `${currentMonth} ${currentYear}`;
        const date = new Date(currentYear, currentMonthIndex, day);
        try {
            const result = await withPending(() => serializeHabitWrite(habitId, () => (
                resilientBatchWrite(spreadsheetId, [{
                    range: `'${tabName}'!${dayColumn(day)}${row.sheetRow}`,
                    values: [[encodeCheck(nextValue)]],
                }])
            )));
            if (result?.queued) {
                const { enqueue } = await import('../lib/syncQueue');
                enqueue({ type: 'recomputeStreak', spreadsheetId, habitId });
            } else {
                const { enqueue, removeQueuedRecompute } = await import('../lib/syncQueue');
                const recomputeOperationId = enqueue({ type: 'recomputeStreak', spreadsheetId, habitId });
                void scheduleStreakRecompute(spreadsheetId, habitId).then(() => {
                    removeQueuedRecompute(spreadsheetId, habitId, recomputeOperationId);
                }).catch(recomputeError => {
                    console.error('Streak refresh failed', recomputeError);
                    toast.error('Checkmark saved, but streak refresh will retry later.');
                });
            }
        } catch (saveError) {
            console.error('Failed to save checkmark', saveError);
            if (cellWriteVersions.current.get(versionKey) === version) {
                const currentChecks = checksRef.current;
                const rollback = {
                    ...currentChecks,
                    [habitId]: { ...(currentChecks[habitId] || {}), [day]: currentValue },
                };
                checksRef.current = rollback;
                setChecks(rollback);
            }
            toast.error(`Failed to save ${format(date, 'MMM d')} checkmark`);
        }
    }, [currentMonth, currentYear, currentMonthIndex, serializeHabitWrite, spreadsheetId, status, withPending]);

    const updateMentalState = useCallback(async (day, rawValue) => {
        const value = Number.parseInt(rawValue, 10);
        if (rawValue !== '' && (value < 1 || value > 10 || Number.isNaN(value))) {
            toast.error('Mental state must be between 1 and 10.');
            return;
        }
        const previous = mentalState[day];
        setMentalState(state => ({ ...state, [day]: rawValue === '' ? undefined : value }));
        const date = localDateKey(new Date(currentYear, currentMonthIndex, day));
        try {
            await withPending(async () => {
                const sheetRow = dailyStateRowByDate.current.get(date);
                if (sheetRow) {
                    await resilientBatchWrite(spreadsheetId, [{
                        range: `${DAILY_STATE_TAB}!B${sheetRow}:C${sheetRow}`,
                        values: [[rawValue === '' ? '' : value, new Date().toISOString()]],
                    }]);
                } else {
                    const result = await resilientUpsertDateRow(spreadsheetId, `${DAILY_STATE_TAB}!A:C`, [
                        date, rawValue === '' ? '' : value, new Date().toISOString(),
                    ]);
                    const updatedRange = result?.result?.updates?.updatedRange || '';
                    const match = updatedRange.match(/!(?:A)?(\d+)/);
                    if (match) dailyStateRowByDate.current.set(date, Number(match[1]));
                }
            });
        } catch (_saveError) {
            setMentalState(state => ({ ...state, [day]: previous }));
            toast.error('Failed to save mental state');
        }
    }, [currentYear, currentMonthIndex, mentalState, spreadsheetId, withPending]);

    const addHabit = useCallback(async (input) => {
        if (!trustedSnapshot.current) return false;
        try {
            const habit = await withPending(() => createHabit(spreadsheetId, input, habits.length + 1));
            const tabName = `${currentMonth} ${currentYear}`;
            const rowValues = [habitLabel(habit), ...Array(31).fill(''), habit.id];
            const result = await appendRows(spreadsheetId, `'${tabName}'!A:AG`, [rowValues]);
            const updatedRange = result?.result?.updates?.updatedRange || '';
            const match = updatedRange.match(/!(?:A)?(\d+)/);
            const sheetRow = match ? Number(match[1]) : MONTH_HABIT_START_ROW + rowByHabitId.current.size;
            rowByHabitId.current.set(habit.id, { sheetRow, row: rowValues });
            const nextChecks = { ...checksRef.current, [habit.id]: {} };
            for (let day = 1; day <= daysInMonth; day++) nextChecks[habit.id][day] = false;
            checksRef.current = nextChecks;
            setChecks(nextChecks);
            setHabits(items => [...items, habit]);
            toast.success(`Habit "${habit.name}" added!`);
            return true;
        } catch (_saveError) {
            toast.error('Failed to save new habit');
            await loadMonthData();
            return false;
        }
    }, [currentMonth, currentYear, daysInMonth, habits.length, loadMonthData, spreadsheetId, withPending]);

    const deleteHabit = useCallback(async (id) => {
        const habit = habits.find(item => item.id === id);
        if (!habit) return false;
        try {
            await withPending(() => archiveHabitRecord(spreadsheetId, habit));
            setHabits(items => items.filter(item => item.id !== id));
            toast.success('Habit archived');
            return true;
        } catch (_saveError) {
            toast.error('Failed to archive habit');
            return false;
        }
    }, [habits, spreadsheetId, withPending]);

    const updateHabit = useCallback(async (id, updates) => {
        const current = habits.find(item => item.id === id);
        if (!current) return false;
        const optimistic = { ...current, ...updates };
        setHabits(items => items.map(item => item.id === id ? optimistic : item));
        try {
            const updated = await withPending(() => updateHabitRecord(spreadsheetId, optimistic));
            setHabits(items => items.map(item => item.id === id ? updated : item));
            const row = rowByHabitId.current.get(id);
            if (row && (updates.name !== undefined || updates.emoji !== undefined)) {
                await resilientBatchWrite(spreadsheetId, [{
                    range: `'${currentMonth} ${currentYear}'!A${row.sheetRow}`,
                    values: [[habitLabel(updated)]],
                }]);
            }
            return true;
        } catch (_saveError) {
            setHabits(items => items.map(item => item.id === id ? current : item));
            toast.error('Failed to update habit');
            return false;
        }
    }, [currentMonth, currentYear, habits, spreadsheetId, withPending]);

    return {
        habits,
        checks,
        mentalState,
        loading: status === 'loading',
        refreshing: status === 'refreshing',
        saving: pendingWrites > 0,
        pendingWrites,
        status,
        error,
        daysInMonth,
        toggleCheck,
        updateMentalState,
        addHabit,
        deleteHabit,
        updateHabit,
        reload: loadMonthData,
    };
}
