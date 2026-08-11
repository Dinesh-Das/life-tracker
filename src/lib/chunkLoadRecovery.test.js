import { describe, expect, it, vi } from 'vitest';
import {
    buildFreshAssetUrl,
    CHUNK_RELOAD_GUARD_MS,
    createChunkLoadErrorHandler,
    installChunkLoadRecovery,
} from './chunkLoadRecovery';

function createStorage() {
    const values = new Map();
    return {
        getItem: vi.fn(key => values.get(key) ?? null),
        setItem: vi.fn((key, value) => values.set(key, value)),
    };
}

describe('lazy chunk recovery', () => {
    it('preserves the current route and adds a cache-busting value', () => {
        const href = buildFreshAssetUrl('https://example.test/daily?view=evening#notes', 1234);
        const url = new URL(href);

        expect(url.pathname).toBe('/daily');
        expect(url.searchParams.get('view')).toBe('evening');
        expect(url.searchParams.get('_lt_reload')).toBe('1234');
        expect(url.hash).toBe('#notes');
    });

    it('refreshes the app shell after a stale lazy chunk fails', () => {
        const storage = createStorage();
        const location = {
            href: 'https://example.test/daily',
            replace: vi.fn(),
        };
        const event = { preventDefault: vi.fn() };
        const handler = createChunkLoadErrorHandler({
            location,
            storage,
            now: () => 10_000,
        });

        handler(event);

        expect(event.preventDefault).toHaveBeenCalledOnce();
        expect(location.replace).toHaveBeenCalledOnce();
        expect(location.replace.mock.calls[0][0]).toContain('/daily?_lt_reload=10000');
        expect(storage.setItem).toHaveBeenCalledWith(
            'lifetracker.chunk-reload-attempted-at',
            '10000',
        );
    });

    it('does not reload repeatedly when recovery already failed', () => {
        const storage = createStorage();
        storage.setItem('lifetracker.chunk-reload-attempted-at', '10000');
        const location = {
            href: 'https://example.test/daily',
            replace: vi.fn(),
        };
        const event = { preventDefault: vi.fn() };
        const handler = createChunkLoadErrorHandler({
            location,
            storage,
            now: () => 10_000 + CHUNK_RELOAD_GUARD_MS - 1,
        });

        handler(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(location.replace).not.toHaveBeenCalled();
    });

    it('wires and unwires the Vite preload error listener', () => {
        const handlers = new Map();
        const windowObject = {
            location: { href: 'https://example.test/daily', replace: vi.fn() },
            sessionStorage: createStorage(),
            addEventListener: vi.fn((name, handler) => handlers.set(name, handler)),
            removeEventListener: vi.fn(),
            setTimeout: vi.fn(),
        };

        const uninstall = installChunkLoadRecovery(windowObject);

        expect(windowObject.addEventListener).toHaveBeenCalledWith(
            'vite:preloadError',
            expect.any(Function),
        );
        expect(handlers.has('vite:preloadError')).toBe(true);

        uninstall();
        expect(windowObject.removeEventListener).toHaveBeenCalledWith(
            'vite:preloadError',
            handlers.get('vite:preloadError'),
        );
    });
});
