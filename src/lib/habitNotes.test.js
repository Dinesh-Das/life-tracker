import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSpreadsheet: vi.fn(),
    addSheet: vi.fn(),
    batchWrite: vi.fn(),
    readRange: vi.fn(),
    resilientUpsertKeyedRow: vi.fn(),
    withOperationLock: vi.fn((_name, operation) => operation()),
}));

vi.mock('./sheetsApi', () => ({
    getSpreadsheet: mocks.getSpreadsheet,
    addSheet: mocks.addSheet,
    batchWrite: mocks.batchWrite,
    readRange: mocks.readRange,
}));

vi.mock('./syncQueue', () => ({
    resilientUpsertKeyedRow: mocks.resilientUpsertKeyedRow,
    withOperationLock: mocks.withOperationLock,
}));

import { loadNotesForHabit, saveNote } from './habitNotes';

beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    mocks.getSpreadsheet.mockResolvedValue({ sheets: [{ properties: { title: 'HabitNotes' } }] });
    mocks.resilientUpsertKeyedRow.mockResolvedValue({});
    mocks.readRange.mockResolvedValue([]);
});

describe('habit note persistence', () => {
    it('uses one composite-key upsert for both inserts and updates', async () => {
        await saveNote('notes-book-1', 'habit-1', '2026-08-14', 'latest note');

        expect(mocks.getSpreadsheet).toHaveBeenCalledWith('notes-book-1', {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        expect(mocks.resilientUpsertKeyedRow).toHaveBeenCalledWith(
            'notes-book-1',
            'HabitNotes!A:C',
            ['2026-08-14', 'habit-1', 'latest note'],
            [0, 1],
        );
    });

    it('queues an offline save without running a sheet-creation preflight', async () => {
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        mocks.resilientUpsertKeyedRow.mockResolvedValue({ queued: true });

        await expect(saveNote('notes-book-2', 'habit-1', '2026-08-14', 'offline note'))
            .resolves.toEqual({ queued: true });

        expect(mocks.getSpreadsheet).not.toHaveBeenCalled();
        expect(mocks.resilientUpsertKeyedRow).toHaveBeenCalledTimes(1);
    });

    it('loads cached notes offline without trying to ensure the sheet', async () => {
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        mocks.readRange.mockResolvedValue([
            ['2026-08-13', 'habit-1', 'kept going'],
            ['2026-08-14', 'habit-2', 'other'],
        ]);

        await expect(loadNotesForHabit('notes-book-3', 'habit-1')).resolves.toEqual([
            { row: 2, date: '2026-08-13', habitId: 'habit-1', note: 'kept going' },
        ]);
        expect(mocks.getSpreadsheet).not.toHaveBeenCalled();
    });
});
