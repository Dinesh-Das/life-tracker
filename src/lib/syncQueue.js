import { batchWrite, appendRows, readDataRows } from './sheetsApi';
import toast from 'react-hot-toast';

/** Offline-resilient, workbook-scoped write queue. */
const KEY = 'lt_sync_queue_v1';
const OP_PREFIX = 'lt_sync_op_v2:';
const DEAD_KEY = 'lt_sync_dead_letter_v1';
const MAX_QUEUE_SIZE = 1000;
const MAX_DEAD_LETTERS = 100;

let flushing = false;
let initialized = false;
let lastOfflineNotice = 0;
let currentSpreadsheetId = null;
let activeSpreadsheetEpoch = 0;
let activeSpreadsheetKnown = false;
let deferredFlushSpreadsheetId = null;
let lastEnqueueTimestamp = 0;
const operationLocks = new Map();

function operationStorageKey(entry, preserveLegacyId = false) {
    if (!preserveLegacyId && entry.type === 'recomputeStreak') {
        return `${OP_PREFIX}recompute:${encodeURIComponent(entry.spreadsheetId)}:${encodeURIComponent(entry.habitId)}`;
    }
    if (!preserveLegacyId && entry.type === 'upsertDateRow') {
        return `${OP_PREFIX}date:${encodeURIComponent(entry.spreadsheetId)}:${encodeURIComponent(entry.range)}:${encodeURIComponent(entry.date)}`;
    }
    if (!preserveLegacyId && entry.type === 'appendUniqueRow') {
        return `${OP_PREFIX}unique:${encodeURIComponent(entry.spreadsheetId)}:${encodeURIComponent(entry.range)}:${encodeURIComponent(entry.uniqueKey)}`;
    }
    if (!preserveLegacyId && entry.type === 'upsertKeyedRow') {
        return `${OP_PREFIX}keyed:${encodeURIComponent(entry.spreadsheetId)}:${encodeURIComponent(entry.range)}:${encodeURIComponent(entry.keySignature)}`;
    }
    return `${OP_PREFIX}id:${encodeURIComponent(entry.id)}`;
}

function operationRecords() {
    const records = [];
    for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(OP_PREFIX)) continue;
        try {
            const entry = JSON.parse(localStorage.getItem(key));
            if (entry?.id) records.push({ key, entry });
        } catch { /* ignore one corrupt operation without hiding the others */ }
    }
    return records;
}

function migrateLegacyQueue() {
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || '[]');
        if (!Array.isArray(value) || !value.length) {
            localStorage.removeItem(KEY);
            return;
        }
        // Preserve legacy operations under their IDs. Multiple tabs migrating
        // the same entries only write identical keys and cannot replace a new
        // coalesced operation.
        value.forEach(raw => {
            const entry = { ...raw, id: raw.id || crypto.randomUUID(), ts: raw.ts || Date.now() };
            const key = operationStorageKey(entry, true);
            if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(entry));
        });
        localStorage.removeItem(KEY);
    } catch { /* retry migration on a later load */ }
}

const loadQueue = () => {
    migrateLegacyQueue();
    return operationRecords()
        .map(record => record.entry)
        .sort((a, b) => (a.ts || 0) - (b.ts || 0) || String(a.id).localeCompare(String(b.id)));
};

function removeEntriesWhere(predicate) {
    operationRecords().forEach(({ key, entry }) => {
        if (!predicate(entry)) return;
        try {
            // A coalesced operation may have been replaced by another tab
            // since enumeration. Remove only the exact version we observed.
            const current = JSON.parse(localStorage.getItem(key) || 'null');
            if (current?.id === entry.id && current?.ts === entry.ts) localStorage.removeItem(key);
        } catch { /* noop */ }
    });
}

function sameOperationVersion(left, right) {
    return Boolean(left?.id) && left.id === right?.id && left.ts === right?.ts;
}

function hasOperationVersion(version) {
    return operationRecords().some(record => sameOperationVersion(record.entry, version));
}

