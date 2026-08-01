import { describe, it, expect } from 'vitest';
import {
    yearsFromSheetTitles,
    monthTabsForYear,
    computeYearSummary,
    compareYearSummaries,
} from './wrappedComparison';

describe('yearsFromSheetTitles', () => {
    it('extracts distinct years, newest first, ignoring non-month tabs', () => {
        const titles = ['Jan 2025', 'Feb 2025', 'Jan 2026', 'Settings', 'Streaks', 'FocusLogs'];
        expect(yearsFromSheetTitles(titles)).toEqual([2026, 2025]);
    });

    it('attributes legacy bare-month tabs to the fallback year', () => {
        expect(yearsFromSheetTitles(['Mar', 'Jan 2025'], 2024)).toEqual([2025, 2024]);
    });

    it('returns empty when no month tabs exist', () => {
        expect(yearsFromSheetTitles(['Settings', 'FocusLogs'], 2026)).toEqual([]);
    });
});

describe('monthTabsForYear', () => {
    const titles = ['Jan 2026', 'Feb 2026', 'Mar', 'Settings'];

    it('prefers year-suffixed tabs and falls back to legacy tabs for the legacy year', () => {
        expect(monthTabsForYear(titles, 2026, 2026)).toEqual([
            { month: 'Jan', title: 'Jan 2026' },
            { month: 'Feb', title: 'Feb 2026' },
            { month: 'Mar', title: 'Mar' },
        ]);
    });

    it('does not leak legacy tabs into other years', () => {
        expect(monthTabsForYear(titles, 2025, 2026)).toEqual([]);
    });
});

describe('computeYearSummary', () => {
    const habit = {
        id: 'habit-1', activeFrom: '2026-01-01', archivedAt: '',
        scheduleType: 'frequency', pausedFrom: '', pausedUntil: '',
    };
    const grids = [
        { month: 'Jan', rows: [{ habit, statuses: { 1: true, 2: false, 3: false } }] },
    ];

    it('computes totals, best month, active months and monthly percentages', () => {
        const s = computeYearSummary(2026, grids, { now: new Date(2026, 0, 3) });
        expect(s.year).toBe(2026);
        expect(s.totalCompleted).toBe(1);
        expect(s.completionPct).toBe(33); // blank missed cells remain possible days
        expect(s.activeMonths).toBe(1);
        expect(s.bestMonth).toEqual({ name: 'Jan', pct: 33 });
        expect(s.monthlyPcts[0]).toEqual({ name: 'Jan', pct: 33 });
        expect(s.monthlyPcts).toHaveLength(12);
    });

    it('handles a year with no data gracefully', () => {
        const s = computeYearSummary(2024, []);
        expect(s.totalCompleted).toBe(0);
        expect(s.completionPct).toBe(0);
        expect(s.activeMonths).toBe(0);
        expect(s.bestMonth).toEqual({ name: '–', pct: 0 });
    });
});

describe('compareYearSummaries', () => {
    it('returns signed deltas (a - b)', () => {
        const a = { totalCompleted: 120, completionPct: 64, activeMonths: 8, bestMonth: { name: 'Feb', pct: 80 } };
        const b = { totalCompleted: 90, completionPct: 70, activeMonths: 10, bestMonth: { name: 'Jun', pct: 75 } };
        expect(compareYearSummaries(a, b)).toEqual({
            totalCompleted: 30,
            completionPct: -6,
            activeMonths: -2,
            bestMonthPct: 5,
        });
    });

    it('returns null when either side is missing', () => {
        expect(compareYearSummaries(null, {})).toBeNull();
        expect(compareYearSummaries({}, undefined)).toBeNull();
    });
});
