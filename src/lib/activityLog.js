const LEGACY_KEY = 'lt_activity_log_v1';
const KEY_PREFIX = 'lt_activity_log_v2:';
const MAX_ENTRIES = 50;

function storageKey(spreadsheetId) {
    return spreadsheetId ? `${KEY_PREFIX}${encodeURIComponent(spreadsheetId)}` : null;
}

function discardUnscopedHistory() {
    // Legacy entries contain full habit snapshots but cannot be attributed to
    // an account safely. Never expose them after switching workbooks.
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* noop */ }
}

export function getActivityLog(spreadsheetId) {
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

export function recordActivity(spreadsheetId, type, label, undoSnapshot = null) {
    const key = storageKey(spreadsheetId);
    if (!key) return null;
    const entry = {
        id: crypto.randomUUID(),
        spreadsheetId,
        type,
        label,
        at: new Date().toISOString(),
        undoSnapshot,
    };
    try {
        localStorage.setItem(key, JSON.stringify([entry, ...getActivityLog(spreadsheetId)].slice(0, MAX_ENTRIES)));
    } catch { /* noop */ }
    return entry;
}

export function removeActivity(spreadsheetId, id) {
    const key = storageKey(spreadsheetId);
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(getActivityLog(spreadsheetId).filter(item => item.id !== id)));
    } catch { /* noop */ }
}

export function clearActivityLog(spreadsheetId) {
    discardUnscopedHistory();
    const key = storageKey(spreadsheetId);
    if (!key) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
}
