import { appendRows, batchRead, batchWrite, getSpreadsheet, readRange } from './sheetsApi';
import { computeStreaks } from './streakLogic';
import { format, getDaysInMonth } from 'date-fns';
import { MONTHS } from './constants';
import { loadAllHabits } from './habitRepository';
import { MONTH_HABIT_ID_INDEX, decodeCheck, legacyLabelMatchesHabit } from './sheetLayout';
import { isHabitScheduledForDate } from './habitSchedule';

const MONTH_TAB_RE = new RegExp(`^(${MONTHS.join('|')}) (\\d{4})$`);

function parseMonthTab(title) {
    const match = String(title || '').match(MONTH_TAB_RE);
    if (match) return { title, monthIndex: MONTHS.indexOf(match[1]), year: Number(match[2]) };
    const legacyIndex = MONTHS.indexOf(String(title || ''));
    if (legacyIndex !== -1) return { title, monthIndex: legacyIndex, year: new Date().getFullYear() };
    return null;
}

export async function recomputeStreaksForHabits(spreadsheetId, habitIds) {
    const requestedIds = [...new Set((habitIds || []).filter(Boolean))];
    if (!requestedIds.length) return {};
    const [metadata, habits] = await Promise.all([
        getSpreadsheet(spreadsheetId),
        loadAllHabits(spreadsheetId),
    ]);
    const requestedHabits = habits.filter(item => requestedIds.includes(item.id));
    if (!requestedHabits.length) return {};

    const monthTabs = (metadata.sheets || [])
        .map(sheet => parseMonthTab(sheet.properties?.title))
        .filter(Boolean)
        .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
    if (!monthTabs.length) return {};

    const hasAppSettings = (metadata.sheets || []).some(sheet => sheet.properties?.title === 'AppSettings');
    const ranges = [...monthTabs.map(tab => `'${tab.title}'!A6:AG`), ...(hasAppSettings ? ['AppSettings!A2:C'] : [])];
    const valueRanges = await batchRead(spreadsheetId, ranges);
    const settingsRows = hasAppSettings ? (valueRanges.at(-1)?.values || []) : [];
    const productSettings = Object.fromEntries(settingsRows.filter(row => row[0]).map(row => [String(row[0]), String(row[1] || '')]));
    const globalPause = { from: productSettings.pauseFrom || '', until: productSettings.pauseUntil || '' };
    const today = format(new Date(), 'yyyy-MM-dd');
    const streakRows = await readRange(spreadsheetId, 'Streaks!A2:E');
    const writes = [];
    const appends = [];
    const result = {};

    requestedHabits.forEach(habit => {
        const doneDates = [];
        const skippedDates = [];
        monthTabs.forEach((tab, index) => {
            const rows = valueRanges?.[index]?.values || [];
            const row = rows.find(candidate => String(candidate?.[MONTH_HABIT_ID_INDEX] || '') === habit.id)
                || rows.find(candidate => legacyLabelMatchesHabit(candidate?.[0], habit));
            if (!row) return;
            const days = getDaysInMonth(new Date(tab.year, tab.monthIndex, 1));
            for (let day = 1; day <= days; day++) {
                const value = decodeCheck(row[day]);
                const date = format(new Date(tab.year, tab.monthIndex, day), 'yyyy-MM-dd');
                if (value === true) doneDates.push(date);
                if (value === 'skip' || !isHabitScheduledForDate(habit, date, globalPause)) skippedDates.push(date);
            }
        });
        const stats = computeStreaks(doneDates, today, skippedDates);
        result[habit.id] = stats;
        const values = [[habit.id, stats.current, stats.best, stats.lastDone, stats.total]];
        const rowIndex = (streakRows || []).findIndex(row => row[0] === habit.id);
        if (rowIndex === -1) appends.push(values[0]);
        else writes.push({ range: `Streaks!A${rowIndex + 2}:E${rowIndex + 2}`, values });
    });

    if (writes.length) await batchWrite(spreadsheetId, writes);
    if (appends.length) await appendRows(spreadsheetId, 'Streaks!A:E', appends);
    return result;
}

export async function recomputeStreaksForHabit(spreadsheetId, habitId) {
    const result = await recomputeStreaksForHabits(spreadsheetId, [habitId]);
    return result[habitId] || null;
}

const scheduled = new Map();
const recomputeChains = new Map();

/** Coalesce rapid edits into one multi-habit, serialized streak recomputation. */
export function scheduleStreakRecompute(spreadsheetId, habitId, delay = 700) {
    let state = scheduled.get(spreadsheetId);
    if (!state) {
        state = { ids: new Set(), waiters: [], timer: null };
        scheduled.set(spreadsheetId, state);
    }
    state.ids.add(habitId);
    if (state.timer) clearTimeout(state.timer);

    const promise = new Promise((resolve, reject) => state.waiters.push({ habitId, resolve, reject }));
    state.timer = setTimeout(() => {
        const batch = scheduled.get(spreadsheetId);
        if (batch !== state) return;
        scheduled.delete(spreadsheetId);
        const ids = [...batch.ids];
        const previous = recomputeChains.get(spreadsheetId) || Promise.resolve();
        const run = previous.catch(() => {}).then(() => recomputeStreaksForHabits(spreadsheetId, ids));
        recomputeChains.set(spreadsheetId, run);
        run.then(results => {
            batch.waiters.forEach(waiter => waiter.resolve(results[waiter.habitId] || null));
        }).catch(error => {
            batch.waiters.forEach(waiter => waiter.reject(error));
        }).finally(() => {
            if (recomputeChains.get(spreadsheetId) === run) recomputeChains.delete(spreadsheetId);
        });
    }, delay);
    return promise;
}
