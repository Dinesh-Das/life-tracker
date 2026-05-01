import { useState, useEffect, useCallback } from 'react';
import { readRange, batchWrite, colIndexToLabel } from '../lib/sheetsApi';
import { DEFAULT_HABITS } from '../lib/constants';
import { getDaysInMonth, subDays, format } from 'date-fns';
import toast from 'react-hot-toast';

export function useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex) {
    const [habits, setHabits] = useState([]);
    const [checks, setChecks] = useState({});
    const [mentalState, setMentalState] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving] = useState(false);
    const daysInMonth = currentYear && currentMonthIndex !== undefined
        ? getDaysInMonth(new Date(currentYear, currentMonthIndex))
        : 31;

    const loadMonthData = useCallback(async () => {
        if (!spreadsheetId || !currentMonth) return;
        setLoading(true);
        try {
            // 1. Read habit definitions from Settings tab
            const settingsRows = await readRange(spreadsheetId, 'Settings!A2:J50');
            let loadedHabits = [];

            if (settingsRows && settingsRows.length > 0) {
                loadedHabits = settingsRows
                    .filter(row => row[1]) // has a name
                    .map((row, i) => ({
                        id: row[0] || String(i + 1),
                        name: row[1],
                        emoji: row[2] || '✨',
                        goal: parseInt(row[3]) || 30,
                        category: row[4] || 'Health',
                        femaleOnly: row[5] === 'TRUE' || row[5] === true,
                        frequency: row[6] || 'Daily',
                        order: parseInt(row[7]) || i + 1,
                    }));
            }

            if (loadedHabits.length === 0) {
                // Fallback to default habits if settings empty
                loadedHabits = DEFAULT_HABITS.map((h, i) => ({
                    ...h,
                    id: String(Date.now()) + i,
                    femaleOnly: false,
                    frequency: 'Daily',
                    order: i + 1,
                }));
            }

            setHabits(loadedHabits);

            // 2. Read month check data (Rows 6-15, Cols B-AE = indices 1-31)
            const tabName = `${currentMonth} ${currentYear}`;
            const lastCol = colIndexToLabel(daysInMonth); // e.g., 'AF' for 31 days
            
            let monthRows;
            try {
                monthRows = await readRange(spreadsheetId, `'${tabName}'!B6:${lastCol}20`);
            } catch (err) {
                // If 400 (Bad Request / Missing Tab), try to create it and retry
                if (err.status === 400 || err.code === 400) {
                    const { ensureMonthTab } = await import('../lib/sheetScaffold');
                    await ensureMonthTab(spreadsheetId, currentMonth, currentYear);
                    monthRows = await readRange(spreadsheetId, `'${tabName}'!B6:${lastCol}20`);
                } else {
                    throw err;
                }
            }

            const checksMap = {};
            loadedHabits.forEach((habit, hIdx) => {
                checksMap[habit.id] = {};
                const row = monthRows?.[hIdx] || [];
                for (let d = 0; d < daysInMonth; d++) {
                    const val = row[d];
                    checksMap[habit.id][d + 1] = val === true || val === 'TRUE' || val === '✓';
                }
            });
            setChecks(checksMap);

            // 3. Read mental state row (Row 22 based on new scaffold)
            const mentalRowData = await readRange(spreadsheetId, `'${tabName}'!B22:${lastCol}22`);
            const mentalMap = {};
            if (mentalRowData?.[0]) {
                mentalRowData[0].forEach((val, i) => {
                    if (val !== '' && val !== null && val !== undefined) {
                        mentalMap[i + 1] = parseInt(val) || 0;
                    }
                });
            }
            setMentalState(mentalMap);

        } catch (error) {
            console.error('Failed to load month data', error);
            // Fallback on error — show defaults so UI doesn't break
            if (habits.length === 0) {
                setHabits(DEFAULT_HABITS.map((h, i) => ({ ...h, id: String(i + 1) })));
            }
            setChecks({});
            setMentalState({});
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId, currentMonth, currentYear, daysInMonth, habits.length]);

    useEffect(() => {
        loadMonthData();
    }, [loadMonthData]);

    const updateStreakPersistence = async (habitId, day, isChecked) => {
        try {
            const date = new Date(currentYear, currentMonthIndex, day);
            const dateStr = format(date, 'yyyy-MM-dd');
            const yesterdayStr = format(subDays(date, 1), 'yyyy-MM-dd');

            // 1. Read existing streaks
            const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E50');
            let rowIndex = streakRows.findIndex(r => r[0] === habitId);
            
            let current = 0, best = 0, lastDone = '', total = 0;

            if (rowIndex !== -1) {
                const row = streakRows[rowIndex];
                current = parseInt(row[1]) || 0;
                best = parseInt(row[2]) || 0;
                lastDone = row[3] || '';
                total = parseInt(row[4]) || 0;
            } else {
                rowIndex = streakRows.length;
            }

            // 2. Update logic
            if (isChecked) {
                total++;
                if (lastDone === yesterdayStr) {
                    current++;
                } else if (lastDone !== dateStr) {
                    current = 1;
                }
                if (current > best) best = current;
                lastDone = dateStr;
            } else {
                if (lastDone === dateStr) {
                    total = Math.max(0, total - 1);
                    current = Math.max(0, current - 1);
                    lastDone = yesterdayStr; // Approximation
                }
            }

            // 3. Save back
            await batchWrite(spreadsheetId, [{
                range: `Streaks!A${rowIndex + 2}:E${rowIndex + 2}`,
                values: [[habitId, current, best, lastDone, total]]
            }]);
        } catch (e) {
            console.error('Streak sync failed', e);
        }
    };

    const toggleCheck = async (habitId, day) => {
        const currentVal = checks[habitId]?.[day] || false;
        const newVal = !currentVal;

        // Update local state
        setChecks(prev => ({
            ...prev,
            [habitId]: {
                ...(prev[habitId] || {}),
                [day]: newVal
            }
        }));

        try {
            // Convert habitId to row index
            const habitIdx = habits.findIndex(h => h.id === habitId);
            if (habitIdx === -1) return;

            const sheetRow = 6 + habitIdx; 
            const colLetter = colIndexToLabel(day); 

            const writeVal = newVal ? '✓' : '';
            const tabName = `${currentMonth} ${currentYear}`;

            await Promise.all([
                batchWrite(spreadsheetId, [{
                    range: `'${tabName}'!${colLetter}${sheetRow}`,
                    values: [[writeVal]]
                }]),
                updateStreakPersistence(habitId, day, newVal)
            ]);
        } catch (error) {
            toast.error('Failed to save checkmark');
            setChecks(prev => ({
                ...prev,
                [habitId]: {
                    ...(prev[habitId] || {}),
                    [day]: currentVal 
                }
            }));
        }
    };

    const updateMentalState = async (day, value) => {
        setMentalState(prev => ({ ...prev, [day]: value }));

        try {
            const colLetter = colIndexToLabel(day);
            const tabName = `${currentMonth} ${currentYear}`;
            // Assuming Mental State is around row 22 based on scaffold
            await batchWrite(spreadsheetId, [{
                range: `'${tabName}'!${colLetter}22`,
                values: [[value || '']]
            }]);
        } catch (error) {
            toast.error('Failed to save mental state');
            // Revert local state on error (this would require storing previous state or re-fetching)
            // For simplicity, not reverting mental state on error for now.
        }
    };

    const syncHabitLabels = async (newHabits) => {
        const tabName = `${currentMonth} ${currentYear}`;
        const labels = newHabits.map(h => [`${h.emoji} ${h.name}`]);
        
        // Pad labels if they are fewer than the rows we scan (6-21 = 16 rows)
        while (labels.length < 16) {
            labels.push(['']);
        }

        try {
            await batchWrite(spreadsheetId, [
                {
                    range: `'${tabName}'!A6:A21`,
                    values: labels
                },
                {
                    range: `'${tabName}'!A22`,
                    values: [['🧠 Mental State (1-10)']]
                }
            ]);
        } catch (e) {
            console.error('Failed to sync habit labels to month tab', e);
        }
    };

    const addHabit = async (habit) => {
        const newHabit = {
            ...habit,
            id: String(Date.now()),
            femaleOnly: false,
            frequency: 'Daily',
            order: habits.length + 1,
        };
        const updatedHabits = [...habits, newHabit];
        setHabits(updatedHabits);

        try {
            // 1. Update Settings tab
            const data = updatedHabits.map(h => [
                h.id, h.name, h.emoji, h.goal,
                h.category, h.femaleOnly ? 'TRUE' : 'FALSE', 'Daily', h.order,
                new Date().toISOString(), ''
            ]);
            
            await batchWrite(spreadsheetId, [{
                range: `Settings!A2:J${updatedHabits.length + 1}`,
                values: data
            }]);

            // 2. Sync month tab labels
            await syncHabitLabels(updatedHabits);
            
            toast.success(`Habit "${habit.name}" added!`);
        } catch (e) {
            toast.error('Failed to save new habit');
            loadMonthData(); // Revert
        }
    };

    const deleteHabit = async (id) => {
        const updatedHabits = habits.filter(h => h.id !== id);
        setHabits(updatedHabits);

        try {
            // 1. Clear Settings tab rows and rewrite
            const clearData = Array(20).fill(0).map(() => Array(10).fill(''));
            await batchWrite(spreadsheetId, [{
                range: `Settings!A2:J21`,
                values: clearData
            }]);

            const data = updatedHabits.map(h => [
                h.id, h.name, h.emoji, h.goal,
                h.category, h.femaleOnly ? 'TRUE' : 'FALSE', 'Daily', h.order,
                new Date().toISOString(), ''
            ]);

            await batchWrite(spreadsheetId, [{
                range: `Settings!A2:J${updatedHabits.length + 1}`,
                values: data
            }]);

            // 2. Sync month tab labels
            await syncHabitLabels(updatedHabits);

            toast.success('Habit removed');
        } catch (e) {
            toast.error('Failed to delete habit');
            loadMonthData(); // Revert
        }
    };

    const updateHabit = async (id, updates) => {
        const updatedHabits = habits.map(h => h.id === id ? { ...h, ...updates } : h);
        setHabits(updatedHabits);
        
        try {
            // Similar logic for updates if needed, for now just local + sync labels if name changed
            if (updates.name || updates.emoji) {
                await syncHabitLabels(updatedHabits);
            }
        } catch (e) {
            // Ignore for now
        }
    };

    return {
        habits,
        checks,
        mentalState,
        loading,
        saving,
        daysInMonth,
        toggleCheck,
        updateMentalState,
        addHabit,
        deleteHabit,
        updateHabit,
        reload: loadMonthData,
    };
}
