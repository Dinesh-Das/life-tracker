import { cacheDelete, cacheDeletePrefix, cacheGet, cacheSet } from './localCache';

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
const generations = new Map(); // spreadsheetId -> invalidation generation
const offlineKeys = new Map(); // spreadsheetId -> persisted cache keys used this session
const READ_TTL = 60_000;

/**
 * Google Sheets does not accept an A1 range with a starting row and an
 * unbounded ending column (for example `DailyWins!A2:F` or `Month!A6:AG`).
 * Read the valid whole-column range and remove the leading header rows in
 * memory so callers still receive precisely the rows they asked for.
 */
function normalizeReadRange(range) {
    const match = /^(.*!)([A-Z]+)(\d+):([A-Z]+)$/i.exec(range);
    if (!match) return { apiRange: range, skipRows: 0 };
    return {
        apiRange: `${match[1]}${match[2]}:${match[4]}`,
        skipRows: Number(match[3]) - 1,
    };
}

function trimLeadingRows(values, skipRows) {
    return skipRows > 0 ? (values || []).slice(skipRows) : (values || []);
}

function canUseOfflineFallback(error) {
    const status = error?.status ?? error?.result?.error?.code;
    // A missing status is usually a network failure. Never hide permanent
    // request/auth errors (400/401/403/404) behind stale local data.
    return status === undefined || status === 0 || status === 408 || status === 429 || status >= 500;
}

function fresh(key) {
    const hit = cache.get(key);
    return hit && Date.now() - hit.time < READ_TTL ? hit.data : undefined;
}

/** Drop all cached reads + metadata for one spreadsheet (called on writes). */
function invalidateSpreadsheet(spreadsheetId) {
    generations.set(spreadsheetId, (generations.get(spreadsheetId) || 0) + 1);
    const marker = `:${spreadsheetId}:`;
    const metaKey = `m:${spreadsheetId}`;
    for (const key of [...cache.keys()]) {
        if (key.includes(marker) || key === metaKey) cache.delete(key);
    }
    for (const key of [...inflight.keys()]) {
        if (key.includes(marker) || key === metaKey) inflight.delete(key);
    }
    for (const key of offlineKeys.get(spreadsheetId) || []) void cacheDelete(key);
    offlineKeys.delete(spreadsheetId);
}

/** Clear this spreadsheet's in-memory and persisted API read cache. */
export async function clearSpreadsheetCache(spreadsheetId) {
    if (!spreadsheetId) return;
    invalidateSpreadsheet(spreadsheetId);
    await Promise.all([
        cacheDeletePrefix(`read:${spreadsheetId}-`),
        cacheDeletePrefix(`batch:${spreadsheetId}-`),
    ]);
}

/** Share one promise for concurrent identical requests. */
function dedupe(key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    const p = fn().finally(() => {
        if (inflight.get(key) === p) inflight.delete(key);
    });
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

    const { apiRange, skipRows } = normalizeReadRange(range);
    const generation = generations.get(spreadsheetId) || 0;
    return dedupe(key, async () => {
        try {
            const res = await SHEETS().values.get({
                spreadsheetId,
                range: apiRange,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const data = trimLeadingRows(res.result.values, skipRows);
            if ((generations.get(spreadsheetId) || 0) === generation) {
                cache.set(key, { data, time: Date.now() });
                if (!offlineKeys.has(spreadsheetId)) offlineKeys.set(spreadsheetId, new Set());
                offlineKeys.get(spreadsheetId).add(offlineKey);
                void cacheSet(offlineKey, data);
            }
            return data;
        } catch (err) {
            if (canUseOfflineFallback(err)) {
                const fallback = await cacheGet(offlineKey);
                if (fallback !== undefined) return fallback;
            }
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

    const normalizedRanges = ranges.map(normalizeReadRange);
    const generation = generations.get(spreadsheetId) || 0;
    return dedupe(key, async () => {
        try {
            const res = await SHEETS().values.batchGet({
                spreadsheetId,
                ranges: normalizedRanges.map(item => item.apiRange),
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const data = (res.result.valueRanges || []).map((valueRange, index) => ({
                ...valueRange,
                values: trimLeadingRows(valueRange.values, normalizedRanges[index]?.skipRows || 0),
            }));
            if ((generations.get(spreadsheetId) || 0) === generation) {
                cache.set(key, { data, time: Date.now() });
                if (!offlineKeys.has(spreadsheetId)) offlineKeys.set(spreadsheetId, new Set());
                offlineKeys.get(spreadsheetId).add(offlineKey);
                void cacheSet(offlineKey, data);
            }
            return data;
        } catch (err) {
            if (canUseOfflineFallback(err)) {
                const fallback = await cacheGet(offlineKey);
                if (fallback !== undefined) return fallback;
            }
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

    const generation = generations.get(spreadsheetId) || 0;
    return dedupe(key, async () => {
        const res = await SHEETS().get({ spreadsheetId });
        if ((generations.get(spreadsheetId) || 0) === generation) {
            cache.set(key, { data: res.result, time: Date.now() });
        }
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
    const safeTitle = title.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
    const res = await window.gapi.client.drive.files.list({
        q: `name = '${safeTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
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