function removeOperationVersion(version) {
    removeEntriesWhere(entry => sameOperationVersion(entry, version));
}

function isSameLogicalOperation(entry, operation) {
    if (entry.type !== operation.type || entry.spreadsheetId !== operation.spreadsheetId || entry.range !== operation.range) {
        return false;
    }
    if (operation.type === 'upsertDateRow') return entry.date === operation.date;
    if (operation.type === 'upsertKeyedRow') return entry.keySignature === operation.keySignature;
    if (operation.type === 'appendUniqueRow') return entry.uniqueKey === operation.uniqueKey;
    return false;
}

function queuedLogicalVersions(operation) {
    migrateLegacyQueue();
    return operationRecords()
        .map(record => record.entry)
        .filter(entry => isSameLogicalOperation(entry, operation));
}

function persistOperation(entry) {
    try {
        localStorage.setItem(operationStorageKey(entry), JSON.stringify(entry));
        return true;
    } catch (error) {
        console.error('Sync queue persist failed', error);
        toast.error('Offline storage is full. Reconnect before making more changes.');
        return false;
    }
}

export const pendingCount = () => loadQueue().length;

export function setActiveSpreadsheet(spreadsheetId) {
    const next = spreadsheetId || null;
    activeSpreadsheetKnown = true;
    if (next !== currentSpreadsheetId) activeSpreadsheetEpoch += 1;
    currentSpreadsheetId = next;
}

export function clearQueuedOperations(spreadsheetId = null) {
    migrateLegacyQueue();
    removeEntriesWhere(item => !spreadsheetId || item.spreadsheetId === spreadsheetId);
    try {
        if (!spreadsheetId) localStorage.removeItem(DEAD_KEY);
        else {
            const dead = JSON.parse(localStorage.getItem(DEAD_KEY) || '[]');
            localStorage.setItem(DEAD_KEY, JSON.stringify(
                (Array.isArray(dead) ? dead : []).filter(item => item.spreadsheetId !== spreadsheetId)
            ));
        }
    } catch { /* noop */ }
}

export function removeQueuedRecompute(spreadsheetId, habitId, operationId = null) {
    migrateLegacyQueue();
    removeEntriesWhere(item => (
        item.type === 'recomputeStreak' &&
        item.spreadsheetId === spreadsheetId &&
        item.habitId === habitId &&
        (!operationId || item.id === operationId)
    ));
}

export function enqueue(op) {
    lastEnqueueTimestamp = Math.max(Date.now(), lastEnqueueTimestamp + 1);
    const entry = { ...op, id: op.id || crypto.randomUUID(), attempts: 0, ts: lastEnqueueTimestamp };
    const replacesExisting = Boolean(localStorage.getItem(operationStorageKey(entry)));
    if (!replacesExisting && pendingCount() >= MAX_QUEUE_SIZE) throw new Error('Offline sync queue is full');
    if (!persistOperation(entry)) throw new Error('Could not persist the offline change');
    return entry.id;
}

const RETRYABLE_CODES = new Set([0, 401, 408, 429, 500, 502, 503, 504]);

function isRetryable(error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    const code = error?.status ?? error?.result?.error?.code;
    return code === undefined || RETRYABLE_CODES.has(code);
}

function notifyQueued() {
    const now = Date.now();
    if (now - lastOfflineNotice > 10000) {
        lastOfflineNotice = now;
        toast('Saved offline — will sync when back online', { icon: '📴' });
    }
}

function rowWriteRange(range, rowIndex) {
    const separator = range.lastIndexOf('!');
    const tab = range.slice(0, separator);
    const [startColumn, endColumn] = range.slice(separator + 1).split(':');
    return `${tab}!${startColumn}${rowIndex}:${endColumn}${rowIndex}`;
}

