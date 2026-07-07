/**
 * Freeze ledger — device-local history of streak-freeze and repair
 * activity, powering the Streak Bank card. Stored locally like the
 * celebration ledger (UI history, not tracked data).
 */

const KEY = 'lt_freeze_ledger';
const MAX_ENTRIES = 20;

/** Most recent first. Entries: { type: 'freeze'|'repair', date, habitName?, at } */
export function loadFreezeLedger() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
}

/** Prepend an event, capped so the ledger can't grow unbounded. */
export function recordFreezeEvent(event) {
    try {
        const list = loadFreezeLedger();
        list.unshift({ ...event, at: new Date().toISOString() });
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    } catch { /* noop */ }
}