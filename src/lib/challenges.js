import {
    isCompletedStatus,
    isEligibleHabitDay,
    summarizeHabitPerformance,
} from './habitAnalytics';

/**
 * Monthly challenges computed from this month's checks.
 * Frozen, paused, and unscheduled cells are neutral throughout.
 */
export function monthlyChallenges(habits, checks, daysInMonth, upToDay, options = {}) {
    const list = [];
    if (!habits || habits.length === 0 || !upToDay) return list;
    const limit = Math.max(0, Math.min(daysInMonth, upToDay));

    const eligibleStatuses = (d) => {
        const date = Number.isInteger(options.year) && Number.isInteger(options.monthIndex)
            ? new Date(options.year, options.monthIndex, d)
            : null;
        return habits.flatMap(habit => {
            const status = checks[habit.id]?.[d];
            return isEligibleHabitDay(habit, status, date, options.globalPause) ? [status] : [];
        });
    };

    const dayComplete = (d) => {
        const statuses = eligibleStatuses(d);
        if (statuses.length === 0) return null;
        return statuses.every(isCompletedStatus);
    };

    // Perfect Week — seven completed active days without an eligible miss.
    // A fully neutral calendar day neither advances nor breaks the run.
    let run = 0;
    let bestRun = 0;
    for (let d = 1; d <= limit; d++) {
        const complete = dayComplete(d);
        if (complete === null) continue;
        run = complete ? run + 1 : 0;
        if (run > bestRun) bestRun = run;
    }
    list.push({
        id: 'perfect_week', emoji: '🏅', label: 'Perfect Week',
        desc: '7 consecutive active days with every scheduled habit done',
        progress: Math.min(bestRun, 7), target: 7, achieved: bestRun >= 7,
    });

    // Consistency 80 — hold ≥80% overall completion
    const { performance } = summarizeHabitPerformance(habits, checks, {
        ...options,
        daysInMonth,
        upToDay: limit,
    });
    const target = performance.reduce((sum, item) => sum + item.target, 0);
    const progress = performance.reduce((sum, item) => sum + Math.min(item.completed, item.target), 0);
    const pct = target > 0 ? Math.round((progress / target) * 100) : 0;
    list.push({
        id: 'consistency_80', emoji: '🎯', label: 'Consistency 80',
        desc: 'Hold 80%+ completion all month',
        progress: pct, target: 80, achieved: pct >= 80,
        note: `${pct}% so far`,
    });

    // Iron Habit — keep at least one habit unbroken all month
    const iron = habits.filter(h => {
        let eligible = 0;
        for (let d = 1; d <= limit; d++) {
            const status = checks[h.id]?.[d];
            const date = Number.isInteger(options.year) && Number.isInteger(options.monthIndex)
                ? new Date(options.year, options.monthIndex, d)
                : null;
            if (!isEligibleHabitDay(h, status, date, options.globalPause)) continue;
            eligible++;
            if (!isCompletedStatus(status)) return false;
        }
        return eligible > 0;
    });
    list.push({
        id: 'iron_habit', emoji: '🛡️', label: 'Iron Habit',
        desc: 'Keep one habit unbroken all month',
        progress: iron.length > 0 ? 1 : 0, target: 1, achieved: iron.length > 0,
        note: iron.length > 0 ? `${iron.length} unbroken` : 'none unbroken yet',
    });

    return list;
}
