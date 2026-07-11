import { describe, expect, it } from 'vitest';
import { HABIT_COLUMNS, parseHabitRow, serializeHabit } from './habitSchema';

describe('habit schema v3', () => {
    it('keeps legacy 14-column rows readable', () => {
        const habit = parseHabitRow(['habit_1', 'Walk', '🚶', 20, 'Health', false, 'Daily', 1, '2026-01-01', '', false, '2026-01-01', '', '2026-01-01'], 0, 2);
        expect(habit.id).toBe('habit_1');
        expect(habit.scheduleType).toBe('frequency');
        expect(habit.scheduleDays).toEqual([]);
    });

    it('round-trips advanced schedules on the stable ID record', () => {
        const row = serializeHabit({ id: 'stable', name: 'Gym', goal: 12, scheduleType: 'weekdays', scheduleDays: [1, 3, 5], pausedFrom: '2026-08-01', pausedUntil: '2026-08-07', routine: 'Fitness', tags: ['gym', 'health'] });
        expect(row).toHaveLength(HABIT_COLUMNS);
        const parsed = parseHabitRow(row);
        expect(parsed.id).toBe('stable');
        expect(parsed.scheduleDays).toEqual([1, 3, 5]);
        expect(parsed.routine).toBe('Fitness');
        expect(parsed.tags).toEqual(['gym', 'health']);
    });
});
