/**
 * Workbook-scoped, device-local history of streak-freeze and repair activity.
 */

const LEGACY_KEY = 'lt_freeze_ledger';
const KEY_PREFIX = 'lt_freeze_ledger_v2:';
const MAX_ENTRIES = 20;

function storageKey(spreadsheetId) {
    return spreadsheetId ? `${KEY_PREFIX}${encodeURIComponent(spreadsheetId)}` : null;
}

function discardUnscopedHistory() {
    // The old ledger can include habit names and cannot safely be assigned to
    // the currently signed-in account.
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* noop */ }
}

/** Most recent first. Entries: { type: 'freeze'|'repair', date, habitName?, at } */
export function loadFreezeLedger(spreadsheetId) {
    discardUnscopedHistory();
    const key = storageKey(spreadsheetId);
    if (!key) return [];
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value)
            ? value.filter(entry => entry?.spreadsheetId === spreadsheetId)
            : [];
    } catch {
        return [];
    }
}

/** Prepend an event, capped so the ledger cannot grow unbounded. */
export function recordFreezeEvent(spreadsheetId, event) {
    const key = storageKey(spreadsheetId);
    if (!key) return;
    try {
        const list = loadFreezeLedger(spreadsheetId);
        list.unshift({ ...event, spreadsheetId, at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    } catch { /* noop */ }
}
