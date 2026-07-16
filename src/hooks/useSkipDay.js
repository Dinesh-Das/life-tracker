import { useState, useEffect, useCallback } from 'react';
import { batchWrite, readRange } from '../lib/sheetsApi';
import { skipTokensAvailable, skipTokenProgress } from '../lib/streakLogic';
import { recomputeStreaksForHabit } from '../lib/streakRecompute';
import {
    decodeCheck, MONTH_HABIT_ID_INDEX, MONTH_HABIT_START_ROW, dayColumn, monthHabitRange,
} from '../lib/sheetLayout';
import toast from 'react-hot-toast';

const TOKEN_ROW_ID = '_skipTokens';
const freezesInFlight = new Set();

function readTokenBank(rows = []) {
    let best = 0;
    let spent = 0;
    const tokenRowIndexes = [];

    rows.forEach((row, index) => {
        if (row[0] === TOKEN_ROW_ID) {
            tokenRowIndexes.push(index);
            // Older rapid clicks could create duplicate counter rows. Treat the
            // highest value as canonical instead of letting row order decide.
            spent = Math.max(spent, Number.parseInt(row[1], 10) || 0);
        } else if (row[0]) {
            best = Math.max(best, Number.parseInt(row[2], 10) || 0);
        }
    });

    return { best, spent, tokenRowIndexes };
}

export function useSkipDay(spreadsheetId, currentMonth, currentYear) {
    const [tokens, setTokens] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [used, setUsed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [skipping, setSkipping] = useState(false);

    const loadTokens = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E');
            const { best, spent } = readTokenBank(rows);
            setBestStreak(best);
            setUsed(spent);
            setTokens(skipTokensAvailable(best, spent));
        } catch (error) {
            console.error('Failed to load skip tokens', error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => { loadTokens(); }, [loadTokens]);

    const resolveRows = useCallback(async () => {
        const tabName = `${currentMonth} ${currentYear}`;
        const rows = await readRange(spreadsheetId, monthHabitRange(tabName));
        const map = new Map();
        const values = new Map();
        rows.forEach((row, index) => {
            const id = String(row?.[MONTH_HABIT_ID_INDEX] || '');
            if (id) {
                map.set(id, MONTH_HABIT_START_ROW + index);
                values.set(id, row);
            }
        });
        return { tabName, map, values };
    }, [currentMonth, currentYear, spreadsheetId]);

    const skipDay = useCallback(async (day, habits, checks) => {
        const freezeKey = `${spreadsheetId}:${currentYear}:${currentMonth}:${day}`;
        if (freezesInFlight.has(freezeKey)) return false;
        freezesInFlight.add(freezeKey);
        setSkipping(true);

        try {
            if (tokens <= 0) {
                toast.error('No skip tokens available — earn one with a 7-day streak');
                return false;
            }

            const { tabName, map, values } = await resolveRows();
            const column = dayColumn(day);
            const mappedHabits = habits.filter(habit => map.has(habit.id));

            // Use the live sheet rows, not the potentially stale UI snapshot, to
            // make a freeze idempotent before charging its token.
            const alreadyFrozen = mappedHabits.some(habit => (
                decodeCheck(values.get(habit.id)?.[day]) === 'skip'
            ));
            if (alreadyFrozen) {
                toast.success('This day is already frozen — no token used');
                return false;
            }

            const affected = mappedHabits.filter(habit => (
                checks[habit.id]?.[day] !== true && decodeCheck(values.get(habit.id)?.[day]) !== true
            ));
            if (affected.length === 0) {
                toast.success('All habits are already complete — no token used');
                return false;
            }

            const writes = affected.map(habit => ({
                range: `'${tabName}'!${column}${map.get(habit.id)}`,
                values: [['S']],
            }));

            // Revalidate the live balance just before the write. UI state can be
            // stale if another action completed while this screen was open.
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E');
            const { best, spent, tokenRowIndexes } = readTokenBank(rows);
            const available = skipTokensAvailable(best, spent);
            setBestStreak(best);
            setUsed(spent);
            setTokens(available);
            if (available <= 0) {
                toast.error('No skip tokens available — earn one with a 7-day streak');
                return false;
            }

            const nextUsed = spent + 1;
            if (tokenRowIndexes.length === 0) {
                // Keep counter creation in the same batch as the day markers so
                // one cannot save without the other.
                writes.push({
                    range: `Streaks!A${rows.length + 2}:E${rows.length + 2}`,
                    values: [[TOKEN_ROW_ID, nextUsed, '', '', '']],
                });
            } else {
                // Heal duplicate counter rows left by the old append race.
                tokenRowIndexes.forEach(index => {
                    writes.push({ range: `Streaks!B${index + 2}`, values: [[nextUsed]] });
                });
            }

            await batchWrite(spreadsheetId, writes);
            await Promise.all(affected.map(habit => recomputeStreaksForHabit(spreadsheetId, habit.id)));
            setTokens(skipTokensAvailable(best, nextUsed));
            setUsed(nextUsed);
            toast.success('Day frozen — your streaks are safe ❄️');
            return true;
        } catch (error) {
            console.error('Failed to skip day', error);
            toast.error('Failed to skip day');
            return false;
        } finally {
            freezesInFlight.delete(freezeKey);
            setSkipping(false);
        }
    }, [currentMonth, currentYear, resolveRows, spreadsheetId, tokens]);

    const repairYesterday = useCallback(async (habitId, day) => {
        try {
            const { tabName, map } = await resolveRows();
            const row = map.get(habitId);
            if (!row) throw new Error('Habit row not found');
            await batchWrite(spreadsheetId, [{
                range: `'${tabName}'!${dayColumn(day)}${row}`,
                values: [['S']],
            }]);
            await recomputeStreaksForHabit(spreadsheetId, habitId);
            toast.success('Streak repaired 💪');
            return true;
        } catch (error) {
            console.error('Failed to repair streak', error);
            toast.error('Failed to repair streak');
            return false;
        }
    }, [resolveRows, spreadsheetId]);

    return {
        tokens,
        used,
        bestStreak,
        cap: 3,
        daysToNextToken: skipTokenProgress(bestStreak),
        loading,
        skipping,
        skipDay,
        repairYesterday,
        reloadTokens: loadTokens,
    };
}
