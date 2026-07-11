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
        if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) throw new Error('Not a LifeTracker backup');
        return { ...parsed, sheets };
    });
}

export async function restoreBackup(spreadsheetId, backup) {
    const metadata = await getSpreadsheet(spreadsheetId, { forceRefresh: true });
    const existing = new Set(metadata.sheets.map(sheet => sheet.properties.title));
    for (const title of Object.keys(backup.sheets)) if (!existing.has(title)) await addSheet(spreadsheetId, title);
    await batchClear(spreadsheetId, Object.keys(backup.sheets).map(title => `'${title.replaceAll("'", "''")}'!A:AZ`));
    const writes = Object.entries(backup.sheets).filter(([, rows]) => rows?.length).map(([title, rows]) => ({ range: `'${title.replaceAll("'", "''")}'!A1`, values: rows }));
    if (writes.length) await batchWrite(spreadsheetId, writes);
    return validateWorkbook(spreadsheetId);
}
