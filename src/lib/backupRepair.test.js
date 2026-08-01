import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    addSheet: vi.fn(),
    batchClear: vi.fn(),
    batchWrite: vi.fn(),
    getSpreadsheet: vi.fn(),
    collectAllData: vi.fn(),
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

import { restoreBackup } from './backupRepair';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSpreadsheet.mockResolvedValue({ sheets: [{ properties: { title: 'Habits' } }] });
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
    });
});
