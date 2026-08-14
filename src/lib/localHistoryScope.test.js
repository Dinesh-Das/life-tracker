import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearActivityLog,
    getActivityLog,
    recordActivity,
    removeActivity,
} from './activityLog';
import { loadFreezeLedger, recordFreezeEvent } from './freezeLedger';

beforeEach(() => localStorage.clear());

describe('workbook-scoped local history', () => {
    it('does not expose activity or undo snapshots to another workbook', () => {
        const entry = recordActivity('book-a', 'edit', 'Edited private habit', [{ name: 'Private habit' }]);

        expect(getActivityLog('book-a')).toHaveLength(1);
        expect(getActivityLog('book-b')).toEqual([]);
        removeActivity('book-b', entry.id);
        expect(getActivityLog('book-a')).toHaveLength(1);
        clearActivityLog('book-a');
        expect(getActivityLog('book-a')).toEqual([]);
    });

    it('does not expose freeze and repair history to another workbook', () => {
        recordFreezeEvent('book-a', { type: 'repair', date: '2026-08-01', habitName: 'Private habit' });

        expect(loadFreezeLedger('book-a')).toHaveLength(1);
        expect(loadFreezeLedger('book-b')).toEqual([]);
    });

    it('discards legacy unscoped history because its owner is unknown', () => {
        localStorage.setItem('lt_activity_log_v1', JSON.stringify([{ label: 'Account A' }]));
        localStorage.setItem('lt_freeze_ledger', JSON.stringify([{ habitName: 'Account A habit' }]));

        expect(getActivityLog('book-b')).toEqual([]);
        expect(loadFreezeLedger('book-b')).toEqual([]);
        expect(localStorage.getItem('lt_activity_log_v1')).toBeNull();
        expect(localStorage.getItem('lt_freeze_ledger')).toBeNull();
    });
});
