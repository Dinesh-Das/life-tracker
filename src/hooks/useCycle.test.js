import { describe, expect, it } from 'vitest';
import { periodLengthsFromHistory } from './useCycle';

describe('periodLengthsFromHistory', () => {
    it('uses calendar dates rather than the number of logged rows', () => {
        const history = [
            { date: '2026-08-01', periodStart: true, periodEnd: false, flow: 'heavy' },
            { date: '2026-08-05', periodStart: false, periodEnd: true, flow: 'light' },
        ];
        expect(periodLengthsFromHistory(history)).toEqual([5]);
    });

    it('does not count an unfinished current period in the average', () => {
        const history = [
            { date: '2026-08-01', periodStart: true, periodEnd: false, flow: 'heavy' },
            { date: '2026-08-03', periodStart: false, periodEnd: false, flow: 'light' },
        ];
        expect(periodLengthsFromHistory(history)).toEqual([]);
    });
});
