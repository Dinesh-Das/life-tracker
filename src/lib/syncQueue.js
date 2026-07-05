import { batchWrite, appendRows } from './sheetsApi';
import toast from 'react-hot-toast';

/**
 * Offline-resilient write queue.
 *
 * Writes that fail due to connectivity are persisted to localStorage and
 * replayed in order when the app comes back online, on a 30s interval,
 * and right after (re-)authentication.
 */
const KEY = 'lt_sync_queue_v1';

let flushing = false;
let initialized = false;
let lastOfflineNotice = 0;

const loadQueue = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
};

const saveQueue = (q) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(q));
    } catch (e) {
        console.error('Sync queue persist failed', e);
    }
};

export const pendingCount = () => loadQueue().length;

export function enqueue(op) {
    const q = loadQueue();
    q.push({ ...op, ts: Date.now() });
    saveQueue(q);
}

const RETRYABLE_CODES = new Set([0, 408, 429, 500, 502, 503, 504]);

function isRetryable(err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    const code = err?.status ?? err?.result?.error?.code;
    // No status at all → network-level failure → retryable
    return code === undefined || RETRYABLE_CODES.has(code);
}

function notifyQueued() {
    const now = Date.now();
    if (now - lastOfflineNotice > 10000) {
        lastOfflineNotice = now;
        toast('Saved offline — will sync when back online', { icon: '📴' });
    }
}

async function runOp(op) {
    if (op.type === 'batchWrite') return batchWrite(op.spreadsheetId, op.data);
    if (op.type === 'appendRows') return appendRows(op.spreadsheetId, op.range, op.rows);
    console.warn('Unknown sync op skipped:', op.type);
}

export async function flush() {
    if (flushing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (!window.gapi?.client?.sheets) return; // gapi not ready / not authenticated

    let q = loadQueue();
    if (q.length === 0) return;

    flushing = true;
    const count = q.length;
    try {
        while (q.length > 0) {
            await runOp(q[0]);
            q = q.slice(1);
            saveQueue(q);
        }
        toast.success(`Synced ${count} offline ${count === 1 ? 'change' : 'changes'}`);
    } catch (e) {
        // Leave remaining ops queued — retried on the next trigger
        console.warn('Sync flush paused, will retry:', e);
    } finally {
        flushing = false;
    }
}

/** batchWrite with offline fallback — resolves optimistically when queued. */
export async function resilientBatchWrite(spreadsheetId, data) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'batchWrite', spreadsheetId, data });
        notifyQueued();
        return { queued: true };
    }
    try {
        return await batchWrite(spreadsheetId, data);
    } catch (err) {
        if (isRetryable(err)) {
            enqueue({ type: 'batchWrite', spreadsheetId, data });
            notifyQueued();
            return { queued: true };
        }
        throw err;
    }
}

/** appendRows with offline fallback — resolves optimistically when queued. */
export async function resilientAppendRows(spreadsheetId, range, rows) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'appendRows', spreadsheetId, range, rows });
        notifyQueued();
        return { queued: true };
    }
    try {
        return await appendRows(spreadsheetId, range, rows);
    } catch (err) {
        if (isRetryable(err)) {
            enqueue({ type: 'appendRows', spreadsheetId, range, rows });
            notifyQueued();
            return { queued: true };
        }
        throw err;
    }
}

/** App-lifetime singleton: wires the flush triggers. Safe to call twice. */
export function initSyncQueue() {
    if (initialized) return;
    initialized = true;
    window.addEventListener('online', flush);
    setInterval(flush, 30000);
}