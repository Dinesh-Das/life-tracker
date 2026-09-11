import { describe, expect, it } from 'vitest';
import { getWeeksInMonth, normalizeWeekKey } from './dateUtils';

describe('stable planner week keys', () => {
    it('gives the August 31 week the same identity from August and September 2026', () => {
        const augustWeek = getWeeksInMonth(new Date(2026, 7, 1))[5];
        const septemberWeek = getWeeksInMonth(new Date(2026, 8, 1))[0];

        expect(augustWeek.key).toBe('week:2026-08-31');
        expect(septemberWeek.key).toBe('week:2026-08-31');
        expect(normalizeWeekKey('2026-W06-M7')).toBe('week:2026-08-31');
        expect(normalizeWeekKey('2026-W01-M8')).toBe('week:2026-08-31');
    });
});