async function withLogicalOperationLock(lockName, op, options, mutation) {
    return withOperationLock(lockName, async () => {
        // A newer live/coalesced operation may retire this queued version while
        // it is waiting for the logical row lock. Recheck at the last safe
        // point before touching the remote sheet.
        if (options.requireStored && !hasOperationVersion(op)) return { superseded: true };
        // Snapshot stale versions only after obtaining the logical lock. A
        // preceding live attempt may have queued its value while this call was
        // waiting; a newer successful call must retire that exact version too.
        const versionsToRetire = options.retireCurrentQueued
            ? queuedLogicalVersions(op)
            : [];
        try {
            const result = await mutation();
            versionsToRetire.forEach(removeOperationVersion);
            return result;
        } catch (error) {
            if (options.queueOnRetryable && isRetryable(error)) {
                enqueueLogicalOperation(op);
                notifyQueued();
                return { queued: true };
            }
            throw error;
        }
    });
}

async function upsertDateRow(op, options = {}) {
    const lockName = `life-tracker:date-upsert:${op.spreadsheetId}:${op.range}:${op.date}`;
    return withLogicalOperationLock(lockName, op, options, async () => {
        // Even a known row is only a hint: users can sort or insert rows in the
        // Sheet while this tab is open/offline. Verify column A before writing.
        const rows = await readDataRows(op.spreadsheetId, op.range, 1, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        let rowIndex = -1;
        if (Number.isInteger(op.knownRowIndex) && op.knownRowIndex >= 2
            && String(rows[op.knownRowIndex - 2]?.[0] || '') === op.date) {
            rowIndex = op.knownRowIndex;
        } else {
            rows.forEach((row, index) => {
                if (String(row?.[0] || '') === op.date) rowIndex = index + 2;
            });
        }
        if (rowIndex === -1) return appendRows(op.spreadsheetId, op.range, [op.row]);
        return batchWrite(op.spreadsheetId, [{
            range: rowWriteRange(op.range, rowIndex),
            values: [op.row],
        }]);
    });
}

async function upsertKeyedRow(op, options = {}) {
    const lockName = `life-tracker:keyed-upsert:${op.spreadsheetId}:${op.range}:${op.keySignature}`;
    return withLogicalOperationLock(lockName, op, options, async () => {
        const rows = await readDataRows(op.spreadsheetId, op.range, 1, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        let rowIndex = -1;
        rows.forEach((row, index) => {
            const matches = op.keyColumnIndexes.every((columnIndex, keyIndex) =>
                String(row?.[columnIndex] ?? '') === op.keyValues[keyIndex]);
            if (matches) rowIndex = index + 2;
        });
        if (rowIndex === -1) return appendRows(op.spreadsheetId, op.range, [op.row]);
        return batchWrite(op.spreadsheetId, [{
            range: rowWriteRange(op.range, rowIndex),
            values: [op.row],
        }]);
    });
}

async function appendUniqueRow(op, options = {}) {
    const lockName = `life-tracker:unique-append:${op.spreadsheetId}:${op.range}:${op.uniqueKey}`;
    return withLogicalOperationLock(lockName, op, options, async () => {
        const rows = await readDataRows(op.spreadsheetId, op.range, 1, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        const exists = rows.some(row => String(row?.[op.keyColumnIndex] ?? '') === op.uniqueKey);
        if (exists) return { deduplicated: true };
        return appendRows(op.spreadsheetId, op.range, [op.row]);
    });
}

/**
 * Web Locks serialize first-write read/append sequences across tabs. The
 * promise chain provides the same guarantee within this tab on browsers that
 * do not implement Web Locks.
 */
export async function withOperationLock(name, operation) {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request(name, { mode: 'exclusive' }, operation);
    }

    const previous = operationLocks.get(name) || Promise.resolve();
    const ready = previous.catch(() => {});
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const tail = ready.then(() => gate);
    operationLocks.set(name, tail);
    await ready;
    try {
        return await operation();
    } finally {
        release();
        if (operationLocks.get(name) === tail) operationLocks.delete(name);
    }
}

async function runOp(op, options = {}) {
    if (op.type === 'batchWrite') return batchWrite(op.spreadsheetId, op.data);
    if (op.type === 'appendRows') return appendRows(op.spreadsheetId, op.range, op.rows);
    if (op.type === 'upsertDateRow') return upsertDateRow(op, options);
    if (op.type === 'upsertKeyedRow') return upsertKeyedRow(op, options);
    if (op.type === 'appendUniqueRow') return appendUniqueRow(op, options);
    if (op.type === 'recomputeStreak') {
        const { recomputeStreaksForHabit } = await import('./streakRecompute');
        return recomputeStreaksForHabit(op.spreadsheetId, op.habitId);
    }
    const error = new Error(`Unknown sync operation: ${op.type}`);
    error.status = 400;
    throw error;
}

function deadLetter(op, error) {
    try {
        const value = JSON.parse(localStorage.getItem(DEAD_KEY) || '[]');
        const dead = Array.isArray(value) ? value : [];
        dead.push({
            ...op,
            failedAt: Date.now(),
            error: String(error?.message || error?.result?.error?.message || error?.status || 'Unknown sync error'),
        });
        localStorage.setItem(DEAD_KEY, JSON.stringify(dead.slice(-MAX_DEAD_LETTERS)));
    } catch (persistError) {
        console.error('Could not preserve failed sync operation', persistError);
    }
}

export async function flush(spreadsheetId = null) {
    const targetSpreadsheetId = spreadsheetId || (activeSpreadsheetKnown ? currentSpreadsheetId : null);
    if (activeSpreadsheetKnown && (!targetSpreadsheetId || targetSpreadsheetId !== currentSpreadsheetId)) return;
    if (flushing) {
        if (targetSpreadsheetId) deferredFlushSpreadsheetId = targetSpreadsheetId;
        return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (!window.gapi?.client?.sheets) return;

    let queue = loadQueue();
    if (!queue.length) return;
    const matchesWorkbook = op => !targetSpreadsheetId || op.spreadsheetId === targetSpreadsheetId;
    if (!queue.some(matchesWorkbook)) return;

    const flushEpoch = activeSpreadsheetEpoch;
    const activeContextIsCurrent = () => !activeSpreadsheetKnown || (
        activeSpreadsheetEpoch === flushEpoch &&
        (!targetSpreadsheetId || currentSpreadsheetId === targetSpreadsheetId)
    );
    flushing = true;
    let synced = 0;
    let discarded = 0;
    try {
        while (queue.some(matchesWorkbook)) {
            if (!activeContextIsCurrent()) break;
            const index = queue.findIndex(matchesWorkbook);
            const op = queue[index];
            const outcome = await withOperationLock(`life-tracker:sync-op:${op.id}`, async () => {
                // Another tab may have completed this operation while this tab
                // waited for its Web Lock.
                if (!hasOperationVersion(op)) return 'already-handled';
                try {
                    await runOp(op, { requireStored: true });
                    removeOperationVersion(op);
                    return 'synced';
                } catch (error) {
                    // Logout/account-switch invalidates the authorization context
                    // for this flush. Preserve the operation instead of classifying
                    // a 403 from the next account as a permanent failure.
                    if (!activeContextIsCurrent()) throw error;
                    if (isRetryable(error)) throw error;
                    // Preserve permanent failures for diagnostics, then continue so
                    // one deleted tab or wrong workbook cannot poison every change.
                    deadLetter(op, error);
                    removeOperationVersion(op);
                    return 'discarded';
                }
            });
            queue = loadQueue();
            if (outcome === 'synced') synced++;
            if (outcome === 'discarded') discarded++;
        }
        if (synced) toast.success(`Synced ${synced} offline ${synced === 1 ? 'change' : 'changes'}`);
        if (discarded) toast.error(`${discarded} offline ${discarded === 1 ? 'change needs' : 'changes need'} attention and was removed from the active queue.`);
    } catch (error) {
        console.warn('Sync flush paused, will retry:', error);
    } finally {
        flushing = false;
        const deferred = deferredFlushSpreadsheetId;
        deferredFlushSpreadsheetId = null;
        if (deferred && (!activeSpreadsheetKnown || currentSpreadsheetId === deferred)) {
            queueMicrotask(() => { void flush(deferred); });
        }
    }
}

export async function resilientBatchWrite(spreadsheetId, data) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'batchWrite', spreadsheetId, data });
        notifyQueued();
        return { queued: true };
    }
    try {
        return await batchWrite(spreadsheetId, data);
    } catch (error) {
        if (isRetryable(error)) {
            enqueue({ type: 'batchWrite', spreadsheetId, data });
            notifyQueued();
            return { queued: true };
        }
        throw error;
    }
}

