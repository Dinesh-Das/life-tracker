import { useState, useEffect, useCallback } from 'react';
import { readRange, batchWrite } from '../lib/sheetsApi';
import toast from 'react-hot-toast';

export function useSettings(spreadsheetId) {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try {
            const rows = await readRange(spreadsheetId, 'Settings!A2:J50');
            const loadedHabits = rows
                .filter(row => row[1]) // has a name
                .map(row => ({
                    id: row[0],
                    name: row[1],
                    emoji: row[2] || '✨',
                    goal: parseInt(row[3]) || 30,
                    category: row[4] || 'Health',
                    femaleOnly: row[5] === 'TRUE' || row[5] === true,
                    frequency: row[6] || 'Daily',
                    order: parseInt(row[7]) || 1,
                    color: row[9] || '',
                }));

            setHabits(loadedHabits);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const saveHabits = async (newHabits) => {
        setSaving(true);
        try {
            // Clear existing rows first, then write new ones
            const clearRange = 'Settings!A2:J50';
            const emptyRows = Array(49).fill(0).map(() => Array(10).fill(''));

            // Write new data
            const data = [
                {
                    range: clearRange,
                    values: newHabits.map(h => [
                        h.id, h.name, h.emoji || '✨', h.goal || 30, h.category || 'Health',
                        h.femaleOnly ? 'TRUE' : 'FALSE',
                        h.frequency || 'Daily', h.order || 1, new Date().toISOString(), h.color || ''
                    ]).concat(emptyRows.slice(newHabits.length))
                }
            ];
            await batchWrite(spreadsheetId, data);
            setHabits(newHabits);
            toast.success('Habits updated');
        } catch (error) {
            toast.error('Failed to save habits');
        } finally {
            setSaving(false);
        }
    };

    return { habits, loading, saving, saveHabits, refresh: loadSettings };
}
