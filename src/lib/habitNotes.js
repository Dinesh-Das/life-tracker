import { getSpreadsheet, addSheet, batchWrite, readRange } from './sheetsApi';
import { resilientUpsertKeyedRow, withOperationLock } from './syncQueue';

/**
 * Per-habit, per-day notes stored in a dedicated 'HabitNotes' tab
 * ([Date, HabitID, Note]), created on first use for existing sheets.
 */
const TAB = 'HabitNotes';
const ensurePromises = new Map();

export async function ensureHabitNotesSheet(spreadsheetId) {
    if (!spreadsheetId) return;
    if (ensurePromises.has(spreadsheetId)) return ensurePromises.get(spreadsheetId);
    const promise = withOperationLock(`life-tracker:ensure-sheet:${spreadsheetId}:${TAB}`, async () => {
        const meta = await getSpreadsheet(spreadsheetId, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        const exists = (meta.sheets || []).some(s => s.properties?.title === TAB);
        if (!exists) {
            await addSheet(spreadsheetId, TAB);
            await batchWrite(spreadsheetId, [{
                range: `${TAB}!A1:C1`,
                values: [['Date', 'HabitID', 'Note']]
            }]);
        }
    }).catch(error => {
        ensurePromises.delete(spreadsheetId);
        throw error;
    });
    ensurePromises.set(spreadsheetId, promise);
    return promise;
}

/** All non-empty notes for one habit, oldest first. */
export async function loadNotesForHabit(spreadsheetId, habitId) {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        await ensureHabitNotesSheet(spreadsheetId);
    }
    const rows = await readRange(spreadsheetId, `${TAB}!A2:C`);
    return rows
        .map((r, i) => ({ row: i + 2, date: r[0], habitId: r[1], note: r[2] || '' }))
        .filter(r => r.habitId === habitId && r.note);
}

/** Upsert the note for (habit, date). Offline-safe. */
export async function saveNote(spreadsheetId, habitId, dateStr, note) {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        await ensureHabitNotesSheet(spreadsheetId);
    }
    return resilientUpsertKeyedRow(
        spreadsheetId,
        `${TAB}!A:C`,
        [dateStr, habitId, note],
        [0, 1],
    );
}