export async function resilientAppendRows(spreadsheetId, range, rows) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'appendRows', spreadsheetId, range, rows });
        notifyQueued();
        return { queued: true };
    }
    try {
        return await appendRows(spreadsheetId, range, rows);
    } catch (error) {
        if (isRetryable(error)) {
            enqueue({ type: 'appendRows', spreadsheetId, range, rows });
            notifyQueued();
            return { queued: true };
        }
        throw error;
    }
}

function enqueueLogicalOperation(op) {
    const staleVersions = queuedLogicalVersions(op);
    const id = enqueue(op);
    // Legacy ID-keyed entries are not overwritten by the new logical storage
    // key. Remove only versions observed before this enqueue; a concurrently
    // queued newer version has a different ID/timestamp and remains durable.
    staleVersions.forEach(removeOperationVersion);
    return id;
}

async function runResilientLogicalOperation(op) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueLogicalOperation(op);
        notifyQueued();
        return { queued: true };
    }

    return runOp(op, {
        retireCurrentQueued: true,
        queueOnRetryable: true,
    });
}

export async function resilientUpsertDateRow(spreadsheetId, range, row, knownRowIndex = null) {
    const date = String(row?.[0] || '');
    if (!date) throw new Error('A date-keyed row requires a date in column A');
    const op = { type: 'upsertDateRow', spreadsheetId, range, date, row, knownRowIndex };
    return runResilientLogicalOperation(op);
}

