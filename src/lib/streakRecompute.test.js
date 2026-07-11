import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    appendRows: vi.fn(),
    batchRead: vi.fn(),
    batchWrite: vi.fn(),
    getSpreadsheet: vi.fn(),
    readRange: vi.fn(),
    loadAllHabits: vi.fn(),
}));

vi.mock('./sheetsApi', () => ({
    appendRows: mocks.appendRows,
    batchRead: mocks.batchRead,
    batchWrite: mocks.batchWrite,
    getSpreadsheet: mocks.getSpreadsheet,
    readRange: mocks.readRange,
}));
vi.mock('./habitRepository', () => ({ loadAllHabits: mocks.loadAllHabits }));

import { recomputeStreaksForHabits } from './streakRecompute';

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T12:00:00Z'));
    mocks.getSpreadsheet.mockResolvedValue({ sheets: [{ properties: { title: 'Jul 2026' } }] });
    mocks.loadAllHabits.mockResolvedValue([
        { id: 'h1', name: 'First', emoji: '1' },
        { id: 'h2', name: 'Second', emoji: '2' },
    ]);
    const row1 = ['1 First', true, true];
    const row2 = ['2 Second', true, '', true];
    row1[32] = 'h1';
    row2[32] = 'h2';
    mocks.batchRead.mockResolvedValue([{ values: [row1, row2] }]);
    mocks.readRange.mockResolvedValue([
        ['h1', 0, 0, '', 0],
        ['h2', 0, 0, '', 0],
    ]);
    mocks.batchWrite.mockResolvedValue({});
});

afterEach(() => vi.useRealTimers());

describe('recomputeStreaksForHabits', () => {
    it('reads month history once and writes multiple streak rows in one batch', async () => {
        const result = await recomputeStreaksForHabits('sheet', ['h1', 'h2']);

        expect(mocks.batchRead).toHaveBeenCalledTimes(1);
        expect(mocks.batchWrite).toHaveBeenCalledTimes(1);
        expect(mocks.batchWrite.mock.calls[0][1]).toHaveLength(2);
        expect(mocks.appendRows).not.toHaveBeenCalled();
        expect(result.h1.total).toBe(2);
        expect(result.h2.total).toBe(2);
    });
});
