import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
    readDataRows: vi.fn(),
    appendRows: vi.fn(),
    batchWrite: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({
    readDataRows: mocks.readDataRows,
    appendRows: mocks.appendRows,
    batchWrite: mocks.batchWrite,
}));
vi.mock('react-hot-toast', () => {
    const toast = vi.fn();
    toast.error = vi.fn();
    return { default: toast };
});

import { useTasks } from './useTasks';

let container;
let root;
let current;

function Probe() {
    current = useTasks('sheet', 2026, 8, 1, new Date(2026, 7, 31));
    return null;
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.readDataRows.mockResolvedValue([
        ['2026-W06-M7', '2026', '7', '0', 'task-1', 'Carry across month', 'FALSE', '', '1'],
    ]);
    container = document.createElement('div');
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
});

describe('useTasks week identity', () => {
    it('shows a legacy August task in the same week when that week is viewed from September', async () => {
        await act(async () => root.render(<Probe />));
        await vi.waitFor(() => expect(current.loading).toBe(false));

        expect(current.tasks[0]).toHaveLength(1);
        expect(current.tasks[0][0].text).toBe('Carry across month');
    });
});
