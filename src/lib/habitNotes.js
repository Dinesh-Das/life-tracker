import { getSpreadsheet, addSheet, batchWrite, readRange } from './sheetsApi';
import { resilientAppendRows, resilientBatchWrite } from './syncQueue';

/**
 * Per-habit, per-day notes stored in a dedicated 'HabitNotes' tab
 * ([Date, HabitID, Note]), created on first use for existing sheets.
 */
const TAB = 'HabitNotes';
let ensured = false;

export async function ensureHabitNotesSheet(spreadsheetId) {
    if (ensured) return;
    const meta = await getSpreadsheet(spreadsheetId);
    const exists = (meta.sheets || []).some(s => s.properties?.title === TAB);
    if (!exists) {
        await addSheet(spreadsheetId, TAB);
        await batchWrite(spreadsheetId, [{
            range: `${TAB}!A1:C1`,
            values: [['Date', 'HabitID', 'Note']]
        }]);
    }
    ensured = true;
}

/** All non-empty notes for one habit, oldest first. */
export async function loadNotesForHabit(spreadsheetId, habitId) {
    await ensureHabitNotesSheet(spreadsheetId);
    const rows = await readRange(spreadsheetId, `${TAB}!A2:C1000`);
    return rows
        .map((r, i) => ({ row: i + 2, date: r[0], habitId: r[1], note: r[2] || '' }))
        .filter(r => r.habitId === habitId && r.note);
}

/** Upsert the note for (habit, date). Offline-safe. */
export async function saveNote(spreadsheetId, habitId, dateStr, note) {
    await ensureHabitNotesSheet(spreadsheetId);
    const rows = await readRange(spreadsheetId, `${TAB}!A2:C1000`);
    const idx = rows.findIndex(r => r[0] === dateStr && r[1] === habitId);
    if (idx !== -1) {
        await resilientBatchWrite(spreadsheetId, [{
            range: `${TAB}!C${idx + 2}`,
            values: [[note]]
        }]);
    } else {
        await resilientAppendRows(spreadsheetId, `${TAB}!A:C`, [[dateStr, habitId, note]]);
    }
}