import { useState, useEffect, useCallback, useRef } from 'react';
import { loadAllHabits, replaceActiveHabits } from '../lib/habitRepository';
import toast from 'react-hot-toast';

export function useSettings(spreadsheetId) {
    const [habits, setHabits] = useState([]);
    const [archivedHabits, setArchivedHabits] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const generation = useRef(0);

    const loadSettings = useCallback(async () => {
        if (!spreadsheetId) return;
        const request = ++generation.current;
        setStatus('loading');
        setError(null);
        setHabits([]);
        setArchivedHabits([]);
        try {
            const rows = await loadAllHabits(spreadsheetId);
            if (request !== generation.current) return;
            setHabits(rows.filter(habit => !habit.archivedAt));
            setArchivedHabits(rows.filter(habit => habit.archivedAt));
            setStatus('success');
        } catch (loadError) {
            if (request !== generation.current) return;
            console.error('Failed to load settings:', loadError);
            setError(loadError);
            setStatus('error');
        }
    }, [spreadsheetId]);

    useEffect(() => {
        loadSettings();
        return () => { generation.current += 1; };
    }, [loadSettings]);

    const saveHabits = async (newHabits) => {
        if (status === 'error' || status === 'loading') {
            toast.error('Habits are not loaded yet. Retry before making changes.');
            return false;
        }
        setSaving(true);
        try {
            const all = await replaceActiveHabits(spreadsheetId, newHabits);
            setHabits(all.filter(habit => !habit.archivedAt));
            setArchivedHabits(all.filter(habit => habit.archivedAt));
            setStatus('success');
            toast.success('Habits updated');
            return true;
        } catch (saveError) {
            setError(saveError);
            setStatus('error');
            toast.error('Failed to save habits');
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        habits,
        archivedHabits,
        loading: status === 'loading',
        saving,
        status,
        error,
        saveHabits,
        refresh: loadSettings,
    };
}
