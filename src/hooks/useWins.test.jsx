import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';

const mocks = vi.hoisted(() => ({
    readDataRows: vi.fn(),
    ensureDailyWinsSheet: vi.fn(),
    resilientUpsertDateRow: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({ readDataRows: mocks.readDataRows }));
vi.mock('../lib/sheetScaffold', () => ({ ensureDailyWinsSheet: mocks.ensureDailyWinsSheet }));
vi.mock('../lib/syncQueue', () => ({
    resilientUpsertDateRow: mocks.resilientUpsertDateRow,
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

import { useWins } from './useWins';

let container;
let root;
let latest;

function Probe({ date }) {
    latest = useWins('sheet', date);
    return null;
}

beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.ensureDailyWinsSheet.mockResolvedValue();
    mocks.readDataRows.mockResolvedValue([
        ['2026-07-03', 'old physical'],
        ['2026-07-04', '', 'mental four'],
        ['2026-07-03', 'new physical'],
    ]);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
});

describe('useWins selected-date flow', () => {
    it('loads the newest row and clears/reloads when the selected date changes', async () => {
        await act(async () => root.render(<Probe date="2026-07-03" />));
        await vi.waitFor(() => expect(latest.loading).toBe(false));
        expect(latest.wins.Physical).toBe('new physical');

        await act(async () => root.render(<Probe date="2026-07-04" />));
        await vi.waitFor(() => expect(latest.loading).toBe(false));
        expect(latest.wins.Physical).toBe('');
        expect(latest.wins.Mental).toBe('mental four');
    });

    it('surfaces read failures instead of presenting them as an empty day', async () => {
        mocks.readDataRows.mockRejectedValueOnce(new Error('quota exceeded'));
        await act(async () => root.render(<Probe date="2026-07-05" />));
        await vi.waitFor(() => expect(latest.loading).toBe(false));
        expect(latest.error?.message).toBe('quota exceeded');
    });

    it('loads cached rows offline without running a sheet-creation preflight', async () => {
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        await act(async () => root.render(<Probe date="2026-07-03" />));
        await vi.waitFor(() => expect(latest.loading).toBe(false));

        expect(mocks.ensureDailyWinsSheet).not.toHaveBeenCalled();
        expect(latest.wins.Physical).toBe('new physical');
    });

    it('serializes overlapping autosaves so an older value cannot finish last', async () => {
        await act(async () => root.render(<Probe date="2026-07-05" />));
        await vi.waitFor(() => expect(latest.loading).toBe(false));

        let finishFirst;
        const firstWrite = new Promise(resolve => { finishFirst = resolve; });
        mocks.resilientUpsertDateRow
            .mockImplementationOnce(() => firstWrite)
            .mockResolvedValueOnce({});
        vi.useFakeTimers();

        act(() => latest.saveWin('Physical', 'older value'));
        act(() => vi.advanceTimersByTime(800));
        await Promise.resolve();
        expect(mocks.resilientUpsertDateRow).toHaveBeenCalledTimes(1);

        act(() => latest.saveWin('Physical', 'newest value'));
        act(() => vi.advanceTimersByTime(800));
        await Promise.resolve();
        expect(mocks.resilientUpsertDateRow).toHaveBeenCalledTimes(1);

        await act(async () => {
            finishFirst({});
            await firstWrite;
            await Promise.resolve();
        });
        expect(mocks.resilientUpsertDateRow).toHaveBeenCalledTimes(2);
        expect(mocks.resilientUpsertDateRow.mock.calls[1][2][1]).toBe('newest value');
        vi.useRealTimers();
        await vi.waitFor(() => expect(latest.saving).toBe(false));
    });
});
