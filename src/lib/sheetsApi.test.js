import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findLifeTrackerSpreadsheet } from './sheetsApi';

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
