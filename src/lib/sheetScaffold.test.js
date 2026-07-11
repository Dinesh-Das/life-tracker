import { describe, expect, it } from 'vitest';
import { buildMonthTabData } from './sheetScaffold';

const habits = count => Array.from({ length: count }, (_, index) => ({
    id: `habit_${index + 1}`,
    name: `Habit ${index + 1}`,
    emoji: '✓',
}));

describe('buildMonthTabData', () => {
    it.each([1, 15, 16, 50, 500])('builds an ID-backed month with %i habits', count => {
        const rows = buildMonthTabData('Jul', 2026, habits(count));
        expect(rows).toHaveLength(5 + count);
        expect(rows[4][32]).toBe('Habit ID');
        expect(rows.at(-1)[32]).toBe(`habit_${count}`);
        expect(rows.some(row => String(row[0] || '').includes('Mental State'))).toBe(false);
    });

    it('uses the actual calendar for leap-year headers', () => {
        const rows = buildMonthTabData('Feb', 2028, []);
        expect(rows[2][29]).toBe('29');
        expect(rows[2][30]).toBe('');
    });
});
