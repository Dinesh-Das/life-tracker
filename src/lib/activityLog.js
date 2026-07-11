const KEY = 'lt_activity_log_v1';
const MAX_ENTRIES = 50;

export function getActivityLog() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function recordActivity(type, label, undoSnapshot = null) {
    const entry = { id: crypto.randomUUID(), type, label, at: new Date().toISOString(), undoSnapshot };
    try { localStorage.setItem(KEY, JSON.stringify([entry, ...getActivityLog()].slice(0, MAX_ENTRIES))); } catch { /* noop */ }
    return entry;
}

export function removeActivity(id) {
    try { localStorage.setItem(KEY, JSON.stringify(getActivityLog().filter(item => item.id !== id))); } catch { /* noop */ }
}

export function clearActivityLog() {
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
