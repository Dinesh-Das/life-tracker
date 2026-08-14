import { isHabitScheduledForDate } from './habitSchedule';
import { weeklyTarget } from './frequency';

/** A real completion is always the boolean `true`; frozen days are neutral. */
export const isCompletedStatus = status => status === true;
export const isNeutralStatus = status => status === 'skip';

/** Whether a calendar month is later than the month containing `today`. */
export function isFutureMonth(year, monthIndex, today = new Date()) {
    if (year !== today.getFullYear()) return year > today.getFullYear();
    return monthIndex > today.getMonth();
}

/** Whether an individual calendar date is later than `today`. */
export function isFutureDay(year, monthIndex, day, today = new Date()) {
    const candidate = new Date(year, monthIndex, day);
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return candidate > current;
}

/** Last elapsed day for a month: all past days, today, or zero for the future. */
export function elapsedDayLimit(year, monthIndex, daysInMonth, today = new Date()) {
    if (isFutureMonth(year, monthIndex, today)) return 0;
    if (year === today.getFullYear() && monthIndex === today.getMonth()) {
        return Math.min(daysInMonth, today.getDate());
    }
    return daysInMonth;
}

/**
 * A frozen day never enters either side of a completion rate. Unscheduled
 * days are also neutral, while a real completion is preserved even if the
 * habit's schedule was changed later.
 */
export function isEligibleHabitDay(habit, status, date, globalPause = null) {
    if (isNeutralStatus(status)) return false;
    if (!date) return true;
    return isCompletedStatus(status) || isHabitScheduledForDate(habit, date, globalPause);
}

/**
 * Completion target for an elapsed analytics window. Flexible cadence habits
 * are measured against their configured pace instead of every calendar cell:
 * a 3x/week habit needs three completions per seven eligible days, while a
 * monthly habit is prorated over the elapsed, non-neutral portion of a month.
 */
export function habitTargetForWindow(habit, eligible, daysInMonth = 31) {
    if (eligible <= 0) return 0;

    if (habit.scheduleType === 'monthly') {
        const target = Number(habit.timesPerMonth || habit.goal);
        return Number.isFinite(target) && target > 0
            ? (target * eligible) / Math.max(1, daysInMonth)
            : eligible;
    }

    if (habit.scheduleType === 'frequency') {
        if (habit.frequency && habit.frequency !== 'Daily') {
            return (weeklyTarget(habit.frequency) * eligible) / 7;
        }
        const monthlyGoal = Number(habit.goal);
        if (Number.isFinite(monthlyGoal) && monthlyGoal > 0) {
            return (monthlyGoal * eligible) / Math.max(1, daysInMonth);
        }
    }

    return eligible;
}

export function targetPacePct(completed, target) {
    if (!(target > 0)) return null;
    return Math.min(100, Math.round((completed / target) * 100));
}

/**
 * Real, comparable completion summaries for the elapsed portion of a month.
 * Returned rankings are based on configured target pace, not array order.
 */
export function summarizeHabitPerformance(
    habits = [],
    checks = {},
    { year, monthIndex, daysInMonth = 31, upToDay = daysInMonth, globalPause = null } = {},
) {
    const limit = Math.max(0, Math.min(daysInMonth, upToDay));
    const performance = habits.map(habit => {
        let completed = 0;
        let eligible = 0;
        let frozen = 0;

        for (let day = 1; day <= limit; day++) {
            const status = checks[habit.id]?.[day];
            if (isNeutralStatus(status)) {
                frozen++;
                continue;
            }
            const date = Number.isInteger(year) && Number.isInteger(monthIndex)
                ? new Date(year, monthIndex, day)
                : null;
            if (!isEligibleHabitDay(habit, status, date, globalPause)) continue;
            eligible++;
            if (isCompletedStatus(status)) completed++;
        }

        return {
            habit,
            completed,
            eligible,
            frozen,
            missed: Math.max(0, eligible - completed),
            pct: eligible > 0 ? Math.round((completed / eligible) * 100) : null,
            target: habitTargetForWindow(habit, eligible, daysInMonth),
        };
    });

    performance.forEach(item => {
        item.pacePct = targetPacePct(item.completed, item.target);
        item.shortfall = Math.max(0, item.target - item.completed);
    });

    const ranked = performance
        .filter(item => item.pacePct !== null)
        .sort((a, b) => b.pacePct - a.pacePct || b.pct - a.pct || a.habit.name.localeCompare(b.habit.name));
    const needsAttention = performance
        .filter(item => item.shortfall > 0)
        .sort((a, b) => a.pacePct - b.pacePct || b.shortfall - a.shortfall || a.habit.name.localeCompare(b.habit.name))[0] || null;
    const completed = performance.reduce((sum, item) => sum + item.completed, 0);
    const eligible = performance.reduce((sum, item) => sum + item.eligible, 0);

    return {
        performance,
        completed,
        eligible,
        completionPct: eligible > 0 ? Math.round((completed / eligible) * 100) : 0,
        top: ranked[0] || null,
        needsAttention,
    };
}

export function buildCompletionTrend(
    habits = [],
    checks = {},
    { year, monthIndex, daysInMonth = 31, upToDay = daysInMonth, globalPause = null } = {},
) {
    const limit = Math.max(0, Math.min(daysInMonth, upToDay));
    return Array.from({ length: limit }, (_, index) => {
        const day = index + 1;
        let completed = 0;
        let eligible = 0;
        const date = Number.isInteger(year) && Number.isInteger(monthIndex)
            ? new Date(year, monthIndex, day)
            : null;

        habits.forEach(habit => {
            const status = checks[habit.id]?.[day];
            if (!isEligibleHabitDay(habit, status, date, globalPause)) return;
            eligible++;
            if (isCompletedStatus(status)) completed++;
        });

        return {
            day,
            completed,
            eligible,
            pct: eligible > 0 ? Math.round((completed / eligible) * 100) : 0,
        };
    });
}
