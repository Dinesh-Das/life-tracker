import { format } from 'date-fns';
import { addSheet, batchClear, batchWrite, getSpreadsheet } from './sheetsApi';
import { collectAllData, download } from './exportData';
import { ensureHabitsSheet, loadAllHabits, migrateHabitIdsAcrossMonths } from './habitRepository';
import { ensureAppSettingsSheet, ensureDailyStateSheet, ensureFocusSheet, ensureMetricsSheet } from './sheetScaffold';

const REQUIRED = {
    Settings: ['ID', 'Habit Name'],
    Habits: ['ID', 'Habit Name'],
    DailyState: ['Date', 'Mental Score', 'Updated At'],
    AppSettings: ['Key', 'Value', 'Updated At'],
    Streaks: ['Habit ID', 'Current Streak', 'Best Streak', 'Last Done Date', 'Total Days'],
    DailyWins: ['Date', 'Physical', 'Mental', 'Social', 'Financial', 'Spiritual'],
    JournalLogs: ['Date', 'Gratitude', 'Review', 'Focus'],
    FocusLogs: ['Date', 'Start Time', 'Minutes', 'Mode'],
};

const MAX_RESTORE_COLUMNS = 52; // A:AZ — the same range used by exports
const MAX_RESTORE_CELLS = 500_000;
const INVALID_SHEET_TITLE_CHARS = ['\\', '/', '?', '*', '[', ']', ':'];

function validateBackupSheets(sheets) {
    if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) {
        throw new Error('Not a LifeTracker backup');
    }
    let cells = 0;
    Object.entries(sheets).forEach(([title, rows]) => {
        if (!title || title.length > 100 || INVALID_SHEET_TITLE_CHARS.some(char => title.includes(char))) {
            throw new Error(`Invalid sheet title in backup: ${title || '(empty)'}`);
        }
        if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row))) {
            throw new Error(`Invalid row data in backup sheet: ${title}`);
        }
        rows.forEach(row => {
            if (row.length > MAX_RESTORE_COLUMNS) {
                throw new Error(`Backup sheet ${title} exceeds column AZ`);
            }
            row.forEach(cell => {
                const valid = cell === null || cell === undefined ||
                    ['string', 'number', 'boolean'].includes(typeof cell);
                if (!valid) throw new Error(`Unsupported cell value in backup sheet: ${title}`);
            });
            cells += MAX_RESTORE_COLUMNS;
        });
    });
    if (cells > MAX_RESTORE_CELLS) throw new Error('Backup is too large to restore safely in one operation');
    return sheets;
}

export async function createBackup(spreadsheetId) {
    const sheets = await collectAllData(spreadsheetId);
    const payload = { format: 'lifetracker-backup', version: 3, createdAt: new Date().toISOString(), sheets };
    download(`lifetracker-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`, JSON.stringify(payload, null, 2), 'application/json');
    return { tabs: Object.keys(sheets).length };
}

export async function validateWorkbook(spreadsheetId) {
    const [metadata, data] = await Promise.all([getSpreadsheet(spreadsheetId, { forceRefresh: true }), collectAllData(spreadsheetId)]);
    const titles = new Set(metadata.sheets.map(sheet => sheet.properties.title));
    const issues = [];
    Object.entries(REQUIRED).forEach(([title, headers]) => {
        if (!titles.has(title)) issues.push({ type: 'missing-tab', title });
        else if (headers.some((header, index) => String(data[title]?.[0]?.[index] || '') !== header)) issues.push({ type: 'header', title });
    });
    const ids = (data.Habits || []).slice(1).map(row => String(row[0] || '')).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length) issues.push({ type: 'duplicate-habit-id', count: new Set(duplicateIds).size });
    for (const title of ['DailyState', 'DailyWins', 'JournalLogs']) {
        const dates = (data[title] || []).slice(1).map(row => String(row[0] || '')).filter(Boolean);
        const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
        if (duplicates.length) issues.push({ type: 'duplicate-date', title, count: new Set(duplicates).size });
    }
    return { healthy: issues.length === 0, issues, tabs: titles.size, habits: ids.length };
}

export async function repairWorkbook(spreadsheetId) {
    const metadata = await getSpreadsheet(spreadsheetId, { forceRefresh: true });
    const titles = new Set(metadata.sheets.map(sheet => sheet.properties.title));
    const writes = [];
    for (const [title, headers] of Object.entries(REQUIRED)) {
        if (!titles.has(title)) await addSheet(spreadsheetId, title);
        writes.push({ range: `'${title}'!A1:${String.fromCharCode(64 + headers.length)}1`, values: [headers] });
    }
    if (writes.length) await batchWrite(spreadsheetId, writes);
    await Promise.all([ensureHabitsSheet(spreadsheetId), ensureDailyStateSheet(spreadsheetId), ensureAppSettingsSheet(spreadsheetId), ensureFocusSheet(spreadsheetId), ensureMetricsSheet(spreadsheetId)]);
    const habits = await loadAllHabits(spreadsheetId);
    const migration = await migrateHabitIdsAcrossMonths(spreadsheetId, habits);
    return { migration, validation: await validateWorkbook(spreadsheetId) };
}

export function parseBackupFile(file) {
    return file.text().then(text => {
        const parsed = JSON.parse(text);
        const sheets = parsed?.format === 'lifetracker-backup' ? parsed.sheets : parsed;
        validateBackupSheets(sheets);
        return { ...parsed, sheets };
    });
}

export async function restoreBackup(spreadsheetId, backup) {
    const sheets = validateBackupSheets(backup?.sheets);
    const metadata = await getSpreadsheet(spreadsheetId, { forceRefresh: true });
    const existing = new Set(metadata.sheets.map(sheet => sheet.properties.title));
    for (const title of Object.keys(sheets)) if (!existing.has(title)) await addSheet(spreadsheetId, title);

    // First overwrite every backed-up row, padding through AZ so stale cells
    // to the right are removed. Only after all replacement values succeed do
    // we clear rows below the restored snapshot. A failed write therefore
    // leaves the original workbook recoverable instead of pre-cleared.
    const writes = Object.entries(sheets)
        .filter(([, rows]) => rows.length)
        .map(([title, rows]) => ({
            range: `'${title.replaceAll("'", "''")}'!A1:AZ${rows.length}`,
            values: rows.map(row => [
                ...row.map(cell => cell ?? ''),
                ...Array(MAX_RESTORE_COLUMNS - row.length).fill(''),
            ]),
        }));
    if (writes.length) await batchWrite(spreadsheetId, writes);

    const trailingRanges = Object.entries(sheets).map(([title, rows]) => {
        const escaped = title.replaceAll("'", "''");
        return rows.length ? `'${escaped}'!A${rows.length + 1}:AZ` : `'${escaped}'!A:AZ`;
    });
    if (trailingRanges.length) await batchClear(spreadsheetId, trailingRanges);
    return validateWorkbook(spreadsheetId);
}
