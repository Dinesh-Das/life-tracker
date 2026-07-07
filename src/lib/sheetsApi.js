import { cacheGet, cacheSet } from './localCache';

const SHEETS = () => window.gapi.client.sheets.spreadsheets;

/**
 * Read-through cache for Sheets API calls.
 *
 * - Memory cache (60s TTL) makes page-to-page navigation feel instant
 *   instead of re-fetching every range on every mount.
 * - In-flight promise sharing collapses concurrent identical reads
 *   (several hooks on one page often request the same ranges) into a
 *   single network call.
 * - Every write explicitly invalidates the spreadsheet's cached reads,
 *   so a long TTL never serves data the user just changed.
 * - Successful reads are also persisted to IndexedDB and served as a
 *   fallback when the network fails (offline support, unchanged keys).
 *
 * Memory keys are prefixed (r:/b:/m:) so a single-range batchGet can
 * never collide with a readRange of the same range.
 */
const cache = new Map();    // key -> { data, time }
const inflight = new Map(); // key -> Promise
const READ_TTL = 60_000;

function fresh(key) {
    const hit = cache.get(key);
    return hit && Date.now() - hit.time < READ_TTL ? hit.data : undefined;
}

/** Drop all cached reads + metadata for one spreadsheet (called on writes). */
function invalidateSpreadsheet(spreadsheetId) {
    const marker = `:${spreadsheetId}:`;
    const metaKey = `m:${spreadsheetId}`;
    for (const key of [...cache.keys()]) {
        if (key.includes(marker) || key === metaKey) cache.delete(key);
    }
    for (const key of [...inflight.keys()]) {
        if (key.includes(marker) || key === metaKey) inflight.delete(key);
    }
}

/** Share one promise for concurrent identical requests. */
function dedupe(key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    const p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
}

/**
 * Read a range from a Google Sheet.
 * Cached for 60s (invalidated on writes); falls back to the last known
 * IndexedDB copy when the network fails.
 * @param {string} spreadsheetId
 * @param {string} range
 */
export async function readRange(spreadsheetId, range) {
    const key = `r:${spreadsheetId}:${range}`;
    const offlineKey = `read:${spreadsheetId}-${range}`; // legacy key format — keep
    const hit = fresh(key);
    if (hit !== undefined) return hit;

    return dedupe(key, async () => {
        try {
            const res = await SHEETS().values.get({
                spreadsheetId,
                range,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const data = res.result.values || [];
            cache.set(key, { data, time: Date.now() });
            cacheSet(offlineKey, data); // fire-and-forget offline copy
            return data;
        } catch (err) {
            const fallback = await cacheGet(offlineKey);
            if (fallback !== undefined) return fallback;
            throw err;
        }
    });
}

/**
 * Batch read multiple ranges. Same caching/dedupe/offline behavior as readRange.
 * @param {string} spreadsheetId
 * @param {string[]} ranges
 */
export async function batchRead(spreadsheetId, ranges) {
    const key = `b:${spreadsheetId}:${ranges.join(',')}`;
    const offlineKey = `batch:${spreadsheetId}-${ranges.join(',')}`; // legacy key format — keep
    const hit = fresh(key);
    if (hit !== undefined) return hit;

    return dedupe(key, async () => {
        try {
            const res = await SHEETS().values.batchGet({
                spreadsheetId,
                ranges,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const data = res.result.valueRanges;
            cache.set(key, { data, time: Date.now() });
            cacheSet(offlineKey, data); // fire-and-forget offline copy
            return data;
        } catch (err) {
            const fallback = await cacheGet(offlineKey);
            if (fallback !== undefined) return fallback;
            throw err;
        }
    });
}

/**
 * Write a single cell value. Invalidates cached reads for the spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range
 * @param {any} value
    */
export async function writeCell(spreadsheetId, range, value) {
    const res = await SHEETS().values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values: [[value]] },
    });
    invalidateSpreadsheet(spreadsheetId);
    return res;
}

/**
 * Batch write multiple ranges. Invalidates cached reads for the spreadsheet.
 * @param {string} spreadsheetId
 * @param {Array<{range: string, values: Array<Array<any>>}>} data
 */
export async function batchWrite(spreadsheetId, data) {
    const res = await SHEETS().values.batchUpdate({
        spreadsheetId,
        resource: {
            valueInputOption: 'RAW',
            data
        },
    });
    invalidateSpreadsheet(spreadsheetId);
    return res;
}

/**
* Append rows to a tab. Invalidates cached reads for the spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range
 * @param {Array<Array<any>>} rows
 */
export async function appendRows(spreadsheetId, range, rows) {
    const res = await SHEETS().values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: rows },
    });
    invalidateSpreadsheet(spreadsheetId);
    return res;
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
 * Cached for 60s and deduped — several hooks request this on every mount.
 * @param {string} spreadsheetId
 */
export async function getSpreadsheet(spreadsheetId) {
    const key = `m:${spreadsheetId}`;
    const hit = fresh(key);
    if (hit !== undefined) return hit;

    return dedupe(key, async () => {
        const res = await SHEETS().get({ spreadsheetId });
        cache.set(key, { data: res.result, time: Date.now() });
        return res.result;
    });
}

/**
 * Add a new sheet to a spreadsheet. Invalidates cached reads + metadata.
 * @param {string} spreadsheetId
 * @param {string} title
 */
export async function addSheet(spreadsheetId, title) {
    const res = await SHEETS().batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                addSheet: { properties: { title } }
            }]
        }
    });
    invalidateSpreadsheet(spreadsheetId);
    return res;
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
