import { describe, expect, it } from 'vitest';
import {
    aggregationDayLimit,
    monthHasRecordedActivity,
    monthTabSources,
    mergeMonthHabitRows,
} from './yearlyRows';
import { computeStreaks } from './streakLogic';

describe('monthTabSources', () => {
    it('includes both legacy and year-suffixed tabs for the current year', () => {
        expect(monthTabSources(['Jul', 'Jul 2026'], 2026, 2026)).toEqual([
            { month: 'Jul', title: 'Jul 2026' },
            { month: 'Jul', title: 'Jul' },
        ]);
    });

    it('does not leak legacy tabs into another year', () => {
        expect(monthTabSources(['Jul', 'Jul 2025'], 2025, 2026)).toEqual([
            { month: 'Jul', title: 'Jul 2025' },
        ]);
    });
});

describe('mergeMonthHabitRows', () => {
    it('unions old and new rows without double-counting overlapping days', () => {
        const habit = { id: 'h1', name: 'Wake early' };
        const mappings = [
            { month: 'Jul', title: 'Jul 2026' },
            { month: 'Jul', title: 'Jul' },
        ];
        const responses = [
            { values: [['Wake early', '', true, '', '', 'h1']] },
            { values: [['Wake early', true, true, true, '', 'h1']] },
        ];
        const merged = mergeMonthHabitRows(mappings, responses, () => habit).get('Jul');
        expect(merged).toHaveLength(1);
        expect(merged[0].statuses[1]).toBe(true);
        expect(merged[0].statuses[2]).toBe(true);
        expect(merged[0].statuses[3]).toBe(true);
    });

    it('preserves a streak split across legacy and year-suffixed tabs', () => {
        const habit = { id: 'h1', name: 'Wake early' };
        const oldRow = Array(33).fill('');
        const newRow = Array(33).fill('');
        for (let day = 1; day <= 15; day++) oldRow[day] = true;
        for (let day = 16; day <= 22; day++) newRow[day] = true;

        const merged = mergeMonthHabitRows(
            [{ month: 'Jul', title: 'Jul' }, { month: 'Jul', title: 'Jul 2026' }],
            [{ values: [oldRow] }, { values: [newRow] }],
            () => habit
        ).get('Jul')[0];
        const doneDates = Object.entries(merged.statuses)
            .filter(([, status]) => status === true)
            .map(([day]) => `2026-07-${String(day).padStart(2, '0')}`);

        expect(computeStreaks(doneDates, '2026-07-22').best).toBe(22);
    });
});

describe('year boundaries', () => {
    const now = new Date(2026, 6, 22, 12);

    it('uses every day in past months, today in the current month, and no future days', () => {
        expect(aggregationDayLimit(2026, 5, now)).toBe(30);
        expect(aggregationDayLimit(2026, 6, now)).toBe(22);
        expect(aggregationDayLimit(2026, 7, now)).toBe(0);
        expect(aggregationDayLimit(2025, 11, now)).toBe(31);
    });

    it('marks only months with recorded completions as active', () => {
        expect(monthHasRecordedActivity(1)).toBe(true);
        expect(monthHasRecordedActivity(0)).toBe(false);
    });
});
