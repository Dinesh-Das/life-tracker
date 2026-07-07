import { describe, it, expect } from 'vitest';
import { tiersForHabit, earnedMilestones, tierEmoji } from './milestones';

describe('custom milestone tiers', () => {
    it('falls back to the default 7/30/100 tiers', () => {
        expect(tiersForHabit('h1', {})).toEqual([
            { days: 100, emoji: '🏆', label: '100-Day Streak' },
            { days: 30, emoji: '🥇', label: '30-Day Streak' },
            { days: 7, emoji: '🔥', label: '7-Day Streak' },
        ]);
    });

    it('uses custom tiers when defined, highest first', () => {
        expect(tiersForHabit('h1', { h1: [5, 21, 50] }).map(t => t.days)).toEqual([50, 21, 5]);
    });

    it('awards the highest reached custom tier', () => {
        const habits = [{ id: 'h1', name: 'Read', emoji: '📚' }];
        const earned = earnedMilestones(habits, { h1: { best: 23 } }, { h1: [5, 21, 50] });
        expect(earned).toHaveLength(1);
        expect(earned[0].days).toBe(21);
        expect(earned[0].tierLabel).toBe('21-Day Streak');
    });

    it('awards nothing below the lowest tier', () => {
        const habits = [{ id: 'h1', name: 'Read', emoji: '📚' }];
        expect(earnedMilestones(habits, { h1: { best: 4 } }, { h1: [5, 21] })).toHaveLength(0);
    });

    it('assigns emoji by tier size', () => {
        expect(tierEmoji(150)).toBe('🏆');
        expect(tierEmoji(30)).toBe('🥇');
        expect(tierEmoji(5)).toBe('🔥');
    });
});