import { batchWrite, appendRows, readDataRows } from './sheetsApi';
import toast from 'react-hot-toast';

/** Offline-resilient, workbook-scoped write queue. */
const KEY = 'lt_sync_queue_v1';
const DEAD_KEY = 'lt_sync_dead_letter_v1';
const MAX_QUEUE_SIZE = 1000;
const MAX_DEAD_LETTERS = 100;

let flushing = false;
let initialized = false;
let lastOfflineNotice = 0;
let currentSpreadsheetId = null;

const loadQueue = () => {
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
};

const saveQueue = (queue) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(queue));
        return true;
    } catch (error) {
        console.error('Sync queue persist failed', error);
        toast.error('Offline storage is full. Reconnect before making more changes.');
        return false;
    }
};

export const pendingCount = () => loadQueue().length;

export function setActiveSpreadsheet(spreadsheetId) {
    currentSpreadsheetId = spreadsheetId || null;
}

export function clearQueuedOperations(spreadsheetId = null) {
    saveQueue(spreadsheetId
        ? loadQueue().filter(item => item.spreadsheetId !== spreadsheetId)
        : []);
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
    const queue = loadQueue();
    const next = queue.filter(item => !(
        item.type === 'recomputeStreak' &&
        item.spreadsheetId === spreadsheetId &&
        item.habitId === habitId &&
        (!operationId || item.id === operationId)
    ));
    if (next.length !== queue.length) saveQueue(next);
}

export function enqueue(op) {
    let queue = loadQueue();
    if (op.type === 'recomputeStreak') {
        queue = queue.filter(item => !(
            item.type === 'recomputeStreak' &&
            item.spreadsheetId === op.spreadsheetId &&
            item.habitId === op.habitId
        ));
    }
    // Date-keyed records are logical upserts. Keep the newest snapshot so
    // repeated edits while offline cannot replay as duplicate appended rows.
    if (op.type === 'upsertDateRow') {
        queue = queue.filter(item => !(
            item.type === 'upsertDateRow' &&
            item.spreadsheetId === op.spreadsheetId &&
            item.range === op.range &&
            item.date === op.date
        ));
    }
    if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline sync queue is full');
    const entry = { ...op, id: op.id || crypto.randomUUID(), attempts: 0, ts: Date.now() };
    queue.push(entry);
    if (!saveQueue(queue)) throw new Error('Could not persist the offline change');
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

async function upsertDateRow(op) {
    const rows = await readDataRows(op.spreadsheetId, op.range);
    let rowIndex = -1;
    rows.forEach((row, index) => {
        if (String(row?.[0] || '') === op.date) rowIndex = index + 2;
    });
    if (rowIndex === -1) return appendRows(op.spreadsheetId, op.range, [op.row]);

    const [tab, columns] = op.range.split('!');
    const [startColumn, endColumn] = columns.split(':');
    return batchWrite(op.spreadsheetId, [{
        range: `${tab}!${startColumn}${rowIndex}:${endColumn}${rowIndex}`,
        values: [op.row],
    }]);
}

async function runOp(op) {
    if (op.type === 'batchWrite') return batchWrite(op.spreadsheetId, op.data);
    if (op.type === 'appendRows') return appendRows(op.spreadsheetId, op.range, op.rows);
    if (op.type === 'upsertDateRow') return upsertDateRow(op);
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
    if (flushing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (!window.gapi?.client?.sheets) return;

    let queue = loadQueue();
    if (!queue.length) return;
    const matchesWorkbook = op => !spreadsheetId || op.spreadsheetId === spreadsheetId;
    if (!queue.some(matchesWorkbook)) return;

    flushing = true;
    let synced = 0;
    let discarded = 0;
    try {
        while (queue.some(matchesWorkbook)) {
            const index = queue.findIndex(matchesWorkbook);
            const op = queue[index];
            try {
                await runOp(op);
                queue = queue.filter((_, itemIndex) => itemIndex !== index);
                saveQueue(queue);
                synced++;
            } catch (error) {
                if (isRetryable(error)) throw error;
                // Preserve permanent failures for diagnostics, then continue so
                // one deleted tab or wrong workbook cannot poison every change.
                deadLetter(op, error);
                queue = queue.filter((_, itemIndex) => itemIndex !== index);
                saveQueue(queue);
                discarded++;
            }
        }
        if (synced) toast.success(`Synced ${synced} offline ${synced === 1 ? 'change' : 'changes'}`);
        if (discarded) toast.error(`${discarded} offline ${discarded === 1 ? 'change needs' : 'changes need'} attention and was removed from the active queue.`);
    } catch (error) {
        console.warn('Sync flush paused, will retry:', error);
    } finally {
        flushing = false;
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

export async function resilientUpsertDateRow(spreadsheetId, range, row) {
    const date = String(row?.[0] || '');
    if (!date) throw new Error('A date-keyed row requires a date in column A');
    const op = { type: 'upsertDateRow', spreadsheetId, range, date, row };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue(op);
        notifyQueued();
        return { queued: true };
    }
    try {
        return await runOp(op);
    } catch (error) {
        if (isRetryable(error)) {
            enqueue(op);
            notifyQueued();
            return { queued: true };
        }
        throw error;
    }
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
