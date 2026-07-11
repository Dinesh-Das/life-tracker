import { appendRows, batchWrite, readDataRows } from './sheetsApi';
import { ensureAppSettingsSheet } from './sheetScaffold';

export async function loadProductSettings(spreadsheetId) {
    await ensureAppSettingsSheet(spreadsheetId);
    const rows = await readDataRows(spreadsheetId, 'AppSettings!A:C');
    return Object.fromEntries((rows || []).filter(row => row[0]).map(row => [String(row[0]), String(row[1] ?? '')]));
}

export async function saveProductSetting(spreadsheetId, key, value) {
    await ensureAppSettingsSheet(spreadsheetId);
    const rows = await readDataRows(spreadsheetId, 'AppSettings!A:C');
    const index = (rows || []).findIndex(row => String(row[0]) === key);
    const values = [[key, value, new Date().toISOString()]];
    if (index >= 0) return batchWrite(spreadsheetId, [{ range: `AppSettings!A${index + 2}:C${index + 2}`, values }]);
    return appendRows(spreadsheetId, 'AppSettings!A:C', values);
}
