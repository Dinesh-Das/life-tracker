import { useMemo } from 'react';


/**
 * Hook to calculate streaks from habit checks.
 * Check values may be:
 *   true   — habit completed that day
 *   'skip' — day was frozen with a skip token (bridges the streak,
 *            but does not increment it)
 *   falsy  — not completed
 */
export function useStreaks(habits, checks) {
    const habitStreaks = useMemo(() => {
        const streaks = {};
        const todayDay = new Date().getDate();

        habits.forEach(habit => {
            const habitChecks = checks[habit.id] || {};
            let current = 0;
            let best = 0;
            let tempStreak = 0;

            // 1. Calculate Best Streak in current month.
            // Skip days keep the run alive without adding to it.
            for (let d = 1; d <= 31; d++) {
                if (habitChecks[d] === true) { 
                    tempStreak++;
                    if (tempStreak > best) best = tempStreak;
                } else if (habitChecks[d] === 'skip') {
                    // bridge — keep tempStreak as-is
                } else {
                    tempStreak = 0;
                }
            }

            // 2. Calculate Current Streak (counting backwards from today)
            const active = (d) => habitChecks[d] === true || habitChecks[d] === 'skip';
            let d = todayDay;
             if (!active(d)) d = todayDay - 1; // today not logged yet — try yesterday
            while (d > 0 && active(d)) {
                if (habitChecks[d] === true) current++;
                d--;
            }

            streaks[habit.id] = { current, best };
        });

        return streaks;
    }, [habits, checks]);

    const overallStreak = useMemo(() => {
        // Count how many consecutive days any habit was completed
        // For simplicity, we'll return the max of habit streaks
        return Math.max(...Object.values(habitStreaks).map(s => s.current), 0);
    }, [habitStreaks]);

    return { habitStreaks, overallStreak };
}
