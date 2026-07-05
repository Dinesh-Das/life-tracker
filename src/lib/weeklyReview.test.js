import { describe, it, expect } from 'vitest';
import { buildWeeklyReview } from './weeklyReview';

const habits = [
    { id: 'a', name: 'Exercise', emoji: '💪' },
    { id: 'b', name: 'Reading', emoji: '📚' },
];

describe('buildWeeklyReview', () => {
    it('summarizes the last 7 days', () => {
        const checks = {
            a: { 8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true }, // 7/7
            b: { 8: true, 9: true, 10: false },                                        // 2/7
        };
        const mentalState = { 8: 6, 9: 7, 10: 8 };
        const r = buildWeeklyReview(habits, checks, mentalState, 14);
        expect(r.days).toBe(7);
        expect(r.completionPct).toBe(64); // 9 done of 14 possible
        expect(r.best.id).toBe('a');
        expect(r.worst.id).toBe('b');
        expect(r.moodAvg).toBe(7);
    });

    it('clamps the window at the start of the month', () => {
        const checks = { a: { 1: true, 2: true }, b: {} };
        const r = buildWeeklyReview(habits, checks, {}, 3);
        expect(r.days).toBe(3);
        expect(r.completionPct).toBe(33); // 2 of 6
    });

    it('returns null with no habits', () => {
        expect(buildWeeklyReview([], {}, {}, 10)).toBeNull();
    });

    it('compares mood against the previous window', () => {
        const mentalState = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 8, 9: 8, 10: 8, 11: 8, 12: 8, 13: 8, 14: 8 };
        const r = buildWeeklyReview(habits, {}, mentalState, 14);
        expect(r.moodAvg).toBe(8);
        expect(r.moodPrevAvg).toBe(4);
    });

    it('hides the worst habit when there is only one habit', () => {
        const r = buildWeeklyReview([habits[0]], { a: { 14: true } }, {}, 14);
        expect(r.worst).toBeNull();
    });
});