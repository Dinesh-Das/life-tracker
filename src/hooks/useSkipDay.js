import { useState, useEffect, useCallback } from 'react';
import { readRange, batchWrite, colIndexToLabel } from '../lib/sheetsApi';
import { skipTokensAvailable, skipTokenProgress } from '../lib/streakLogic';
import toast from 'react-hot-toast';

const TOKEN_ROW_ID = '_skipTokens';

/**
 * Skip Day (streak freeze) + streak recovery.
 *
 * Tokens are earned through consistency — one per full 7-day best streak —
 * and capped at 3 so they can't be hoarded. Spent tokens are tracked in a
 * dedicated `_skipTokens` row of the Streaks tab.
 * Skipping writes 'S' into the month-tab cell of every not-yet-completed habit
 * for that day; streak logic treats 'S' as bridging (streak safe, not counted).
 */
export function useSkipDay(spreadsheetId, currentMonth, currentYear) {
    const [tokens, setTokens] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [used, setUsed] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadTokens = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E50');
            let best = 0;
            let used = 0;
            rows.forEach(r => {
                if (r[0] === TOKEN_ROW_ID) {
                    used = parseInt(r[1]) || 0;
                } else if (r[0]) {
                    best = Math.max(best, parseInt(r[2]) || 0);
                }
            });
            setBestStreak(best);
            setUsed(used);
            setTokens(skipTokensAvailable(best, used));
        } catch (e) {
            console.error('Failed to load skip tokens', e);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => { loadTokens(); }, [loadTokens]);

    /**
     * Freeze a whole day: every habit not completed gets an 'S' mark.
     * @param {number} day       day of month
     * @param {Array}  habits    FULL habit list (sheet row order, unfiltered)
     * @param {Object} checks    checks map from useHabits
     */
    const skipDay = useCallback(async (day, habits, checks) => {
        if (tokens <= 0) {
            toast.error('No skip tokens available — earn one with a 7-day streak');
            return false;
        }
        try {
            const tabName = `${currentMonth} ${currentYear}`;
            const col = colIndexToLabel(day);
            const writes = [];
            habits.forEach((habit, idx) => {
                if (checks[habit.id]?.[day] !== true) {
                    writes.push({ range: `'${tabName}'!${col}${6 + idx}`, values: [['S']] });
                }
            });

            // Spend a token
            const rows = await readRange(spreadsheetId, 'Streaks!A2:E50');
            let rowIndex = rows.findIndex(r => r[0] === TOKEN_ROW_ID);
            const used = rowIndex !== -1 ? (parseInt(rows[rowIndex][1]) || 0) + 1 : 1;
            if (rowIndex === -1) rowIndex = rows.length;
            writes.push({ range: `Streaks!A${rowIndex + 2}:B${rowIndex + 2}`, values: [[TOKEN_ROW_ID, used]] });

            await batchWrite(spreadsheetId, writes);
            setTokens(t => Math.max(0, t - 1));
            setUsed(u => u + 1);
            toast.success('Day frozen — your streaks are safe ❄️');
            return true;
        } catch (e) {
            console.error('Failed to skip day', e);
            toast.error('Failed to skip day');
            return false;
        }
    }, [spreadsheetId, currentMonth, currentYear, tokens]);

    /**
     * Streak recovery: after completing the habit today, mark yesterday's
     * single miss as a skip so the streak survives. No token required —
     * the "price" is doing the habit today, right after the miss.
     * @param {number} habitIdx index of the habit in the FULL list (sheet row order)
     * @param {number} day      the missed day of month (yesterday)
     */
    const repairYesterday = useCallback(async (habitIdx, day) => {
        try {
            const tabName = `${currentMonth} ${currentYear}`;
            const col = colIndexToLabel(day);
            await batchWrite(spreadsheetId, [{ range: `'${tabName}'!${col}${6 + habitIdx}`, values: [['S']] }]);
            toast.success('Streak repaired 💪');
            return true;
        } catch (e) {
            console.error('Failed to repair streak', e);
            toast.error('Failed to repair streak');
            return false;
        }
    }, [spreadsheetId, currentMonth, currentYear]);

    return {
        tokens,
        used,
        bestStreak,
        cap: 3, // mirrors skipTokensAvailable's default cap
        daysToNextToken: skipTokenProgress(bestStreak),
        loading,
        skipDay,
        repairYesterday,
        reloadTokens: loadTokens,
    };
}