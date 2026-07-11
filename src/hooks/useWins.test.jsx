import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';

const mocks = vi.hoisted(() => ({
    readDataRows: vi.fn(),
    ensureDailyWinsSheet: vi.fn(),
    resilientBatchWrite: vi.fn(),
    resilientAppendRows: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({ readDataRows: mocks.readDataRows }));
vi.mock('../lib/sheetScaffold', () => ({ ensureDailyWinsSheet: mocks.ensureDailyWinsSheet }));
vi.mock('../lib/syncQueue', () => ({
    resilientBatchWrite: mocks.resilientBatchWrite,
    resilientAppendRows: mocks.resilientAppendRows,
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
});
