import { appendRows, batchRead, batchWrite, getSpreadsheet, readRange } from './sheetsApi';
import { computeStreaks } from './streakLogic';
import { format, getDaysInMonth } from 'date-fns';
import { MONTHS } from './constants';
import { loadAllHabits } from './habitRepository';
import { MONTH_HABIT_ID_INDEX, decodeCheck, habitLabel, normalizeHabitLabel } from './sheetLayout';

const MONTH_TAB_RE = new RegExp(`^(${MONTHS.join('|')}) (\\d{4})$`);

function parseMonthTab(title) {
    const match = String(title || '').match(MONTH_TAB_RE);
    if (match) return { title, monthIndex: MONTHS.indexOf(match[1]), year: Number(match[2]) };
    const legacyIndex = MONTHS.indexOf(String(title || ''));
    if (legacyIndex !== -1) return { title, monthIndex: legacyIndex, year: new Date().getFullYear() };
    return null;
}

export async function recomputeStreaksForHabit(spreadsheetId, habitId) {
    const [metadata, habits] = await Promise.all([
        getSpreadsheet(spreadsheetId),
        loadAllHabits(spreadsheetId),
    ]);
    const habit = habits.find(item => item.id === habitId);
    if (!habit) return null;

    const monthTabs = (metadata.sheets || [])
        .map(sheet => parseMonthTab(sheet.properties?.title))
        .filter(Boolean)
        .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
    if (!monthTabs.length) return null;

    const ranges = monthTabs.map(tab => `'${tab.title}'!A6:AG`);
    const valueRanges = await batchRead(spreadsheetId, ranges);
    const wantedLabel = normalizeHabitLabel(habitLabel(habit));
    const doneDates = [];
    const skippedDates = [];

    monthTabs.forEach((tab, index) => {
        const rows = valueRanges?.[index]?.values || [];
        const row = rows.find(candidate => String(candidate?.[MONTH_HABIT_ID_INDEX] || '') === habitId)
            || rows.find(candidate => normalizeHabitLabel(candidate?.[0]) === wantedLabel);
        if (!row) return;

        const monthDate = new Date(tab.year, tab.monthIndex, 1);
        const days = getDaysInMonth(monthDate);
        for (let day = 1; day <= days; day++) {
            const value = decodeCheck(row[day]);
            const date = format(new Date(tab.year, tab.monthIndex, day), 'yyyy-MM-dd');
            if (value === true) doneDates.push(date);
            if (value === 'skip') skippedDates.push(date);
        }
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    const stats = computeStreaks(doneDates, today, skippedDates);
    const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E');
    const rowIndex = (streakRows || []).findIndex(row => row[0] === habitId);
    const values = [[habitId, stats.current, stats.best, stats.lastDone, stats.total]];

    if (rowIndex === -1) {
        await appendRows(spreadsheetId, 'Streaks!A:E', values);
    } else {
        await batchWrite(spreadsheetId, [{
            range: `Streaks!A${rowIndex + 2}:E${rowIndex + 2}`,
            values,
        }]);
    }
    return stats;
}
