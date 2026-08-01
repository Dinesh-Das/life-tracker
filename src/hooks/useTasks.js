import { useState, useEffect, useCallback, useRef } from 'react';
import { readDataRows, appendRows, batchWrite } from '../lib/sheetsApi';
import toast from 'react-hot-toast';

export function useTasks(spreadsheetId, year, monthIndex, weekNumber) {
    const [tasks, setTasks] = useState({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const generation = useRef(0);

    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}-M${monthIndex}`;

    const loadTasks = useCallback(async () => {
        if (!spreadsheetId) return;
        const request = ++generation.current;
        setLoading(true);
        setError(null);
        setTasks({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
        try {
            const rows = await readDataRows(spreadsheetId, 'Weekly!A:I');

            const grouped = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
            rows.forEach((row, idx) => {
                // Filter by weekKey if present, otherwise show all
                const rowWeekKey = row[0];
                if (rowWeekKey && rowWeekKey !== weekKey) return;

                const dayIdx = parseInt(row[3]);
                if (dayIdx >= 0 && dayIdx <= 6 && row[5]) {
                    grouped[dayIdx].push({
                        id: row[4] || (row[0] + idx),
                        text: row[5],
                        done: row[6] === 'TRUE' || row[6] === true,
                        sheetRow: idx + 2
                    });
                }
            });
            if (request === generation.current) setTasks(grouped);
        } catch (error) {
            if (request === generation.current) {
                console.error('Failed to load tasks:', error);
                setError(error);
            }
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [spreadsheetId, weekKey]);

    useEffect(() => {
        loadTasks();
        return () => { generation.current += 1; };
    }, [loadTasks]);

    const toggleTask = async (dayIndex, taskId) => {
        const task = tasks[dayIndex].find(t => t.id === taskId);
        if (!task) return;

        const newVal = !task.done;
        setTasks(prev => ({
            ...prev,
            [dayIndex]: prev[dayIndex].map(t => t.id === taskId ? { ...t, done: newVal } : t)
        }));

        try {
            await batchWrite(spreadsheetId, [{
                range: `Weekly!G${task.sheetRow}`,
                values: [[newVal]]
            }]);
        } catch (_error) {
            toast.error('Sync failed');
            loadTasks();
        }
    };

    const addTask = async (dayIndex, text) => {
        const taskId = String(Date.now());
        const dateStr = new Date().toISOString();
        const order = (tasks[dayIndex]?.length || 0) + 1;

        // Optimistic
        setTasks(prev => ({
            ...prev,
            [dayIndex]: [...(prev[dayIndex] || []), { id: taskId, text, done: false, sheetRow: -1 }]
        }));

        try {
            await appendRows(spreadsheetId, 'Weekly!A:I', [[
                weekKey,
                String(year),
                String(monthIndex),
                String(dayIndex),
                taskId,
                text,
                'FALSE',
                dateStr,
                String(order),
            ]]);
            loadTasks(); // Reload to get correct sheetRow
        } catch (_error) {
            toast.error('Add failed');
            loadTasks();
        }
    };

    const deleteTask = async (dayIndex, taskId) => {
        const task = tasks[dayIndex].find(t => t.id === taskId);
        if (!task || task.sheetRow < 0) return;

        setTasks(prev => ({
            ...prev,
            [dayIndex]: prev[dayIndex].filter(t => t.id !== taskId)
        }));

        try {
            await batchWrite(spreadsheetId, [{
                range: `Weekly!A${task.sheetRow}:I${task.sheetRow}`,
                values: [['', '', '', '', '', '', '', '', '']]
            }]);
        } catch (_error) {
            toast.error('Delete failed');
            loadTasks();
        }
    };

    const updateTask = async (dayIndex, taskId, updates) => {
        const task = tasks[dayIndex].find(t => t.id === taskId);
        if (!task) return;

        setTasks(prev => ({
            ...prev,
            [dayIndex]: prev[dayIndex].map(t => t.id === taskId ? { ...t, ...updates } : t)
        }));

        if (updates.text && task.sheetRow > 0) {
            try {
                await batchWrite(spreadsheetId, [{
                    range: `Weekly!F${task.sheetRow}`,
                    values: [[updates.text]]
                }]);
            } catch (_error) {
                toast.error('Update failed');
            }
        }
    };

    return { tasks, loading, error, toggleTask, addTask, deleteTask, updateTask, reload: loadTasks };
}
