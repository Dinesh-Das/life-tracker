import { useState, useEffect } from 'react';
import { batchRead, getSpreadsheet } from '../lib/sheetsApi';
import { loadAllHabits } from '../lib/habitRepository';
import { MONTH_HABIT_ID_INDEX, habitLabel, normalizeHabitLabel, normalizeHabitName } from '../lib/sheetLayout';
import { computeYearSummary, yearsFromSheetTitles } from '../lib/wrappedComparison';
import {
    inferLegacyMonthYears, legacyMonthTitles, mergeMonthHabitRows, monthTabSources,
} from '../lib/yearlyRows';

/**
 * Multi-year Wrapped comparison — discovers every year with month tabs
 * and reduces each to a summary (one batched read per year, following
 * the same tab-mapping conventions as useDashboard).
 *
 * @returns {{ summaries: Array, loading: boolean }} summaries sorted newest first
 */
export function useWrappedComparison(spreadsheetId) {
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!spreadsheetId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            setSummaries([]);
            try {
                const [spreadsheet, habits] = await Promise.all([
                    getSpreadsheet(spreadsheetId),
                    loadAllHabits(spreadsheetId),
                ]);
                const titles = (spreadsheet.sheets || []).map(s => s.properties.title);
                const bareTitles = legacyMonthTitles(titles);
                const bareHeaders = bareTitles.length
                    ? await batchRead(spreadsheetId, bareTitles.map(title => `'${title}'!A1`))
                    : [];
                const legacyYears = inferLegacyMonthYears(titles, bareHeaders);
                const years = yearsFromSheetTitles(titles, legacyYears);

                const byId = new Map(habits.map(habit => [habit.id, habit]));
                const byLabel = new Map();
                const byName = new Map();
                habits.forEach(habit => {
                    const label = normalizeHabitLabel(habitLabel(habit));
                    byLabel.set(label, [...(byLabel.get(label) || []), habit]);
                    const name = normalizeHabitName(habit.name);
                    byName.set(name, [...(byName.get(name) || []), habit]);
                });
                const resolveHabit = row => {
                    let habit = byId.get(String(row?.[MONTH_HABIT_ID_INDEX] || ''));
                    if (!habit) {
                        const exact = byLabel.get(normalizeHabitLabel(row?.[0])) || [];
                        const matches = exact.length ? exact : (byName.get(normalizeHabitName(row?.[0], { legacyLabel: true })) || []);
                        if (matches.length === 1) habit = matches[0];
                    }
                    return habit;
                };

                let globalPause = null;
                if (titles.includes('AppSettings')) {
                    const settings = await batchRead(spreadsheetId, ['AppSettings!A2:C']);
                    const values = Object.fromEntries((settings[0]?.values || []).filter(row => row[0]).map(row => [String(row[0]), String(row[1] || '')]));
                    globalPause = { from: values.pauseFrom || '', until: values.pauseUntil || '' };
                }

                const perYear = await Promise.all(years.map(async (year) => {
                    const mappings = monthTabSources(titles, year, legacyYears);
                    if (mappings.length === 0) return computeYearSummary(year, [], { globalPause });
                    const responses = await batchRead(spreadsheetId, mappings.map(t => `'${t.title}'!A6:AG`));
                    const merged = mergeMonthHabitRows(mappings, responses, resolveHabit);
                    const grids = [...merged].map(([month, rows]) => ({ month, rows }));
                    return computeYearSummary(year, grids, { globalPause });
                }));

                if (!cancelled) setSummaries(perYear);
            } catch (e) {
                console.error('Wrapped comparison fetch failed', e);
                if (!cancelled) {
                    setError(e);
                    setSummaries([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [spreadsheetId]);

    return { summaries, loading, error };
}
