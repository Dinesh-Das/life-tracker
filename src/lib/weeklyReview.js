
import {
    habitTargetForWindow,
    isCompletedStatus,
    isEligibleHabitDay,
    isNeutralStatus,
    targetPacePct,
} from './habitAnalytics';

/**
 * Pure last-N-days summary computed from month-level habit data.
 * The window is clamped to the start of the month (day 1).
 */
export function buildWeeklyReview(habits, checks, mentalState, todayDay, windowSize = 7, options = {}) {
    const start = Math.max(1, todayDay - windowSize + 1);
    const days = [];
    for (let d = start; d <= todayDay; d++) days.push(d);
    if (habits.length === 0 || days.length === 0) return null;

    let done = 0;
    let possible = 0;
    const perHabit = habits.map(h => {
        let count = 0;
        let eligible = 0;
        days.forEach(d => {
            const status = checks[h.id]?.[d];
            if (isNeutralStatus(status)) return;
            const date = Number.isInteger(options.year) && Number.isInteger(options.monthIndex)
                ? new Date(options.year, options.monthIndex, d)
                : null;
            if (!isEligibleHabitDay(h, status, date, options.globalPause)) return;
            eligible++;
            possible++;
            if (isCompletedStatus(status)) {
                count++;
                done++;
            }
        });
        const target = habitTargetForWindow(h, eligible, options.daysInMonth);
        return {
            id: h.id,
            name: h.name,
            emoji: h.emoji,
            count,
            possible: eligible,
            pct: eligible > 0 ? Math.round((count / eligible) * 100) : null,
            target,
            pacePct: targetPacePct(count, target),
            shortfall: Math.max(0, target - count),
        };
    });

    const completionPct = possible > 0 ? Math.round((done / possible) * 100) : 0;

    const sorted = perHabit.filter(item => item.pacePct !== null).sort((a, b) =>
        b.pacePct - a.pacePct || b.pct - a.pct || a.name.localeCompare(b.name)
    );
    const best = sorted[0] || null;
    const worst = perHabit
        .filter(item => item.shortfall > 0 && item.id !== best?.id)
        .sort((a, b) => a.pacePct - b.pacePct || b.shortfall - a.shortfall || a.name.localeCompare(b.name))[0] || null;

    const avgMood = (ds) => {
        const vals = ds.map(d => mentalState[d]).filter(v => v !== undefined && v !== null);
        if (vals.length === 0) return null;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    };

    const prevDays = [];
    for (let d = Math.max(1, start - windowSize); d < start; d++) prevDays.push(d);

    return {
        days: days.length,
        completionPct,
        best,
        worst,
        moodAvg: avgMood(days),
        moodPrevAvg: avgMood(prevDays),
    };
}
