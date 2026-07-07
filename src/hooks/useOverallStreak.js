import { useState, useEffect } from 'react';
import { readRange } from '../lib/sheetsApi';
import { differenceInCalendarDays } from 'date-fns';

// Module-level cache so the badge doesn't refetch on every route
// change (the sidebar remounts with each page navigation).
let cache = { key: null, value: 0, ts: 0 };
const TTL_MS = 60 * 1000;

/**
 * Overall current streak — the max "current" streak across all habits,
 * read from the persisted Streaks sheet (A: habitId, B: current,
 * C: best, D: lastDone, E: total).
 *
 * A streak only counts as alive when its last completion was today
 * or yesterday; otherwise the persisted value is stale and ignored.
 */
export function useOverallStreak(spreadsheetId) {
    const [streak, setStreak] = useState(() =>
        cache.key === spreadsheetId ? cache.value : 0
    );

    useEffect(() => {
        if (!spreadsheetId) return;
        if (cache.key === spreadsheetId && Date.now() - cache.ts < TTL_MS) {
            setStreak(cache.value);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const rows = await readRange(spreadsheetId, 'Streaks!A2:E50');
                const overall = (rows || []).reduce((max, row) => {
                    const current = parseInt(row?.[1]) || 0;
                    const lastDone = row?.[3];
                    if (!current || !lastDone) return max;
                    const diff = differenceInCalendarDays(
                        new Date(),
                        new Date(`${lastDone}T00:00:00`)
                    );
                    // Alive only if last completion was today or yesterday
                    if (diff > 1 || diff < 0) return max;
                    return Math.max(max, current);
                }, 0);
                cache = { key: spreadsheetId, value: overall, ts: Date.now() };
                if (!cancelled) setStreak(overall);
            } catch {
                // Fail quietly — the badge simply hides when streak is 0
                if (!cancelled) setStreak(0);
            }
        })();
        return () => { cancelled = true; };
    }, [spreadsheetId]);

    return streak;
}