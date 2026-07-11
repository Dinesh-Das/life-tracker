import { addSheet, appendRows, batchRead, batchWrite, getSpreadsheet, readRange, writeCell } from './sheetsApi';
import { DEFAULT_HABITS } from './constants';
import {
    HABITS_TAB, HABIT_HEADERS, normalizeHabit, parseHabitRow, serializeHabit,
} from './habitSchema';
import { MONTH_HABIT_ID_INDEX, MONTH_HABIT_START_ROW, legacyLabelMatchesHabit } from './sheetLayout';

const ensurePromises = new Map();
const monthMigrationPromises = new Map();
const MONTH_TAB_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{4})?$/;

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

/**
 * Upgrade every existing month tab from display-label rows to stable IDs.
 * Only column AG is written; all historical checkmarks and notes remain intact.
 * The operation is idempotent and shared across concurrent page loads.
 */
export async function migrateHabitIdsAcrossMonths(spreadsheetId, habits = null) {
    if (!spreadsheetId) return { migrated: 0, tabs: 0 };
    if (monthMigrationPromises.has(spreadsheetId)) return monthMigrationPromises.get(spreadsheetId);

    const promise = (async () => {
        const definitions = habits || await loadAllHabits(spreadsheetId);
        const byId = new Map(definitions.map(habit => [habit.id, habit]));
        const metadata = await getSpreadsheet(spreadsheetId);
        const tabs = (metadata.sheets || [])
            .map(sheet => sheet.properties?.title)
            .filter(title => MONTH_TAB_PATTERN.test(title));
        if (!tabs.length) return { migrated: 0, tabs: 0 };

        const responses = await batchRead(spreadsheetId, tabs.map(tab => `'${tab.replaceAll("'", "''")}'!A6:AG`));
        const writes = [];
        const headerWrites = tabs.map(tab => ({
            range: `'${tab.replaceAll("'", "''")}'!AG5`,
            values: [['Habit ID']],
        }));
        responses.forEach((response, tabIndex) => {
            const tab = tabs[tabIndex];
            (response?.values || []).forEach((row, rowIndex) => {
                const currentId = String(row?.[MONTH_HABIT_ID_INDEX] || '');
                if (currentId && byId.has(currentId)) return;
                const matches = definitions.filter(habit => legacyLabelMatchesHabit(row?.[0], habit));
                if (matches.length !== 1) return;
                writes.push({
                    range: `'${tab.replaceAll("'", "''")}'!AG${MONTH_HABIT_START_ROW + rowIndex}`,
                    values: [[matches[0].id]],
                });
            });
        });
        // Use explicit single-cell updates for the migration. This avoids any
        // ambiguity between the 1-cell AG range and the 32 day-grid columns,
        // and makes the preservation boundary obvious: AG only is changed.
        const allWrites = [...headerWrites, ...writes];
        for (let offset = 0; offset < allWrites.length; offset += 20) {
            await Promise.all(allWrites.slice(offset, offset + 20).map(write =>
                writeCell(spreadsheetId, write.range, write.values[0][0])
            ));
        }
        return { migrated: writes.length, tabs: tabs.length };
    })().catch(error => {
        monthMigrationPromises.delete(spreadsheetId);
        throw error;
    });
    monthMigrationPromises.set(spreadsheetId, promise);
    return promise;
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
    // A new definition may correspond to a legacy name row in an older tab.
    // Allow the next page load to rescan those tabs and attach this ID too.
    monthMigrationPromises.delete(spreadsheetId);
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
    monthMigrationPromises.delete(spreadsheetId);
    return loadAllHabits(spreadsheetId);
}
