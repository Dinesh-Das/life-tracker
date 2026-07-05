import { describe, it, expect } from 'vitest';
import { habitMoodCorrelations, weekdayCompletion } from './correlations';

const habit = { id: 'h1', name: 'Exercise', emoji: '💪' };

describe('habitMoodCorrelations', () => {
    it('computes averages for done vs missed days', () => {
        const checks = { h1: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false } };
        const mentalState = { 1: 8, 2: 8, 3: 8, 4: 5, 5: 5, 6: 5 };
        const res = habitMoodCorrelations([habit], checks, mentalState, 6);
        expect(res).toHaveLength(1);
        expect(res[0].doneAvg).toBe(8);
        expect(res[0].missAvg).toBe(5);
        expect(res[0].delta).toBe(3);
        expect(res[0].samples).toBe(6);
    });

    it('requires the minimum sample count on both sides', () => {
        const checks = { h1: { 1: true, 2: false } };
        const mentalState = { 1: 8, 2: 5 };
        expect(habitMoodCorrelations([habit], checks, mentalState, 2)).toHaveLength(0);
    });

    it('ignores days without a mood rating', () => {
        const checks = { h1: { 1: true, 2: true, 3: true, 4: true, 5: false, 6: false, 7: false } };
        const mentalState = { 1: 9, 2: 9, 3: 9, 5: 4, 6: 4, 7: 4 }; // day 4 done but unrated
        const res = habitMoodCorrelations([habit], checks, mentalState, 7);
        expect(res[0].doneAvg).toBe(9);
        expect(res[0].missAvg).toBe(4);
    });

    it('sorts by strongest absolute effect', () => {
        const h2 = { id: 'h2', name: 'Reading', emoji: '📚' };
        const checks = {
            h1: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false },
            h2: { 1: true, 2: true, 4: true, 3: false, 5: false, 6: false },
        };
        const mentalState = { 1: 9, 2: 9, 3: 9, 4: 3, 5: 3, 6: 3 };
        // h1: 9 vs 3 (+6). h2: (9+9+3)/3=7 vs (9+3+3)/3=5 (+2)
        const res = habitMoodCorrelations([habit, h2], checks, mentalState, 6);
        expect(res[0].habitId).toBe('h1');
        expect(res[0].delta).toBe(6);
        expect(res[1].habitId).toBe('h2');
        expect(res[1].delta).toBe(2);
    });
});

describe('weekdayCompletion', () => {
    // January 2024: the 1st was a Monday
    it('finds the best and worst weekday', () => {
        const checks = { h1: { 1: true, 8: true, 2: false, 9: false } };
        const { best, worst } = weekdayCompletion([habit], checks, 14, 2024, 0);
        expect(best.day).toBe('Monday');
        expect(best.pct).toBe(100);
        expect(worst.pct).toBe(0);
    });

    it('returns nulls with no data', () => {
        const { best, worst } = weekdayCompletion([], {}, 0, 2024, 0);
        expect(best).toBeNull();
        expect(worst).toBeNull();
    });
});