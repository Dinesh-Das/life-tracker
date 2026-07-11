import { addSheet, appendRows, batchWrite, getSpreadsheet, readRange } from './sheetsApi';
import { DEFAULT_HABITS } from './constants';
import {
    HABITS_TAB, HABIT_HEADERS, normalizeHabit, parseHabitRow, serializeHabit,
} from './habitSchema';

const ensurePromises = new Map();

async function legacyHabits(spreadsheetId) {
    const rows = await readRange(spreadsheetId, 'Settings!A2:K');
    return (rows || [])
        .filter(row => row?.[1])
        .map((row, index) => normalizeHabit({
            id: row[0] || crypto.randomUUID(),
            name: row[1],
            emoji: row[2],
            goal: row[3],
            category: row[4],
            femaleOnly: row[5] === 'TRUE' || row[5] === true,
            frequency: row[6],
            order: row[7],
            createdAt: row[8],
            color: row[9],
            focusLink: row[10] === 'TRUE' || row[10] === true,
        }, index));
}

export async function ensureHabitsSheet(spreadsheetId) {
    if (!spreadsheetId) return;
    if (ensurePromises.has(spreadsheetId)) return ensurePromises.get(spreadsheetId);

    const promise = (async () => {
        const metadata = await getSpreadsheet(spreadsheetId);
        const exists = metadata.sheets?.some(sheet => sheet.properties?.title === HABITS_TAB);
        if (exists) return;

        const migrated = await legacyHabits(spreadsheetId);
        const habits = migrated.length
            ? migrated
            : DEFAULT_HABITS.map((habit, index) => normalizeHabit(habit, index));

        await addSheet(spreadsheetId, HABITS_TAB);
        await batchWrite(spreadsheetId, [{
            range: `${HABITS_TAB}!A1:N${habits.length + 1}`,
            values: [HABIT_HEADERS, ...habits.map(serializeHabit)],
        }]);
    })().catch(error => {
        ensurePromises.delete(spreadsheetId);
        throw error;
    });

    ensurePromises.set(spreadsheetId, promise);
    return promise;
}

export async function loadAllHabits(spreadsheetId) {
    await ensureHabitsSheet(spreadsheetId);
    const rows = await readRange(spreadsheetId, `${HABITS_TAB}!A2:N`);
    return (rows || [])
        .map((row, index) => parseHabitRow(row, index, index + 2))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);
}

export async function loadActiveHabits(spreadsheetId, date = new Date()) {
    const dateKey = typeof date === 'string'
        ? date.slice(0, 10)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const habits = await loadAllHabits(spreadsheetId);
    return habits.filter(habit =>
        (!habit.activeFrom || habit.activeFrom <= dateKey) &&
        (!habit.archivedAt || habit.archivedAt.slice(0, 10) > dateKey)
    );
}

export async function createHabit(spreadsheetId, input, order) {
    await ensureHabitsSheet(spreadsheetId);
    const habit = normalizeHabit({
        ...input,
        id: input.id || crypto.randomUUID(),
        order,
        createdAt: input.createdAt || new Date().toISOString(),
    }, order - 1);
    await appendRows(spreadsheetId, `${HABITS_TAB}!A:N`, [serializeHabit(habit, order - 1)]);
    return habit;
}

export async function updateHabitRecord(spreadsheetId, habit) {
    await ensureHabitsSheet(spreadsheetId);
    let target = habit;
    if (!target.sheetRow) {
        target = (await loadAllHabits(spreadsheetId)).find(item => item.id === habit.id);
    }
    if (!target?.sheetRow) throw new Error(`Habit ${habit.id} was not found`);
    const updated = normalizeHabit({ ...target, ...habit, updatedAt: new Date().toISOString() });
    await batchWrite(spreadsheetId, [{
        range: `${HABITS_TAB}!A${target.sheetRow}:N${target.sheetRow}`,
        values: [serializeHabit(updated, updated.order - 1)],
    }]);
    return { ...updated, sheetRow: target.sheetRow };
}

export async function archiveHabitRecord(spreadsheetId, habit) {
    return updateHabitRecord(spreadsheetId, {
        ...habit,
        archivedAt: new Date().toISOString(),
    });
}

export async function replaceActiveHabits(spreadsheetId, nextHabits) {
    const existing = await loadAllHabits(spreadsheetId);
    const nextById = new Map(nextHabits.map((habit, index) => [habit.id, normalizeHabit({ ...habit, order: index + 1 }, index)]));
    const writes = [];
    const creates = [];

    existing.forEach((habit, index) => {
        const replacement = nextById.get(habit.id);
        const value = replacement
            ? { ...habit, ...replacement, archivedAt: '' }
            : (habit.archivedAt ? habit : { ...habit, archivedAt: new Date().toISOString() });
        writes.push({
            range: `${HABITS_TAB}!A${habit.sheetRow}:N${habit.sheetRow}`,
            values: [serializeHabit(value, index)],
        });
        nextById.delete(habit.id);
    });
    nextById.forEach(habit => creates.push(serializeHabit(habit)));

    if (writes.length) await batchWrite(spreadsheetId, writes);
    if (creates.length) await appendRows(spreadsheetId, `${HABITS_TAB}!A:N`, creates);
    return loadAllHabits(spreadsheetId);
}
