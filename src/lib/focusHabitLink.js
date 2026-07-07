import { readRange, batchRead, batchWrite, colIndexToLabel } from './sheetsApi';
import { applyDailyToggle } from './streakLogic';
import { MONTHS } from './constants';
import { format } from 'date-fns';

/**
 * Focus-to-habit linking — after a completed Deep Work session, habits
 * marked "Focus Link" in Settings (column K) are auto-checked for today
 * on the month tab, and the persisted Streaks tab is updated with the
 * same incremental logic a manual toggle uses.
 *
 * A frozen ('S') day is overwritten with '✓' — an actual completion
 * beats a freeze, and applyDailyToggle handles the streak either way.
 *
 * @returns habits that were newly checked: [{ id, name, emoji }]
 */
export async function autoCheckLinkedHabits(spreadsheetId) {
    if (!spreadsheetId) return [];

    const settingsRows = await readRange(spreadsheetId, 'Settings!A2:K50');
    const habits = (settingsRows || [])
        .filter(r => r && r[1])
        .map((r, i) => ({
            id: r[0] || String(i + 1),
            name: r[1],
            emoji: r[2] || '✨',
            focusLink: r[10] === 'TRUE' || r[10] === true,
            idx: i, // month-tab sheet row = 6 + idx (same order as useHabits)
        }));
    const linked = habits.filter(h => h.focusLink);
    if (linked.length === 0) return [];

    const now = new Date();
    const tabName = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    const col = colIndexToLabel(now.getDate());
    const todayStr = format(now, 'yyyy-MM-dd');

    // Which linked habits are still unchecked today?
    const cellRanges = linked.map(h => `'${tabName}'!${col}${6 + h.idx}`);
    let cells;
    try {
        cells = await batchRead(spreadsheetId, cellRanges);
    } catch (err) {
        // Month tab may not exist yet (first session of a new month)
        if (err.status === 400 || err.code === 400) {
            const { ensureMonthTab } = await import('./sheetScaffold');
            await ensureMonthTab(spreadsheetId, MONTHS[now.getMonth()], now.getFullYear());
            cells = await batchRead(spreadsheetId, cellRanges);
        } else {
            throw err;
        }
    }

    const toCheck = linked.filter((h, i) => {
        const val = cells?.[i]?.values?.[0]?.[0];
        return !(val === '✓' || val === true || val === 'TRUE');
    });
    if (toCheck.length === 0) return [];

    const writes = toCheck.map(h => ({
        range: `'${tabName}'!${col}${6 + h.idx}`,
        values: [['✓']],
    }));

    // Keep the persisted Streaks tab consistent with the new checks
    const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E50');
    let nextRow = (streakRows || []).length;
    toCheck.forEach(h => {
        let rowIndex = (streakRows || []).findIndex(r => r[0] === h.id);
        let stats = { current: 0, best: 0, lastDone: '', total: 0 };
        if (rowIndex !== -1) {
            const row = streakRows[rowIndex];
            stats = {
                current: parseInt(row[1]) || 0,
                best: parseInt(row[2]) || 0,
                lastDone: row[3] || '',
                total: parseInt(row[4]) || 0,
            };
        } else {
            rowIndex = nextRow;
            nextRow++;
        }
        const next = applyDailyToggle(stats, todayStr, true);
        writes.push({
            range: `Streaks!A${rowIndex + 2}:E${rowIndex + 2}`,
            values: [[h.id, next.current, next.best, next.lastDone, next.total]],
        });
    });

    await batchWrite(spreadsheetId, writes);
    return toCheck.map(({ id, name, emoji }) => ({ id, name, emoji }));
}