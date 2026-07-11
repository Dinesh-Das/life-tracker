import { MONTHS } from './constants';

/**
 * Multi-year Wrapped comparison — pure helpers that discover which years
 * have data, reduce raw month-tab grids into per-year summaries and diff
 * two years side by side.
 *
 * Streaks are deliberately excluded: the Streaks tab is lifetime-scoped,
 * so a per-year comparison of it would be misleading.
 */

const isDone = (v) => v === '✓' || v === true || v === 'TRUE' || v === 'checked';
const isFilled = (v) => v !== '' && v !== null && v !== undefined;

const YEAR_TAB_RE = /^([A-Za-z]+) (\d{4})$/;

/**
 * Distinct years that have month tabs, newest first.
 * Legacy bare-month tabs (e.g. "Mar") predate the "Mon YYYY" naming and
 * are attributed to `legacyYear` (the year the app assumed before the
 * migration — callers pass the current year, matching useDashboard).
 *
 * @param {string[]} titles     spreadsheet tab titles
 * @param {number|null} legacyYear year to attribute bare-month tabs to
 * @returns {number[]} e.g. [2026, 2025]
 */
export function yearsFromSheetTitles(titles = [], legacyYear = null) {
    const years = new Set();
    titles.forEach((title) => {
        const m = YEAR_TAB_RE.exec(String(title || ''));
        if (m && MONTHS.includes(m[1])) {
            years.add(parseInt(m[2], 10));
        } else if (legacyYear !== null && MONTHS.includes(String(title))) {
            years.add(legacyYear);
        }
    });
    return [...years].sort((a, b) => b - a);
}

/**
 * Month tabs to read for a given year. Prefers "Mon YYYY" tabs; falls
 * back to legacy bare-month tabs only for `legacyYear` so old tabs can't
 * leak into (and double-count across) other years' summaries.
 *
 * @returns {Array<{month: string, title: string}>}
 */
export function monthTabsForYear(titles = [], year, legacyYear = null) {
    return MONTHS.map((month) => {
        const titled = `${month} ${year}`;
        if (titles.includes(titled)) return { month, title: titled };
        if (year === legacyYear && titles.includes(month)) return { month, title: month };
        return null;
    }).filter(Boolean);
}

/**
 * Reduce one year's month grids into Wrapped comparison stats.
 * Cell semantics mirror useDashboard: a checked cell counts as done,
 * any non-empty cell counts toward the possible total.
 *
 * @param {number} year
 * @param {Array<{month: string, rows: Array<Array>}>} monthGrids open-ended B6:AF rows per month
 * @returns {{year:number, totalCompleted:number, completionPct:number,
 *            activeMonths:number, bestMonth:{name:string,pct:number},
 *            monthlyPcts:Array<{name:string,pct:number}>}}
 */
export function computeYearSummary(year, monthGrids = []) {
    let totalCompleted = 0;
    let totalPossible = 0;
    let activeMonths = 0;
    let bestMonth = { name: '–', pct: 0 };
    const monthlyPcts = MONTHS.map((name) => ({ name, pct: 0 }));

    monthGrids.forEach(({ month, rows }) => {
        let done = 0;
        let possible = 0;
        (rows || []).forEach((row) => {
            (row || []).forEach((cell) => {
                if (isDone(cell)) done++;
                if (isFilled(cell)) possible++;
            });
        });
        const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
        if (pct > 0) activeMonths++;
        if (pct > bestMonth.pct) bestMonth = { name: month, pct };
        totalCompleted += done;
        totalPossible += possible;
        const idx = MONTHS.indexOf(month);
        if (idx !== -1) monthlyPcts[idx].pct = pct;
    });

    return {
        year,
        totalCompleted,
        completionPct: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
        activeMonths,
        bestMonth,
        monthlyPcts,
    };
}

/**
 * Diff two year summaries for the comparison view.
 * Deltas are (a - b): positive means `a` beat `b`.
 *
 * @returns {null|{totalCompleted:number, completionPct:number,
 *                 activeMonths:number, bestMonthPct:number}}
 */
export function compareYearSummaries(a, b) {
    if (!a || !b) return null;
    return {
        totalCompleted: a.totalCompleted - b.totalCompleted,
        completionPct: a.completionPct - b.completionPct,
        activeMonths: a.activeMonths - b.activeMonths,
        bestMonthPct: (a.bestMonth?.pct || 0) - (b.bestMonth?.pct || 0),
    };
}
