import { useState, useEffect } from 'react';
import { batchRead, getSpreadsheet } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';
import { loadAllHabits } from '../lib/habitRepository';
import { MONTH_HABIT_ID_INDEX, decodeCheck, habitLabel, normalizeHabitLabel, normalizeHabitName } from '../lib/sheetLayout';
import { format } from 'date-fns';

function activeOn(habit, dateKey) {
    return (!habit.activeFrom || habit.activeFrom <= dateKey) &&
        (!habit.archivedAt || habit.archivedAt.slice(0, 10) > dateKey);
}

export function useYearlyHistory(spreadsheetId, year) {
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            if (!spreadsheetId || !year) return;
            setLoading(true);
            setError(null);
            setHeatmapData([]);
            try {
                const [metadata, habits] = await Promise.all([
                    getSpreadsheet(spreadsheetId),
                    loadAllHabits(spreadsheetId),
                ]);
                const byId = new Map(habits.map(habit => [habit.id, habit]));
                const byLabel = new Map();
                const byName = new Map();
                habits.forEach(habit => {
                    const label = normalizeHabitLabel(habitLabel(habit));
                    const values = byLabel.get(label) || [];
                    values.push(habit);
                    byLabel.set(label, values);
                    const name = normalizeHabitName(habit.name);
                    const nameValues = byName.get(name) || [];
                    nameValues.push(habit);
                    byName.set(name, nameValues);
                });
                const titles = metadata.sheets.map(sheet => sheet.properties.title);
                const mappings = MONTHS.map(month => {
                    const titled = `${month} ${year}`;
                    if (titles.includes(titled)) return { month, title: titled };
                    if (titles.includes(month) && year === new Date().getFullYear()) return { month, title: month };
                    return null;
                }).filter(Boolean);
                const responses = mappings.length
                    ? await batchRead(spreadsheetId, mappings.map(mapping => `'${mapping.title}'!A6:AG`))
                    : [];
                const map = {};
                const todayKey = format(new Date(), 'yyyy-MM-dd');
                for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                    const days = new Date(year, monthIndex + 1, 0).getDate();
                    for (let day = 1; day <= days; day++) {
                        map[format(new Date(year, monthIndex, day), 'yyyy-MM-dd')] = { completed: 0, total: 0 };
                    }
                }
                responses.forEach((response, index) => {
                    const monthIndex = MONTHS.indexOf(mappings[index].month);
                    const days = new Date(year, monthIndex + 1, 0).getDate();
                    (response.values || []).forEach(row => {
                        let habit = byId.get(String(row?.[MONTH_HABIT_ID_INDEX] || ''));
                        if (!habit) {
                            const exact = byLabel.get(normalizeHabitLabel(row?.[0])) || [];
                            const matches = exact.length ? exact : (byName.get(normalizeHabitName(row?.[0], { legacyLabel: true })) || []);
                            if (matches.length === 1) habit = matches[0];
                        }
                        if (!habit) return;
                        for (let day = 1; day <= days; day++) {
                            const key = format(new Date(year, monthIndex, day), 'yyyy-MM-dd');
                            if (key > todayKey) continue;
                            if (!activeOn(habit, key)) continue;
                            map[key].total++;
                            if (decodeCheck(row[day]) === true) map[key].completed++;
                        }
                    });
                });
                const result = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => {
                    const pct = value.total ? Math.round((value.completed / value.total) * 100) : null;
                    const intensity = pct === null || pct === 0 ? 0 : Math.min(5, Math.ceil(pct / 20));
                    return { date, count: value.completed, total: value.total, pct, intensity };
                });
                if (active) setHeatmapData(result);
            } catch (loadError) {
                if (active) {
                    setHeatmapData([]);
                    setError(loadError);
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [spreadsheetId, year]);

    return { heatmapData, loading, error };
}
