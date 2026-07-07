import { describe, it, expect } from 'vitest';
import { computeMonthlyStats, focusMinutesForMonth } from './monthlyWrapped';

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