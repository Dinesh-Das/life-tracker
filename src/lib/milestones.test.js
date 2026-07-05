import { describe, it, expect } from 'vitest';
import { earnedMilestones } from './milestones';

const habits = [
    { id: 'a', name: 'Exercise', emoji: '💪' },
    { id: 'b', name: 'Reading', emoji: '📚' },
    { id: 'c', name: 'Water', emoji: '💧' },
];

describe('earnedMilestones', () => {
    it('awards the highest tier reached, sorted by tier', () => {
        const streaks = {
            a: { current: 2, best: 35 },
            b: { current: 7, best: 7 },
            c: { current: 1, best: 3 },
        };
        const res = earnedMilestones(habits, streaks);
        expect(res).toHaveLength(2);
        expect(res[0].days).toBe(30);
        expect(res[0].habitId).toBe('a');
        expect(res[1].days).toBe(7);
        expect(res[1].habitId).toBe('b');
    });

    it('returns empty without streak data', () => {
        expect(earnedMilestones(habits, {})).toEqual([]);
    });

    it('awards 100-day tier', () => {
        const res = earnedMilestones([habits[0]], { a: { current: 100, best: 120 } });
        expect(res[0].days).toBe(100);
        expect(res[0].emoji).toBe('🏆');
    });
});