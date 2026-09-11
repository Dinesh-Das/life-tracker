import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    addSheet: vi.fn(),
    batchClear: vi.fn(),
    batchWrite: vi.fn(),
    getSpreadsheet: vi.fn(),
    collectAllData: vi.fn(),
    clearQueuedOperations: vi.fn(),
    withWorkbookWriteBarrier: vi.fn((_spreadsheetId, operation) => operation()),
}));

vi.mock('./sheetsApi', () => ({
    addSheet: mocks.addSheet,
    batchClear: mocks.batchClear,
    batchWrite: mocks.batchWrite,
    getSpreadsheet: mocks.getSpreadsheet,
}));
vi.mock('./exportData', () => ({
    collectAllData: mocks.collectAllData,
    download: vi.fn(),
}));
vi.mock('./habitRepository', () => ({
    ensureHabitsSheet: vi.fn(),
    loadAllHabits: vi.fn(),
    migrateHabitIdsAcrossMonths: vi.fn(),
}));
vi.mock('./sheetScaffold', () => ({
    ensureAppSettingsSheet: vi.fn(),
    ensureDailyStateSheet: vi.fn(),
    ensureFocusSheet: vi.fn(),
    ensureMetricsSheet: vi.fn(),
}));
vi.mock('./syncQueue', () => ({
    clearQueuedOperations: mocks.clearQueuedOperations,
    withWorkbookWriteBarrier: mocks.withWorkbookWriteBarrier,
}));

import { restoreBackup } from './backupRepair';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSpreadsheet.mockResolvedValue({ sheets: [{ properties: { title: 'Habits' } }] });
    mocks.collectAllData.mockResolvedValue({ Habits: [['ID', 'Habit Name']] });
    mocks.batchWrite.mockResolvedValue({});
    mocks.batchClear.mockResolvedValue({});
});

describe('restoreBackup', () => {
    it('rejects malformed rows before reading or clearing the workbook', async () => {
        await expect(restoreBackup('sheet', { sheets: { Habits: ['not-a-row'] } })).rejects.toThrow('Invalid row data');
        expect(mocks.getSpreadsheet).not.toHaveBeenCalled();
        expect(mocks.batchClear).not.toHaveBeenCalled();
    });

    it('does not clear current data when replacement writes fail', async () => {
        mocks.batchWrite.mockRejectedValue(new Error('network failed'));
        const backup = { sheets: { Habits: [['ID', 'Habit Name'], ['h1', 'Walk']] } };

        await expect(restoreBackup('sheet', backup)).rejects.toThrow('network failed');

        expect(mocks.batchWrite).toHaveBeenCalledOnce();
        expect(mocks.batchClear).not.toHaveBeenCalled();
        expect(mocks.clearQueuedOperations).not.toHaveBeenCalled();
    });

    it('serializes restore with workbook writes and invalidates pre-restore queued operations', async () => {
        const backup = { sheets: { Habits: [['ID', 'Habit Name'], ['h1', 'Walk']] } };

        await restoreBackup('sheet', backup);

        expect(mocks.withWorkbookWriteBarrier).toHaveBeenCalledWith('sheet', expect.any(Function));
        expect(mocks.batchWrite).toHaveBeenCalledOnce();
        expect(mocks.batchClear).toHaveBeenCalledOnce();
        expect(mocks.clearQueuedOperations).toHaveBeenCalledWith('sheet');
    });
});
