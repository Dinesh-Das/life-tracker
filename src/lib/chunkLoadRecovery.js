const CHUNK_RELOAD_KEY = 'lifetracker.chunk-reload-attempted-at';
const CHUNK_RELOAD_PARAM = '_lt_reload';

export const CHUNK_RELOAD_GUARD_MS = 60_000;

function readLastReload(storage) {
    try {
        const value = Number(storage?.getItem(CHUNK_RELOAD_KEY));
        return Number.isFinite(value) ? value : 0;
    } catch {
        return 0;
    }
}

function rememberReload(storage, timestamp) {
    try {
        storage?.setItem(CHUNK_RELOAD_KEY, String(timestamp));
    } catch {
        // Recovery must still work when session storage is unavailable.
    }
}

export function buildFreshAssetUrl(href, timestamp) {
    const url = new URL(href);
    url.searchParams.set(CHUNK_RELOAD_PARAM, String(timestamp));
    return url.href;
}

export function reloadWithFreshAssets({
    location = window.location,
    storage = window.sessionStorage,
    timestamp = Date.now(),
} = {}) {
    rememberReload(storage, timestamp);
    location.replace(buildFreshAssetUrl(location.href, timestamp));
}

export function createChunkLoadErrorHandler({
    location = window.location,
    storage = window.sessionStorage,
    now = Date.now,
} = {}) {
    return (event) => {
        const timestamp = now();
        const lastReload = readLastReload(storage);

        // Let the normal error boundary take over after one failed recovery.
        // This prevents a missing or corrupt deployment from causing a loop.
        if (lastReload && timestamp - lastReload < CHUNK_RELOAD_GUARD_MS) return;

        event.preventDefault();
        reloadWithFreshAssets({ location, storage, timestamp });
    };
}

export function installChunkLoadRecovery(windowObject = window) {
    const handler = createChunkLoadErrorHandler({
        location: windowObject.location,
        storage: windowObject.sessionStorage,
    });

    windowObject.addEventListener('vite:preloadError', handler);
    windowObject.setTimeout(() => {
        try {
            windowObject.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch {
            // Storage may be disabled; there is nothing to clean up.
        }
    }, CHUNK_RELOAD_GUARD_MS);

    return () => windowObject.removeEventListener('vite:preloadError', handler);
}
