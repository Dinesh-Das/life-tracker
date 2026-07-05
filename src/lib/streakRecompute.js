import { getSpreadsheet, batchRead, batchWrite, readRange } from './sheetsApi';
import { computeStreaks } from './streakLogic';
import { format, getDaysInMonth } from 'date-fns';

const MONTH_TAB_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/;

/**
 * Recompute a habit's streaks from its complete history across all month tabs
 * and persist the result to the Streaks sheet.
 *
 * Used after backfill (past-day) toggles, where incremental updates would
 * corrupt current/best. Assumes the habit occupies row (6 + habitIndex) in
 * every month tab — the same assumption the scaffold and useHabits make.
 *
 * @param {string} spreadsheetId
 * @param {string} habitId     habit id as stored in Streaks!A
 * @param {number} habitIndex  zero-based position of the habit in the list
 */
export async function recomputeStreaksForHabit(spreadsheetId, habitId, habitIndex) {
    const meta = await getSpreadsheet(spreadsheetId);
    const monthTabs = (meta.sheets || [])
        .map(s => s.properties?.title)
        .filter(t => t && MONTH_TAB_RE.test(t));

    if (monthTabs.length === 0) return;

    const row = 6 + habitIndex;
    const ranges = monthTabs.map(t => `'${t}'!B${row}:AF${row}`); // B..AF = days 1..31
    const valueRanges = await batchRead(spreadsheetId, ranges);

    const doneDates = [];
    monthTabs.forEach((tab, i) => {
        const match = tab.match(MONTH_TAB_RE);
        if (!match) return;
        const monthDate = new Date(`${match[1]} 1, ${match[2]}`);
        const days = getDaysInMonth(monthDate);
        const vals = valueRanges?.[i]?.values?.[0] || [];
        for (let d = 0; d < days; d++) {
            const v = vals[d];
            if (v === true || v === 'TRUE' || v === '✓') {
                doneDates.push(format(new Date(monthDate.getFullYear(), monthDate.getMonth(), d + 1), 'yyyy-MM-dd'));
            }
        }
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { current, best, lastDone, total } = computeStreaks(doneDates, todayStr);

    // Locate (or append) the habit's row in the Streaks sheet
    const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E50');
    let rowIndex = streakRows.findIndex(r => r[0] === habitId);
    if (rowIndex === -1) rowIndex = streakRows.length;

    await batchWrite(spreadsheetId, [{
        range: `Streaks!A${rowIndex + 2}:E${rowIndex + 2}`,
        values: [[habitId, current, best, lastDone, total]]
    }]);
}
