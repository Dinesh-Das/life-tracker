import { describe, it, expect } from 'vitest';
import { computeMonthlyStats, extractMonthlyInputs, focusMinutesForMonth } from './monthlyWrapped';

const labels = ['💪 Workout', '📚 Read', '🧠 Mental State (1-10)'];
const habitRows = [
    ['✓', '✓', '', '✓'], // Workout: days 1, 2, 4
    ['✓', '', '', ''],   // Read: day 1
];
const mentalRow = [7, 8, '', 5];

describe('computeMonthlyStats', () => {
    it('computes totals, best day, top habit and mood', () => {
        const s = computeMonthlyStats({ labels, habitRows, mentalRow, upToDay: 4 });
        expect(s.totalCompleted).toBe(4);
        expect(s.completionPct).toBe(50); // 4 of 8 possible
        expect(s.bestDay).toEqual({ day: 1, count: 2 });
        expect(s.topHabit).toEqual({ name: '💪 Workout', done: 3 });
        expect(s.avgMood).toBe(6.7); // (7 + 8 + 5) / 3
    });

    it('ignores the mental-state row and empty labels', () => {
        const s = computeMonthlyStats({ labels: ['', ...labels], habitRows: [[], ...habitRows], mentalRow, upToDay: 4 });
        expect(s.totalCompleted).toBe(4);
    });

    it('excludes future days via upToDay', () => {
        const s = computeMonthlyStats({ labels, habitRows, mentalRow, upToDay: 2 });
        expect(s.totalCompleted).toBe(3);
        expect(s.completionPct).toBe(75);
    });

    it('handles empty months gracefully', () => {
        const s = computeMonthlyStats({ labels: [], habitRows: [], mentalRow: [], upToDay: 0 });
        expect(s.totalCompleted).toBe(0);
        expect(s.completionPct).toBe(0);
        expect(s.bestDay).toBeNull();
        expect(s.topHabit).toBeNull();
        expect(s.avgMood).toBeNull();
    });
});

describe('focusMinutesForMonth', () => {
    it('sums WORK minutes for the given month only', () => {
        const rows = [
            ['2026-07-01', '09:00', 25, 'WORK'],
            ['2026-07-02', '10:00', 25, 'WORK'],
            ['2026-07-02', '11:00', 5, 'SHORT'],
            ['2026-06-30', '09:00', 25, 'WORK'],
        ];
        expect(focusMinutesForMonth(rows, 2026, 6)).toBe(50);
    });

    it('handles missing data', () => {
        expect(focusMinutesForMonth([], 2026, 6)).toBe(0);
        expect(focusMinutesForMonth([null, ['']], 2026, 6)).toBe(0);
    });
});

describe('extractMonthlyInputs', () => {
    it('keeps all habits beyond the legacy 15-row boundary', () => {
        const monthRows = Array.from({ length: 50 }, (_, index) => [
            `Habit ${index + 1}`, true, ...Array(30).fill(''), `habit_${index + 1}`,
        ]);
        const result = extractMonthlyInputs(monthRows, [], 2026, 6);
        expect(result.labels).toHaveLength(50);
        expect(result.habitRows).toHaveLength(50);
    });

    it('prefers DailyState and falls back to a legacy mental row at any position', () => {
        const monthRows = [
            ['Habit 1', true],
            ['Mental State (1-10)', 5, 6, 7],
            ['Habit 2', '', true],
        ];
        const result = extractMonthlyInputs(monthRows, [['2026-07-02', 9]], 2026, 6);
        expect(result.labels).toEqual(['Habit 1', 'Habit 2']);
        expect(result.mentalRow.slice(0, 3)).toEqual([5, 9, 7]);
    });
});
