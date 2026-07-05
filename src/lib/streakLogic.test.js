import { describe, it, expect } from 'vitest';
import { applyDailyToggle, computeStreaks } from './streakLogic';

const EMPTY = { current: 0, best: 0, lastDone: '', total: 0 };

describe('applyDailyToggle', () => {
    it('starts a streak on the first check', () => {
        const next = applyDailyToggle(EMPTY, '2026-07-05', true);
        expect(next).toEqual({ current: 1, best: 1, lastDone: '2026-07-05', total: 1 });
    });

    it('extends the streak when yesterday was done', () => {
        const prev = { current: 3, best: 5, lastDone: '2026-07-04', total: 10 };
        const next = applyDailyToggle(prev, '2026-07-05', true);
        expect(next.current).toBe(4);
        expect(next.best).toBe(5);
        expect(next.lastDone).toBe('2026-07-05');
        expect(next.total).toBe(11);
    });

    it('updates best when the current streak surpasses it', () => {
        const prev = { current: 5, best: 5, lastDone: '2026-07-04', total: 20 };
        const next = applyDailyToggle(prev, '2026-07-05', true);
        expect(next.current).toBe(6);
        expect(next.best).toBe(6);
    });

    it('resets the streak to 1 after a gap', () => {
        const prev = { current: 4, best: 6, lastDone: '2026-07-01', total: 15 };
        const next = applyDailyToggle(prev, '2026-07-05', true);
        expect(next.current).toBe(1);
        expect(next.best).toBe(6);
        expect(next.lastDone).toBe('2026-07-05');
    });

    it('does not reset when re-checking the same day', () => {
        const prev = { current: 4, best: 6, lastDone: '2026-07-05', total: 15 };
        const next = applyDailyToggle(prev, '2026-07-05', true);
        expect(next.current).toBe(4);
        expect(next.lastDone).toBe('2026-07-05');
    });

    it('decrements when unchecking today', () => {
        const prev = { current: 4, best: 6, lastDone: '2026-07-05', total: 15 };
        const next = applyDailyToggle(prev, '2026-07-05', false);
        expect(next.current).toBe(3);
        expect(next.total).toBe(14);
        expect(next.lastDone).toBe('2026-07-04');
    });

    it('ignores unchecking a day that was not the last done day', () => {
        const prev = { current: 4, best: 6, lastDone: '2026-07-04', total: 15 };
        const next = applyDailyToggle(prev, '2026-07-05', false);
        expect(next).toEqual(prev);
    });

    it('never drops below zero', () => {
        const next = applyDailyToggle({ current: 0, best: 0, lastDone: '2026-07-05', total: 0 }, '2026-07-05', false);
        expect(next.current).toBe(0);
        expect(next.total).toBe(0);
    });
});

describe('computeStreaks', () => {
    it('returns zeros for empty history', () => {
        expect(computeStreaks([], '2026-07-05')).toEqual({ current: 0, best: 0, lastDone: '', total: 0 });
    });

    it('computes a live streak ending today', () => {
        const r = computeStreaks(['2026-07-03', '2026-07-04', '2026-07-05'], '2026-07-05');
        expect(r).toEqual({ current: 3, best: 3, lastDone: '2026-07-05', total: 3 });
    });

    it('keeps a streak alive when it ended yesterday', () => {
        const r = computeStreaks(['2026-07-03', '2026-07-04'], '2026-07-05');
        expect(r.current).toBe(2);
        expect(r.best).toBe(2);
    });

    it('marks the streak dead after a 2-day gap but preserves best', () => {
        const r = computeStreaks(['2026-07-01', '2026-07-02', '2026-07-03'], '2026-07-05');
        expect(r.current).toBe(0);
        expect(r.best).toBe(3);
        expect(r.total).toBe(3);
    });

    it('finds the best run among multiple blocks', () => {
        const r = computeStreaks(
            ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-07-04', '2026-07-05'],
            '2026-07-05'
        );
        expect(r.best).toBe(4);
        expect(r.current).toBe(2);
        expect(r.total).toBe(6);
    });

    it('handles a backfilled hole being repaired (the core backfill fix)', () => {
        // User checked Jul 3 and Jul 5, then backfills Jul 4 — streak becomes 3
        const r = computeStreaks(['2026-07-03', '2026-07-05', '2026-07-04'], '2026-07-05');
        expect(r.current).toBe(3);
        expect(r.best).toBe(3);
    });

    it('deduplicates repeated dates', () => {
        const r = computeStreaks(['2026-07-05', '2026-07-05'], '2026-07-05');
        expect(r.total).toBe(1);
        expect(r.current).toBe(1);
    });

    it('handles month boundaries', () => {
        const r = computeStreaks(['2026-06-30', '2026-07-01'], '2026-07-01');
        expect(r.current).toBe(2);
        expect(r.best).toBe(2);
    });
});