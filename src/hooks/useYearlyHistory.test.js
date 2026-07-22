import { describe, expect, it } from 'vitest';
import { shouldIncludeHistoryCell } from './useYearlyHistory';

describe('shouldIncludeHistoryCell', () => {
    const migratedHabit = {
        activeFrom: '2026-07-15',
        archivedAt: '',
    };

    it('keeps historical July checks recorded before a migrated ActiveFrom date', () => {
        expect(shouldIncludeHistoryCell(migratedHabit, '2026-07-03', true)).toBe(true);
    });

    it('keeps skip markers neutral instead of lowering completion', () => {
        expect(shouldIncludeHistoryCell(migratedHabit, '2026-07-03', 'skip')).toBe(false);
    });

    it('does not add empty days before the habit was active', () => {
        expect(shouldIncludeHistoryCell(migratedHabit, '2026-07-03', false)).toBe(false);
    });

    it('includes days on and after the habit became active', () => {
        expect(shouldIncludeHistoryCell(migratedHabit, '2026-07-15', false)).toBe(true);
    });
});
