import { batchRead, batchWrite, readRange } from './sheetsApi';
import { MONTHS } from './constants';
import { loadActiveHabits } from './habitRepository';
import { ensureMonthTab } from './sheetScaffold';
import {
    MONTH_HABIT_ID_INDEX, MONTH_HABIT_START_ROW, dayColumn,
    decodeCheck, habitLabel, monthHabitRange, normalizeHabitLabel,
} from './sheetLayout';
import { recomputeStreaksForHabit } from './streakRecompute';

export async function autoCheckLinkedHabits(spreadsheetId) {
    if (!spreadsheetId) return [];
    const now = new Date();
    const habits = await loadActiveHabits(spreadsheetId, now);
    const linked = habits.filter(habit => habit.focusLink);
    if (!linked.length) return [];

    const tabName = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    await ensureMonthTab(spreadsheetId, MONTHS[now.getMonth()], now.getFullYear(), habits);
    const rows = await readRange(spreadsheetId, monthHabitRange(tabName));
    const byId = new Map();
    rows.forEach((row, index) => {
        const id = String(row?.[MONTH_HABIT_ID_INDEX] || '');
        if (id) byId.set(id, MONTH_HABIT_START_ROW + index);
    });
    linked.forEach(habit => {
        if (byId.has(habit.id)) return;
        const wanted = normalizeHabitLabel(habitLabel(habit));
        const index = rows.findIndex(row => normalizeHabitLabel(row?.[0]) === wanted);
        if (index !== -1) byId.set(habit.id, MONTH_HABIT_START_ROW + index);
    });

    const resolved = linked.filter(habit => byId.has(habit.id));
    const column = dayColumn(now.getDate());
    const ranges = resolved.map(habit => `'${tabName}'!${column}${byId.get(habit.id)}`);
    const cells = ranges.length ? await batchRead(spreadsheetId, ranges) : [];
    const toCheck = resolved.filter((habit, index) =>
        decodeCheck(cells?.[index]?.values?.[0]?.[0]) !== true
    );
    if (!toCheck.length) return [];

    await batchWrite(spreadsheetId, toCheck.map(habit => ({
        range: `'${tabName}'!${column}${byId.get(habit.id)}`,
        values: [['✓']],
    })));
    await Promise.all(toCheck.map(habit => recomputeStreaksForHabit(spreadsheetId, habit.id)));
    return toCheck.map(({ id, name, emoji }) => ({ id, name, emoji }));
}
