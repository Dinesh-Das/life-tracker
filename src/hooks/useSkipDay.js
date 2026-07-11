import { useState, useEffect, useCallback } from 'react';
import { appendRows, batchWrite, readRange } from '../lib/sheetsApi';
import { skipTokensAvailable, skipTokenProgress } from '../lib/streakLogic';
import { recomputeStreaksForHabit } from '../lib/streakRecompute';
import { MONTH_HABIT_ID_INDEX, MONTH_HABIT_START_ROW, dayColumn, monthHabitRange } from '../lib/sheetLayout';
import toast from 'react-hot-toast';

const TOKEN_ROW_ID = '_skipTokens';

export function useSkipDay(spreadsheetId, currentMonth, currentYear) {
    const [tokens, setTokens] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [used, setUsed] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadTokens = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E');
            let best = 0;
            let spent = 0;
            rows.forEach(row => {
                if (row[0] === TOKEN_ROW_ID) spent = Number.parseInt(row[1], 10) || 0;
                else if (row[0]) best = Math.max(best, Number.parseInt(row[2], 10) || 0);
            });
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
        rows.forEach((row, index) => {
            const id = String(row?.[MONTH_HABIT_ID_INDEX] || '');
            if (id) map.set(id, MONTH_HABIT_START_ROW + index);
        });
        return { tabName, map };
    }, [currentMonth, currentYear, spreadsheetId]);

    const skipDay = useCallback(async (day, habits, checks) => {
        if (tokens <= 0) {
            toast.error('No skip tokens available — earn one with a 7-day streak');
            return false;
        }
        try {
            const { tabName, map } = await resolveRows();
            const column = dayColumn(day);
            const affected = habits.filter(habit => checks[habit.id]?.[day] !== true && map.has(habit.id));
            const writes = affected.map(habit => ({
                range: `'${tabName}'!${column}${map.get(habit.id)}`,
                values: [['S']],
            }));
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E');
            const tokenIndex = rows.findIndex(row => row[0] === TOKEN_ROW_ID);
            const nextUsed = tokenIndex === -1 ? 1 : (Number.parseInt(rows[tokenIndex][1], 10) || 0) + 1;
            if (tokenIndex === -1) {
                await appendRows(spreadsheetId, 'Streaks!A:E', [[TOKEN_ROW_ID, nextUsed, '', '', '']]);
            } else {
                writes.push({ range: `Streaks!B${tokenIndex + 2}`, values: [[nextUsed]] });
            }
            if (writes.length) await batchWrite(spreadsheetId, writes);
            await Promise.all(affected.map(habit => recomputeStreaksForHabit(spreadsheetId, habit.id)));
            setTokens(value => Math.max(0, value - 1));
            setUsed(value => value + 1);
            toast.success('Day frozen — your streaks are safe ❄️');
            return true;
        } catch (error) {
            console.error('Failed to skip day', error);
            toast.error('Failed to skip day');
            return false;
        }
    }, [resolveRows, spreadsheetId, tokens]);

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
        skipDay,
        repairYesterday,
        reloadTokens: loadTokens,
    };
}
