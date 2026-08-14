import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    batchWrite: vi.fn(),
    appendRows: vi.fn(),
    readDataRows: vi.fn(),
}));

vi.mock('./sheetsApi', () => ({
    batchWrite: mocks.batchWrite,
    appendRows: mocks.appendRows,
    readDataRows: mocks.readDataRows,
}));

vi.mock('react-hot-toast', () => {
    const fn = () => {};
    fn.success = () => {};
    fn.error = () => {};
    return { default: fn };
});

import {
    enqueue, flush, pendingCount, removeQueuedRecompute,
    resilientAppendRows, resilientAppendUniqueRow, resilientBatchWrite, resilientUpsertDateRow,
    resilientUpsertKeyedRow, setActiveSpreadsheet,
} from './syncQueue';

const setOnline = (val) =>
    Object.defineProperty(window.navigator, 'onLine', { value: val, configurable: true, writable: true });

const storedQueue = () => Object.keys(localStorage)
    .filter(key => key.startsWith('lt_sync_op_v2:'))
    .map(key => JSON.parse(localStorage.getItem(key)))
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setOnline(true);
    window.gapi = { client: { sheets: {} } };
    mocks.readDataRows.mockResolvedValue([]);
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

        const queue = storedQueue();
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

    it('migrates the legacy array without rewriting the active queue', () => {
        localStorage.setItem('lt_sync_queue_v1', JSON.stringify([{
            id: 'legacy-1', type: 'batchWrite', spreadsheetId: 'id', data: [], ts: 1,
        }]));

        expect(pendingCount()).toBe(1);
        expect(localStorage.getItem('lt_sync_queue_v1')).toBeNull();
        expect(storedQueue()).toEqual([
            expect.objectContaining({ id: 'legacy-1', spreadsheetId: 'id' }),
        ]);
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

    it('dead-letters a permanent failure and continues with later operations', async () => {
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'Missing!A1', values: [['x']] }] });
        enqueue({ type: 'batchWrite', spreadsheetId: 'id', data: [{ range: 'A1', values: [['ok']] }] });
        mocks.batchWrite.mockRejectedValueOnce({ status: 400 }).mockResolvedValueOnce({});

        await flush('id');

        expect(mocks.batchWrite).toHaveBeenCalledTimes(2);
        expect(pendingCount()).toBe(0);
        expect(JSON.parse(localStorage.getItem('lt_sync_dead_letter_v1'))).toHaveLength(1);
    });

    it('preserves an operation enqueued while a flush write is in flight', async () => {
        let finishWrite;
        mocks.batchWrite.mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve; }));
        enqueue({ type: 'batchWrite', spreadsheetId: 'first-book', data: [] });

        const flushing = flush('first-book');
        await vi.waitFor(() => expect(mocks.batchWrite).toHaveBeenCalledTimes(1));
        enqueue({ type: 'batchWrite', spreadsheetId: 'second-book', data: [] });
        finishWrite({});
        await flushing;

        const queue = storedQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].spreadsheetId).toBe('second-book');
    });

    it('does not remove a newer coalesced snapshot when the old one finishes', async () => {
        let finishRead;
        mocks.readDataRows
            .mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }))
            .mockRejectedValueOnce({ status: 503 });
        mocks.appendRows.mockResolvedValue({});
        enqueue({
            type: 'upsertDateRow', spreadsheetId: 'id', range: 'DailyWins!A:F',
            date: '2026-08-13', row: ['2026-08-13', 'old'],
        });

        const flushing = flush('id');
        await vi.waitFor(() => expect(mocks.readDataRows).toHaveBeenCalledTimes(1));
        enqueue({
            type: 'upsertDateRow', spreadsheetId: 'id', range: 'DailyWins!A:F',
            date: '2026-08-13', row: ['2026-08-13', 'latest'],
        });
        finishRead([]);
        await flushing;

        expect(storedQueue()).toHaveLength(1);
        expect(storedQueue()[0].row[1]).toBe('latest');
    });

    it('skips an old queued snapshot already claimed while a newer live write retires it', async () => {
        setOnline(false);
        await resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-08-13', 'old']);
        setOnline(true);

        let finishLiveRead;
        mocks.readDataRows.mockImplementationOnce(() => new Promise(resolve => { finishLiveRead = resolve; }));
        mocks.appendRows.mockResolvedValue({});

        const liveWrite = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-08-13', 'latest']);
        await vi.waitFor(() => expect(mocks.readDataRows).toHaveBeenCalledTimes(1));
        const queuedFlush = flush('id');
        finishLiveRead([]);
        await Promise.all([liveWrite, queuedFlush]);

        expect(mocks.appendRows).toHaveBeenCalledTimes(1);
        expect(mocks.appendRows.mock.calls[0][2]).toEqual([['2026-08-13', 'latest']]);
        expect(pendingCount()).toBe(0);
    });

    it('pauses an old-account flush without dead-lettering its writes after an account switch', async () => {
        let rejectFirstWrite;
        mocks.batchWrite.mockImplementationOnce(() => new Promise((_resolve, reject) => {
            rejectFirstWrite = reject;
        }));
        enqueue({ type: 'batchWrite', spreadsheetId: 'book-a', data: [{ range: 'A1', values: [['first']] }] });
        enqueue({ type: 'batchWrite', spreadsheetId: 'book-a', data: [{ range: 'A2', values: [['second']] }] });
        setActiveSpreadsheet('book-a');

        const flushing = flush('book-a');
        await vi.waitFor(() => expect(mocks.batchWrite).toHaveBeenCalledTimes(1));
        setActiveSpreadsheet('book-b');
        rejectFirstWrite({ status: 403 });
        await flushing;

        expect(mocks.batchWrite).toHaveBeenCalledTimes(1);
        expect(storedQueue()).toHaveLength(2);
        expect(localStorage.getItem('lt_sync_dead_letter_v1')).toBeNull();
        setActiveSpreadsheet(null);
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

describe('resilientUpsertDateRow', () => {
    it('coalesces repeated offline snapshots for the same workbook, range and date', async () => {
        setOnline(false);
        await resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'first']);
        await resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'latest']);

        const queue = storedQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].row[1]).toBe('latest');
    });

    it('updates the latest existing date row instead of appending a duplicate', async () => {
        mocks.readDataRows.mockResolvedValue([
            ['2026-07-05', 'old'],
            ['2026-07-05', 'newer'],
        ]);
        mocks.batchWrite.mockResolvedValue({});

        await resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'latest']);

        expect(mocks.appendRows).not.toHaveBeenCalled();
        expect(mocks.batchWrite.mock.calls[0][1][0].range).toBe('DailyWins!A3:F3');
        expect(mocks.readDataRows).toHaveBeenCalledWith('id', 'DailyWins!A:F', 1, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
    });

    it('serializes concurrent first writes for the same date', async () => {
        let finishFirstRead;
        mocks.readDataRows
            .mockImplementationOnce(() => new Promise(resolve => { finishFirstRead = resolve; }))
            .mockResolvedValueOnce([['2026-07-05', 'first']]);
        mocks.appendRows.mockResolvedValue({});
        mocks.batchWrite.mockResolvedValue({});

        const first = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'first']);
        const second = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'second']);
        await vi.waitFor(() => expect(mocks.readDataRows).toHaveBeenCalledTimes(1));
        finishFirstRead([]);
        await Promise.all([first, second]);

        expect(mocks.appendRows).toHaveBeenCalledTimes(1);
        expect(mocks.batchWrite).toHaveBeenCalledTimes(1);
        expect(mocks.batchWrite.mock.calls[0][1][0].values).toEqual([['2026-07-05', 'second']]);
    });

    it('retires an older retry-queued value when the next serialized live write succeeds', async () => {
        mocks.readDataRows
            .mockRejectedValueOnce({ status: 503 })
            .mockResolvedValueOnce([]);
        mocks.appendRows.mockResolvedValue({});

        const older = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'older']);
        const latest = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'latest']);
        await Promise.all([older, latest]);

        expect(mocks.appendRows).toHaveBeenCalledTimes(1);
        expect(mocks.appendRows.mock.calls[0][2]).toEqual([['2026-07-05', 'latest']]);
        expect(pendingCount()).toBe(0);
    });

    it('serializes and verifies known-row updates under the same date lock', async () => {
        let finishFirstWrite;
        mocks.readDataRows.mockResolvedValue([['2026-07-05', 'stored']]);
        mocks.batchWrite
            .mockImplementationOnce(() => new Promise(resolve => { finishFirstWrite = resolve; }))
            .mockResolvedValueOnce({});

        const first = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'first'], 2);
        const second = resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'second'], 2);
        await vi.waitFor(() => expect(mocks.batchWrite).toHaveBeenCalledTimes(1));
        expect(mocks.readDataRows).toHaveBeenCalledTimes(1);
        finishFirstWrite({});
        await Promise.all([first, second]);

        expect(mocks.batchWrite).toHaveBeenCalledTimes(2);
        expect(mocks.readDataRows).toHaveBeenCalledTimes(2);
        expect(mocks.batchWrite.mock.calls[1][1][0].values).toEqual([['2026-07-05', 'second']]);
    });

    it('rejects a stale known-row hint and locates the matching date before writing', async () => {
        mocks.readDataRows.mockResolvedValue([
            ['2026-07-04', 'other'],
            ['2026-07-05', 'stored'],
        ]);
        mocks.batchWrite.mockResolvedValue({});

        await resilientUpsertDateRow('id', 'DailyWins!A:F', ['2026-07-05', 'latest'], 2);

        expect(mocks.batchWrite.mock.calls[0][1][0].range).toBe('DailyWins!A3:F3');
    });
});

