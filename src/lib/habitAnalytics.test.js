import { describe, expect, it } from 'vitest';
import {
    buildCompletionTrend,
    elapsedDayLimit,
    isFutureDay,
    isFutureMonth,
    summarizeHabitPerformance,
} from './habitAnalytics';

const habits = [
    { id: 'first', name: 'First in list', scheduleType: 'frequency' },
    { id: 'best', name: 'Actually best', scheduleType: 'frequency' },
];

describe('calendar edit limits', () => {
    const today = new Date(2026, 7, 13);

    it('allows past and current dates but rejects future days and months', () => {
        expect(isFutureDay(2026, 7, 13, today)).toBe(false);
        expect(isFutureDay(2026, 7, 14, today)).toBe(true);
        expect(isFutureMonth(2026, 7, today)).toBe(false);
        expect(isFutureMonth(2026, 8, today)).toBe(true);
        expect(elapsedDayLimit(2026, 7, 31, today)).toBe(13);
        expect(elapsedDayLimit(2026, 8, 30, today)).toBe(0);
        expect(elapsedDayLimit(2026, 6, 31, today)).toBe(31);
    });
});

describe('summarizeHabitPerformance', () => {
    it('uses real rates for rankings and keeps frozen days neutral', () => {
        const checks = {
            first: { 1: true, 2: false, 3: false, 4: 'skip' },
            best: { 1: true, 2: true, 3: false, 4: 'skip' },
        };
        const result = summarizeHabitPerformance(habits, checks, {
            year: 2026,
            monthIndex: 7,
            daysInMonth: 31,
            upToDay: 4,
        });

        expect(result.completionPct).toBe(50);
        expect(result.top).toMatchObject({ completed: 2, eligible: 3, pct: 67 });
        expect(result.top.habit.id).toBe('best');
        expect(result.needsAttention).toMatchObject({ completed: 1, eligible: 3, missed: 2, pct: 33 });
        expect(result.needsAttention.habit.id).toBe('first');
    });

    it('excludes unscheduled days unless they contain a real legacy completion', () => {
        const mondayOnly = {
            id: 'monday',
            name: 'Monday only',
            scheduleType: 'weekdays',
            scheduleDays: [1],
        };
        // August 3, 2026 is Monday; August 4 is Tuesday.
        const result = summarizeHabitPerformance([mondayOnly], { monday: { 3: false, 4: false, 5: true } }, {
            year: 2026,
            monthIndex: 7,
            daysInMonth: 31,
            upToDay: 5,
        });
        expect(result.performance[0]).toMatchObject({ completed: 1, eligible: 2, missed: 1, pct: 50 });
    });

    it('returns no ranking when all elapsed cells are frozen', () => {
        const result = summarizeHabitPerformance(habits, { first: { 1: 'skip' }, best: { 1: 'skip' } }, {
            daysInMonth: 31,
            upToDay: 1,
        });
        expect(result).toMatchObject({ completed: 0, eligible: 0, completionPct: 0, top: null, needsAttention: null });
    });

    it('ranks flexible weekly habits against their configured cadence', () => {
        const flexible = {
            id: 'flexible',
            name: 'Three times weekly',
            scheduleType: 'frequency',
            frequency: '3x/week',
            goal: 30,
        };
        const daily = {
            id: 'daily',
            name: 'Daily habit',
            scheduleType: 'frequency',
            frequency: 'Daily',
            goal: 28,
        };
        const result = summarizeHabitPerformance([daily, flexible], {
            daily: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false },
            flexible: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false, 7: false },
        }, { daysInMonth: 28, upToDay: 7 });

        expect(result.top.habit.id).toBe('flexible');
        expect(result.top).toMatchObject({ completed: 3, eligible: 7, pct: 43, target: 3, pacePct: 100 });
        expect(result.needsAttention.habit.id).toBe('daily');
        expect(result.needsAttention).toMatchObject({ completed: 6, target: 7, pacePct: 86, shortfall: 1 });
    });

    it('prorates a monthly cadence over elapsed eligible days', () => {
        const monthly = {
            id: 'monthly',
            name: 'Monthly target',
            scheduleType: 'monthly',
            timesPerMonth: 3,
        };
        const result = summarizeHabitPerformance([monthly], { monthly: { 1: true } }, {
            daysInMonth: 30,
            upToDay: 10,
        });
        expect(result.top).toMatchObject({ completed: 1, eligible: 10, target: 1, pacePct: 100 });
        expect(result.needsAttention).toBeNull();
    });

    it('keeps vacation dates out of rankings and completion totals', () => {
        const result = summarizeHabitPerformance([habits[0]], { first: { 1: true, 2: false } }, {
            year: 2026,
            monthIndex: 7,
            daysInMonth: 31,
            upToDay: 2,
            globalPause: { from: '2026-08-02', until: '2026-08-02' },
        });
        expect(result.performance[0]).toMatchObject({ completed: 1, eligible: 1, pct: 100, pacePct: 100 });
        expect(result.needsAttention).toBeNull();
    });
});

describe('buildCompletionTrend', () => {
    it('stops at the elapsed-day limit and removes frozen cells from the denominator', () => {
        const data = buildCompletionTrend(habits, {
            first: { 1: true, 2: 'skip', 3: true },
            best: { 1: false, 2: 'skip', 3: false },
        }, { daysInMonth: 31, upToDay: 2 });
        expect(data).toEqual([
            { day: 1, completed: 1, eligible: 2, pct: 50 },
            { day: 2, completed: 0, eligible: 0, pct: 0 },
        ]);
    });

    it('renders vacation dates as neutral trend points', () => {
        const data = buildCompletionTrend([habits[0]], { first: { 1: true, 2: false } }, {
            year: 2026,
            monthIndex: 7,
            daysInMonth: 31,
            upToDay: 2,
            globalPause: { from: '2026-08-02', until: '2026-08-02' },
        });
        expect(data[1]).toEqual({ day: 2, completed: 0, eligible: 0, pct: 0 });
    });
});
