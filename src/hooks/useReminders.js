import { useState, useEffect, useCallback } from 'react';
import { ensureNotificationPermission, scheduleEveningReminder, cancelReminder } from '../lib/notifications';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'lt_reminders';

/** Toggleable evening check-in reminder, persisted in localStorage. */
export function useReminders() {
    const [remindersOn, setRemindersOn] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; }
    });

    useEffect(() => {
        if (remindersOn) scheduleEveningReminder();
        else cancelReminder();
        return cancelReminder;
    }, [remindersOn]);

    const toggleReminders = useCallback(async () => {
        if (!remindersOn) {
            const ok = await ensureNotificationPermission();
            if (!ok) {
                toast.error('Notifications are blocked in your browser settings');
                return;
            }
            toast.success('Evening reminder on (8pm)');
        }
        setRemindersOn(v => {
            const next = !v;
            try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* noop */ }
            return next;
        });
    }, [remindersOn]);

    return { remindersOn, toggleReminders };
}