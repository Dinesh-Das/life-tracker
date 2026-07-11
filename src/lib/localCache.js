/**
 * Tiny IndexedDB-backed key-value cache with an in-memory fallback.
 * Used to serve the last known Sheets data when the network is unavailable.
 */
const DB_NAME = 'lifetracker-cache';
const STORE = 'kv';
const VERSION = 1;

let dbPromise = null;
const memory = new Map(); // fallback when IndexedDB is unavailable

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        try {
            const req = indexedDB.open(DB_NAME, VERSION);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
}

export async function cacheGet(key) {
    const db = await openDb();
    if (!db) return memory.has(key) ? memory.get(key) : undefined;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        } catch {
            resolve(undefined);
        }
    });
}

export async function cacheSet(key, value) {
    const db = await openDb();
    if (!db) {
        memory.set(key, value);
        return;
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

export async function cacheDelete(key) {
    const db = await openDb();
    if (!db) {
        memory.delete(key);
        return;
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

/** Test helper — resets module state between tests. */
export function __resetForTests() {
    dbPromise = null;
    memory.clear();
}

/** Remove every persisted cache entry whose key begins with a prefix. */
export async function cacheDeletePrefix(prefix) {
    const db = await openDb();
    if (!db) {
        for (const key of memory.keys()) if (String(key).startsWith(prefix)) memory.delete(key);
        return;
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite');
            const request = tx.objectStore(STORE).openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) return;
                if (String(cursor.key).startsWith(prefix)) cursor.delete();
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}
