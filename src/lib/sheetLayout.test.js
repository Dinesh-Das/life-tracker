import { describe, expect, it } from 'vitest';
import { legacyLabelMatchesHabit, normalizeHabitName } from './sheetLayout';

describe('legacy habit label migration', () => {
    const habit = { name: 'Wake Up Early (5 AM)', emoji: '⏰' };

    it('matches a legacy emoji + name row by its stable name', () => {
        expect(legacyLabelMatchesHabit('⏰ Wake Up Early (5 AM)', habit)).toBe(true);
    });

    it('ignores emoji presentation selectors and surrounding whitespace', () => {
        expect(legacyLabelMatchesHabit('⏰️   Wake Up Early (5 AM) ', habit)).toBe(true);
    });

    it('does not map a different habit', () => {
        expect(legacyLabelMatchesHabit('💪 Workout / Gym', habit)).toBe(false);
    });

    it('supports old rows that contain only the habit name', () => {
        expect(normalizeHabitName('Wake Up Early (5 AM)', { legacyLabel: true }))
            .toBe(normalizeHabitName(habit.name));
    });
});
