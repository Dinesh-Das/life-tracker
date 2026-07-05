import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheDelete, __resetForTests } from './localCache';

// jsdom has no IndexedDB, so these tests exercise the in-memory fallback path —
// the same code path used by browsers with IndexedDB disabled (private mode).
beforeEach(() => __resetForTests());

describe('localCache', () => {
    it('round-trips values', async () => {
        await cacheSet('k', { a: 1, rows: [['x', 'y']] });
        expect(await cacheGet('k')).toEqual({ a: 1, rows: [['x', 'y']] });
    });

    it('returns undefined for missing keys', async () => {
        expect(await cacheGet('missing')).toBeUndefined();
    });

    it('overwrites existing values', async () => {
        await cacheSet('k', 1);
        await cacheSet('k', 2);
        expect(await cacheGet('k')).toBe(2);
    });

    it('deletes values', async () => {
        await cacheSet('k', 1);
        await cacheDelete('k');
        expect(await cacheGet('k')).toBeUndefined();
    });

    it('stores falsy values distinctly from missing keys', async () => {
        await cacheSet('zero', 0);
        expect(await cacheGet('zero')).toBe(0);
        await cacheSet('empty', []);
        expect(await cacheGet('empty')).toEqual([]);
    });
});