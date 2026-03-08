import { useState, useEffect, useRef, useCallback } from 'react';
import { readRange, batchWrite, colIndexToLabel } from '../lib/sheetsApi';
import { DEFAULT_HABITS } from '../lib/constants';
import { getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';

export function useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex) {
    const [habits, setHabits] = useState([]);
    const [checks, setChecks] = useState({});
    const [mentalState, setMentalState] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Buffer for debounced writes
    const pendingWrites = useRef({});
    const batchTimer = useRef(null);

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
            const lastCol = colIndexToLabel(daysInMonth); // e.g., 'AF' for 31 days
            const monthRows = await readRange(spreadsheetId, `${currentMonth}!B6:${lastCol}20`); // Read more rows to cover potential habits

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
            const mentalRowData = await readRange(spreadsheetId, `${currentMonth}!B22:${lastCol}22`);
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
    }, [spreadsheetId, currentMonth, daysInMonth]);

    useEffect(() => {
        loadMonthData();
    }, [loadMonthData]);

    const queueWrite = (range, value) => {
        pendingWrites.current[range] = value;
        setSaving(true);

        if (batchTimer.current) clearTimeout(batchTimer.current);

        batchTimer.current = setTimeout(async () => {
            const data = Object.entries(pendingWrites.current).map(([r, val]) => ({
                range: r,
                values: [[val]]
            }));
            pendingWrites.current = {};

            try {
                await batchWrite(spreadsheetId, data);
            } catch (error) {
                toast.error('Failed to save changes');
            } finally {
                setSaving(false);
            }
        }, 300);
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

            const sheetRow = 6 + habitIdx; // Data starts at row 6. Habit 1 is row 6.
            const colLetter = colIndexToLabel(day); // day 1 -> col B (index 1)

            // Write human-readable checkmark or clear it
            const writeVal = newVal ? '✓' : '';

            await batchWrite(spreadsheetId, [{
                range: `${currentMonth}!${colLetter}${sheetRow}`,
                values: [[writeVal]]
            }]);
        } catch (error) {
            toast.error('Failed to save checkmark');
            // Revert local state on error
            setChecks(prev => ({
                ...prev,
                [habitId]: {
                    ...(prev[habitId] || {}),
                    [day]: currentVal // Revert to previous value
                }
            }));
        }
    };

    const updateMentalState = async (day, value) => {
        setMentalState(prev => ({ ...prev, [day]: value }));

        try {
            const colLetter = colIndexToLabel(day);
            // Assuming Mental State is around row 22 based on scaffold
            await batchWrite(spreadsheetId, [{
                range: `${currentMonth}!${colLetter}22`,
                values: [[value || '']]
            }]);
        } catch (error) {
            toast.error('Failed to save mental state');
            // Revert local state on error (this would require storing previous state or re-fetching)
            // For simplicity, not reverting mental state on error for now.
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
        setHabits(prev => [...prev, newHabit]);

        // Write to Settings tab
        try {
            const rowIdx = habits.length + 2; // +2 because row 1 is header, rows start at 2
            await batchWrite(spreadsheetId, [{
                range: `Settings!A${rowIdx}:J${rowIdx}`,
                values: [[
                    newHabit.id, newHabit.name, newHabit.emoji, newHabit.goal,
                    newHabit.category, 'FALSE', 'Daily', newHabit.order,
                    new Date().toISOString(), ''
                ]]
            }]);
            toast.success(`Habit "${habit.name}" added!`);
        } catch (e) {
            toast.error('Failed to save new habit');
        }
    };

    const deleteHabit = (id) => {
        setHabits(prev => prev.filter(h => h.id !== id));
        toast.success('Habit removed');
    };

    const updateHabit = (id, updates) => {
        setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
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