describe('resilientUpsertKeyedRow', () => {
    it('coalesces offline snapshots by all stable key columns', async () => {
        setOnline(false);
        await resilientUpsertKeyedRow('id', 'HabitNotes!A:C', ['2026-08-13', 'habit-1', 'old'], [0, 1]);
        await resilientUpsertKeyedRow('id', 'HabitNotes!A:C', ['2026-08-13', 'habit-1', 'latest'], [0, 1]);

        expect(storedQueue()).toHaveLength(1);
        expect(storedQueue()[0].row[2]).toBe('latest');
    });

    it('updates the matching composite-key row rather than appending', async () => {
        mocks.readDataRows.mockResolvedValue([
            ['2026-08-13', 'habit-2', 'other'],
            ['2026-08-13', 'habit-1', 'old'],
        ]);
        mocks.batchWrite.mockResolvedValue({});

        await resilientUpsertKeyedRow(
            'id', 'HabitNotes!A:C', ['2026-08-13', 'habit-1', 'latest'], [0, 1],
        );

        expect(mocks.appendRows).not.toHaveBeenCalled();
        expect(mocks.batchWrite.mock.calls[0][1][0]).toEqual({
            range: 'HabitNotes!A3:C3',
            values: [['2026-08-13', 'habit-1', 'latest']],
        });
    });
});

describe('resilientAppendUniqueRow', () => {
    it('coalesces offline writes with the same stable key', async () => {
        setOnline(false);
        await resilientAppendUniqueRow('id', 'FocusLogs!A:E', ['2026-08-13', '09:00', 25, 'work', 'session-1']);
        await resilientAppendUniqueRow('id', 'FocusLogs!A:E', ['2026-08-13', '09:00', 25, 'work', 'session-1']);

        const queue = storedQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('appendUniqueRow');
    });

    it('does not append when the stable key already exists', async () => {
        mocks.readDataRows.mockResolvedValue([
            ['2026-08-12', '09:00', 25, 'work'],
            ['2026-08-13', '09:00', 25, 'work', 'session-1'],
        ]);

        const result = await resilientAppendUniqueRow(
            'id',
            'FocusLogs!A:E',
            ['2026-08-13', '09:00', 25, 'work', 'session-1'],
        );

        expect(result).toEqual({ deduplicated: true });
        expect(mocks.appendRows).not.toHaveBeenCalled();
    });
});
