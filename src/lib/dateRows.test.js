import { describe, expect, it } from 'vitest';
import { findLatestDateRowIndex } from './dateRows';

describe('findLatestDateRowIndex', () => {
    it('uses the newest duplicate row for a date', () => {
        const rows = [
            ['2026-07-07', 'old'],
            ['2026-07-08', 'other'],
            ['2026-07-07', 'new'],
        ];
        expect(findLatestDateRowIndex(rows, '2026-07-07')).toBe(2);
    });

    it('returns -1 when the selected date has no data', () => {
        expect(findLatestDateRowIndex([['2026-07-07']], '2026-07-09')).toBe(-1);
    });
});
