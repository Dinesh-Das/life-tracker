import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';

const mocks = vi.hoisted(() => ({
    readRange: vi.fn(),
    batchWrite: vi.fn(),
    recomputeStreaksForHabit: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({
    readRange: mocks.readRange,
    batchWrite: mocks.batchWrite,
    colIndexToLabel: (index) => {
        let label = '';
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        return label;
    },
}));
vi.mock('../lib/streakRecompute', () => ({
    recomputeStreaksForHabit: mocks.recomputeStreaksForHabit,
}));
vi.mock('react-hot-toast', () => ({
    default: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import { useSkipDay } from './useSkipDay';

let container;
let root;
let latest;

function Probe() {
    latest = useSkipDay('sheet', 'Jul', 2026);
    return null;
}

function habitRow(day = 17, value = '') {
    const row = Array(33).fill('');
    row[0] = 'Habit';
    row[day] = value;
    row[32] = 'habit-1';
    return row;
}

function mockRanges(streakSnapshots, monthValue = '') {
    let streakRead = 0;
    mocks.readRange.mockImplementation(async (_spreadsheetId, range) => {
        if (range === 'Streaks!A2:E') {
            const snapshot = streakSnapshots[Math.min(streakRead, streakSnapshots.length - 1)];
            streakRead += 1;
            return snapshot;
        }
        return [habitRow(17, monthValue)];
    });
}

beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.batchWrite.mockResolvedValue();
    mocks.recomputeStreaksForHabit.mockResolvedValue();
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
});

async function renderHook() {
    await act(async () => root.render(<Probe />));
    await vi.waitFor(() => expect(latest.loading).toBe(false));
}

describe('useSkipDay', () => {
    it('charges only once when the freeze action is clicked repeatedly', async () => {
        mockRanges([[['habit-1', 0, 28, '', 28]]]);
        await renderHook();

        let results;
        await act(async () => {
            results = await Promise.all([
                latest.skipDay(17, [{ id: 'habit-1' }], { 'habit-1': { 17: false } }),
                latest.skipDay(17, [{ id: 'habit-1' }], { 'habit-1': { 17: false } }),
            ]);
        });

        expect(results).toEqual([true, false]);
        expect(mocks.batchWrite).toHaveBeenCalledTimes(1);
        expect(mocks.batchWrite.mock.calls[0][1]).toEqual([
            { range: "'Jul 2026'!R6", values: [['S']] },
            { range: 'Streaks!A3:E3', values: [['_skipTokens', 1, '', '', '']] },
        ]);
        expect(latest.used).toBe(1);
        // Four lifetime-earned tokens with a three-token cap still leave the
        // bank full after the first spend.
        expect(latest.tokens).toBe(3);
        expect(latest.skipping).toBe(false);
    });

    it('does not charge a day that is already frozen in the sheet', async () => {
        mockRanges([[['habit-1', 0, 7, '', 7], ['_skipTokens', 0, '', '', '']]], 'S');
        await renderHook();

        let result;
        await act(async () => {
            result = await latest.skipDay(17, [{ id: 'habit-1' }], { 'habit-1': { 17: false } });
        });

        expect(result).toBe(false);
        expect(mocks.batchWrite).not.toHaveBeenCalled();
        expect(mocks.toastSuccess).toHaveBeenCalledWith('This day is already frozen — no token used');
    });

    it('revalidates the live balance before charging', async () => {
        mockRanges([
            [['habit-1', 0, 7, '', 7], ['_skipTokens', 0, '', '', '']],
            [['habit-1', 0, 7, '', 7], ['_skipTokens', 1, '', '', '']],
        ]);
        await renderHook();

        let result;
        await act(async () => {
            result = await latest.skipDay(17, [{ id: 'habit-1' }], { 'habit-1': { 17: false } });
        });

        expect(result).toBe(false);
        expect(mocks.batchWrite).not.toHaveBeenCalled();
        expect(latest.tokens).toBe(0);
        expect(latest.used).toBe(1);
    });

    it('updates duplicate legacy token rows to one canonical value', async () => {
        const rows = [
            ['habit-1', 0, 21, '', 21],
            ['_skipTokens', 0, '', '', ''],
            ['_skipTokens', 1, '', '', ''],
        ];
        mockRanges([rows]);
        await renderHook();

        await act(async () => {
            await latest.skipDay(17, [{ id: 'habit-1' }], { 'habit-1': { 17: false } });
        });

        expect(mocks.batchWrite.mock.calls[0][1]).toContainEqual({
            range: 'Streaks!B3', values: [[2]],
        });
        expect(mocks.batchWrite.mock.calls[0][1]).toContainEqual({
            range: 'Streaks!B4', values: [[2]],
        });
        expect(latest.used).toBe(2);
        expect(latest.tokens).toBe(1);
    });
});
