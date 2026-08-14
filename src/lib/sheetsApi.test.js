import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchWrite, findLifeTrackerSpreadsheet, getSpreadsheet, readRange } from './sheetsApi';
import { __resetForTests, cacheSet } from './localCache';

describe('findLifeTrackerSpreadsheet', () => {
    const list = vi.fn();

    beforeEach(() => {
        list.mockReset();
        window.gapi = { client: { drive: { files: { list } } } };
    });

    it('prefers the workbook tagged to the stable account identifier', async () => {
        list.mockResolvedValueOnce({ result: { files: [{ id: 'tagged', name: 'Renamed tracker' }] } });

        await expect(findLifeTrackerSpreadsheet('account-123', 'LifeTracker — Old Name'))
            .resolves.toMatchObject({ id: 'tagged' });
        expect(list).toHaveBeenCalledTimes(1);
        expect(list.mock.calls[0][0].q).toContain("key='lifeTrackerAccount'");
    });

    it('recovers an older untagged workbook after the profile name changes', async () => {
        list
            .mockResolvedValueOnce({ result: { files: [] } })
            .mockResolvedValueOnce({ result: { files: [] } })
            .mockResolvedValueOnce({
                result: {
                    files: [
                        { id: 'unrelated', name: 'LifeTracker notes' },
                        { id: 'legacy', name: 'LifeTracker — Previous Name' },
                    ],
                },
            });

        await expect(findLifeTrackerSpreadsheet('account-123', 'LifeTracker — Current Name'))
            .resolves.toMatchObject({ id: 'legacy' });
        expect(list).toHaveBeenCalledTimes(3);
    });
});

describe('readRange cache control', () => {
    beforeEach(() => {
        __resetForTests();
        Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    });

    it('bypasses a fresh in-memory value when forceRefresh is requested', async () => {
        const get = vi.fn()
            .mockResolvedValueOnce({ result: { values: [['first']] } })
            .mockResolvedValueOnce({ result: { values: [['fresh']] } });
        window.gapi = { client: { sheets: { spreadsheets: { values: { get } } } } };

        await expect(readRange('force-refresh-book', 'Data!A:A')).resolves.toEqual([['first']]);
        await expect(readRange('force-refresh-book', 'Data!A:A')).resolves.toEqual([['first']]);
        await expect(readRange('force-refresh-book', 'Data!A:A', { forceRefresh: true }))
            .resolves.toEqual([['fresh']]);

        expect(get).toHaveBeenCalledTimes(2);
    });

    it('uses the last persisted value for an explicit offline/network failure', async () => {
        const get = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        window.gapi = { client: { sheets: { spreadsheets: { values: { get } } } } };
        await cacheSet('read:offline-book-Data!A:A', [['cached']]);

        await expect(readRange('offline-book', 'Data!A:A')).resolves.toEqual([['cached']]);
    });

    it('rejects a failed network-only refresh instead of returning stale persisted data', async () => {
        const get = vi.fn().mockRejectedValue({ status: 503, message: 'Unavailable' });
        window.gapi = { client: { sheets: { spreadsheets: { values: { get } } } } };
        await cacheSet('read:mutation-book-Data!A:A', [['stale']]);

        await expect(readRange('mutation-book', 'Data!A:A', {
            forceRefresh: true,
            allowOfflineFallback: false,
        })).rejects.toMatchObject({ status: 503 });
    });

    it('does not hide permission or malformed-range errors behind cached data', async () => {
        const get = vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' });
        window.gapi = { client: { sheets: { spreadsheets: { values: { get } } } } };
        await cacheSet('read:forbidden-book-Data!A:A', [['cached']]);

        await expect(readRange('forbidden-book', 'Data!A:A')).rejects.toMatchObject({ status: 403 });
    });

    it('retains persisted row data when an ordinary write invalidates memory', async () => {
        const get = vi.fn()
            .mockResolvedValueOnce({ result: { values: [['last-known']] } })
            .mockRejectedValueOnce(new TypeError('Failed to fetch'));
        const batchUpdate = vi.fn().mockResolvedValue({ result: {} });
        window.gapi = { client: { sheets: { spreadsheets: { values: { get, batchUpdate } } } } };

        await readRange('write-retains-cache-book', 'Data!A:A');
        await batchWrite('write-retains-cache-book', [{ range: 'Data!A1', values: [['new']] }]);

        await expect(readRange('write-retains-cache-book', 'Data!A:A', { forceRefresh: true }))
            .resolves.toEqual([['last-known']]);
    });
});

describe('getSpreadsheet offline metadata', () => {
    beforeEach(() => {
        __resetForTests();
        Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    });

    it('persists scoped metadata and serves it after a network failure', async () => {
        const metadata = { spreadsheetId: 'metadata-book', sheets: [{ properties: { title: 'DailyWins' } }] };
        const get = vi.fn()
            .mockResolvedValueOnce({ result: metadata })
            .mockRejectedValueOnce(new TypeError('Failed to fetch'));
        window.gapi = { client: { sheets: { spreadsheets: { get } } } };

        await expect(getSpreadsheet('metadata-book', { forceRefresh: true })).resolves.toEqual(metadata);
        await expect(getSpreadsheet('metadata-book', { forceRefresh: true })).resolves.toEqual(metadata);
    });

    it('does not use persisted metadata when validation requires the network', async () => {
        const metadata = { spreadsheetId: 'strict-metadata-book', sheets: [] };
        const get = vi.fn()
            .mockResolvedValueOnce({ result: metadata })
            .mockRejectedValueOnce({ status: 503 });
        window.gapi = { client: { sheets: { spreadsheets: { get } } } };

        await getSpreadsheet('strict-metadata-book', { forceRefresh: true });
        await expect(getSpreadsheet('strict-metadata-book', {
            forceRefresh: true,
            allowOfflineFallback: false,
        })).rejects.toMatchObject({ status: 503 });
    });
});
