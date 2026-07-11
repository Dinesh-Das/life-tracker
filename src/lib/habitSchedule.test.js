import { describe, expect, it } from 'vitest';
import { forecastHabit, isHabitScheduledForDate } from './habitSchedule';

describe('habit scheduling', () => {
    it('supports selected weekdays and pause ranges', () => {
        const habit = { scheduleType: 'weekdays', scheduleDays: [1, 3, 5], pausedFrom: '2026-07-08', pausedUntil: '2026-07-09' };
        expect(isHabitScheduledForDate(habit, '2026-07-06')).toBe(true);
        expect(isHabitScheduledForDate(habit, '2026-07-07')).toBe(false);
        expect(isHabitScheduledForDate(habit, '2026-07-08')).toBe(false);
    });

    it('forecasts monthly goal pace', () => {
        const result = forecastHabit({ goal: 20 }, { 1: true, 2: true, 3: true, 4: true, 5: true }, new Date(2026, 6, 10), 31);
        expect(result.projected).toBe(16);
        expect(result.status).toBe('at-risk');
    });
});