/** Upsert one logical row identified by one or more stable key columns. */
export async function resilientUpsertKeyedRow(spreadsheetId, range, row, keyColumnIndexes = [0]) {
    const indexes = [...new Set(keyColumnIndexes)];
    if (!indexes.length || indexes.some(index => !Number.isInteger(index) || index < 0)) {
        throw new Error('A keyed row requires valid key column indexes');
    }
    const keyValues = indexes.map(index => String(row?.[index] ?? '').trim());
    if (keyValues.some(value => !value)) throw new Error('A keyed row requires non-empty stable keys');
    const keySignature = JSON.stringify(indexes.map((index, position) => [index, keyValues[position]]));
    const op = {
        type: 'upsertKeyedRow', spreadsheetId, range, row,
        keyColumnIndexes: indexes, keyValues, keySignature,
    };
    return runResilientLogicalOperation(op);
}

/** Append a row exactly once using a stable key stored in one of its columns. */
export async function resilientAppendUniqueRow(spreadsheetId, range, row, keyColumnIndex = 4) {
    const uniqueKey = String(row?.[keyColumnIndex] ?? '').trim();
    if (!uniqueKey) throw new Error('A unique row requires a stable key');
    const op = { type: 'appendUniqueRow', spreadsheetId, range, row, keyColumnIndex, uniqueKey };
    return runResilientLogicalOperation(op);
}

/** App-lifetime singleton. Repeated calls safely switch the active workbook. */
export function initSyncQueue(spreadsheetId = null) {
    setActiveSpreadsheet(spreadsheetId);
    if (initialized) return;
    initialized = true;
    window.addEventListener('online', () => {
        if (currentSpreadsheetId) void flush(currentSpreadsheetId);
    });
    setInterval(() => {
        if (currentSpreadsheetId) void flush(currentSpreadsheetId);
    }, 30000);
}
