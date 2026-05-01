import { useMemo } from 'react';


/**
 * Hook to calculate streaks from habit checks.
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

            // 1. Calculate Best Streak in current month
            for (let d = 1; d <= 31; d++) {
                if (habitChecks[d]) {
                    tempStreak++;
                    if (tempStreak > best) best = tempStreak;
                } else {
                    tempStreak = 0;
                }
            }

            // 2. Calculate Current Streak (counting backwards from today)
            // If today is checked, start from today. If not, check if yesterday was.
            let d = todayDay;
            if (habitChecks[d]) {
                while (d > 0 && habitChecks[d]) {
                    current++;
                    d--;
                }
            } else if (habitChecks[d - 1]) {
                d = todayDay - 1;
                while (d > 0 && habitChecks[d]) {
                    current++;
                    d--;
                }
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
