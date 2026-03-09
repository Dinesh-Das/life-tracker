const SHEETS = () => window.gapi.client.sheets.spreadsheets;

/**
 * Read a range from a Google Sheet.
 * @param {string} spreadsheetId 
 * @param {string} range 
 */
export async function readRange(spreadsheetId, range) {
    const res = await SHEETS().values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE'
    });
    return res.result.values || [];
}

/**
 * Write a single cell value.
 * @param {string} spreadsheetId 
 * @param {string} range 
 * @param {any} value 
 */
export async function writeCell(spreadsheetId, range, value) {
    return SHEETS().values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values: [[value]] },
    });
}

/**
 * Batch write multiple ranges.
 * @param {string} spreadsheetId 
 * @param {Array<{range: string, values: Array<Array<any>>}>} data 
 */
export async function batchWrite(spreadsheetId, data) {
    return SHEETS().values.batchUpdate({
        spreadsheetId,
        resource: {
            valueInputOption: 'RAW',
            data
        },
    });
}

/**
 * Batch read multiple ranges.
 * @param {string} spreadsheetId 
 * @param {string[]} ranges 
 */
export async function batchRead(spreadsheetId, ranges) {
    const res = await SHEETS().values.batchGet({
        spreadsheetId,
        ranges,
        valueRenderOption: 'UNFORMATTED_VALUE'
    });
    return res.result.valueRanges;
}

/**
 * Append rows to a tab.
 * @param {string} spreadsheetId 
 * @param {string} range 
 * @param {Array<Array<any>>} rows 
 */
export async function appendRows(spreadsheetId, range, rows) {
    return SHEETS().values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: rows },
    });
}

/**
 * Create a new spreadsheet.
 * @param {string} title 
 */
export async function createSpreadsheet(title) {
    const res = await SHEETS().create({
        resource: {
            properties: { title }
        }
    });
    return res.result;
}

/**
 * Get spreadsheet details including sheets.
 * @param {string} spreadsheetId 
 */
export async function getSpreadsheet(spreadsheetId) {
    const res = await SHEETS().get({
        spreadsheetId
    });
    return res.result;
}

/**
 * Add a new sheet to a spreadsheet.
 * @param {string} spreadsheetId 
 * @param {string} title 
 */
export async function addSheet(spreadsheetId, title) {
    return SHEETS().batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                addSheet: { properties: { title } }
            }]
        }
    });
}

/**
 * Find a spreadsheet by name in the user's Google Drive.
 * @param {string} title 
 */
export async function findSpreadsheet(title) {
    const res = await window.gapi.client.drive.files.list({
        q: `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1
    });
    return res.result.files?.[0] || null;
}
/**
 * Convert a 0-based column index to a Google Sheets column label (A, B, C... AA, AB...).
 * @param {number} index 
 */
export function colIndexToLabel(index) {
    let label = '';
    while (index >= 0) {
        label = String.fromCharCode((index % 26) + 65) + label;
        index = Math.floor(index / 26) - 1;
    }
    return label;
}
