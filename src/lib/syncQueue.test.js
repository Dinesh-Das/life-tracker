import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    batchWrite: vi.fn(),
    appendRows: vi.fn(),
}));

vi.mock('./sheetsApi', () => ({
    batchWrite: mocks.batchWrite,
    appendRows: mocks.appendRows,
}));

vi.mock('react-hot-toast', () => {
    const fn = () => {};
    fn.success = () => {};
    fn.error = () => {};
    return { default: fn };
});

import { enqueue, flush, pendingCount, removeQueuedRecompute, resilientBatchWrite, resilientAppendRows } from './syncQueue';

const setOnline = (val) =>
    Object.defineProperty(window.navigator, 'onLine', { value: val, configurable: true, writable: true });

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setOnline(true);
    window.gapi = { client: { sheets: {} } };
});

describe('enqueue / pendingCount', () => {
    it('persists queued ops', () => {
        expect(pendingCount()).toBe(0);
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [] });
        enqueue({ type: 'appendRows', spreadsheetId: 'id', range: 'A:B', rows: [] });
        expect(pendingCount()).toBe(2);
    });

    it('coalesces streak recomputes and keeps the recompute after the latest write', () => {
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'B6', values: [[true]] }] });
        enqueue({ type: 'recomputeStreak', spreadsheetId: 'id', habitId: 'habit_1' });
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'C6', values: [[true]] }] });
        enqueue({ type: 'recomputeStreak', spreadsheetId: 'id', habitId: 'habit_1' });

        const queue = JSON.parse(localStorage.getItem('lt_sync_queue_v1'));
        expect(queue.map(item => item.type)).toEqual(['batchWrite', 'batchWrite', 'recomputeStreak']);
        expect(pendingCount()).toBe(3);
    });

    it('does not remove a newer durable recompute when an older batch finishes', () => {
        const oldId = enqueue({ type: 'recomputeStreak', spreadsheetId: 'id', habitId: 'habit_1' });
        const newId = enqueue({ type: 'recomputeStreak', spreadsheetId: 'id', habitId: 'habit_1' });
        removeQueuedRecompute('id', 'habit_1', oldId);
        expect(pendingCount()).toBe(1);
        removeQueuedRecompute('id', 'habit_1', newId);
        expect(pendingCount()).toBe(0);
    });
});

describe('flush', () => {
    it('replays queued ops in order and clears the queue', async () => {
        mocks.batchWrite.mockResolvedValue({});
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'A1', values: [['a']] }] });
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'A2', values: [['b']] }] });

        await flush();

        expect(mocks.batchWrite).toHaveBeenCalledTimes(2);
        expect(mocks.batchWrite.mock.calls[0][1][0].values).toEqual([['a']]);
        expect(mocks.batchWrite.mock.calls[1][1][0].values).toEqual([['b']]);
        expect(pendingCount()).toBe(0);
    });

    it('keeps remaining ops when a replay fails, then finishes on retry', async () => {
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [] });
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [] });

        mocks.batchWrite.mockRejectedValueOnce({ status: 503 });
        await flush();
        expect(pendingCount()).toBe(2);

        mocks.batchWrite.mockResolvedValue({});
        await flush();
        expect(pendingCount()).toBe(0);
    });

    it('does nothing while offline', async () => {
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [] });
        setOnline(false);
        await flush();
        expect(mocks.batchWrite).not.toHaveBeenCalled();
        expect(pendingCount()).toBe(1);
    });
});

describe('resilientBatchWrite', () => {
    it('writes through when online', async () => {
        mocks.batchWrite.mockResolvedValue({ ok: true });
        const res = await resilientBatchWrite('id', []);
        expect(res).toEqual({ ok: true });
        expect(pendingCount()).toBe(0);
    });

    it('queues instead of writing when offline', async () => {
        setOnline(false);
        const res = await resilientBatchWrite('id', []);
        expect(res).toEqual({ queued: true });
        expect(mocks.batchWrite).not.toHaveBeenCalled();
        expect(pendingCount()).toBe(1);
    });

    it('queues on retryable errors (503)', async () => {
        mocks.batchWrite.mockRejectedValue({ status: 503 });
        const res = await resilientBatchWrite('id', []);
        expect(res).toEqual({ queued: true });
        expect(pendingCount()).toBe(1);
    });

    it('queues on network-level errors (no status)', async () => {
        mocks.batchWrite.mockRejectedValue(new TypeError('Failed to fetch'));
        const res = await resilientBatchWrite('id', []);
        expect(res).toEqual({ queued: true });
        expect(pendingCount()).toBe(1);
    });

    it('rethrows non-retryable API errors (400)', async () => {
        mocks.batchWrite.mockRejectedValue({ status: 400 });
        await expect(resilientBatchWrite('id', [])).rejects.toMatchObject({ status: 400 });
        expect(pendingCount()).toBe(0);
    });
});

describe('resilientAppendRows', () => {
    it('queues when offline and preserves args', async () => {
        setOnline(false);
        await resilientAppendRows('id', 'DailyWins!A:F', [['2026-07-05', 'x']]);
        expect(pendingCount()).toBe(1);
        expect(mocks.appendRows).not.toHaveBeenCalled();
    });
});
