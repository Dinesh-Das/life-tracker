import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
    readDataRows: vi.fn(),
    ensureJournalSheet: vi.fn(),
    getPendingDateRow: vi.fn(),
    resilientUpsertDateRow: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({ readDataRows: mocks.readDataRows }));
vi.mock('../lib/sheetScaffold', () => ({ ensureJournalSheet: mocks.ensureJournalSheet }));
vi.mock('../lib/syncQueue', () => ({
    getPendingDateRow: mocks.getPendingDateRow,
    resilientUpsertDateRow: mocks.resilientUpsertDateRow,
}));
vi.mock('react-hot-toast', () => {
    const toast = vi.fn();
    toast.error = vi.fn();
    return { default: toast };
});

import { useJournal } from './useJournal';

let container;
let root;
let current;

function Probe() {
    current = useJournal('sheet', '2026-09-07');
    return null;
}

beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    mocks.readDataRows.mockResolvedValue([['2026-09-07', '', 'server review', '']]);
    mocks.getPendingDateRow.mockReturnValue(['2026-09-07', 'offline gratitude', '', '']);
    container = document.createElement('div');
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});

describe('useJournal offline pending state', () => {
    it('loads the pending logical row instead of stale cached sheet values', async () => {
        await act(async () => root.render(<Probe />));
        await vi.waitFor(() => expect(current.loading).toBe(false));

        expect(current.journal).toEqual({
            gratitude: 'offline gratitude',
            review: '',
            focus: '',
        });
        expect(mocks.getPendingDateRow)
            .toHaveBeenCalledWith('sheet', 'JournalLogs!A:D', '2026-09-07');
    });
});
