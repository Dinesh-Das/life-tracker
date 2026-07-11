import { useState, useEffect } from 'react';
import { batchRead, getSpreadsheet } from '../lib/sheetsApi';
import { yearsFromSheetTitles, monthTabsForYear, computeYearSummary } from '../lib/wrappedComparison';

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
                const spreadsheet = await getSpreadsheet(spreadsheetId);
                const titles = (spreadsheet.sheets || []).map(s => s.properties.title);
                // Legacy bare-month tabs predate the "Mon YYYY" naming; attribute
                // them to the real current year (same assumption as useDashboard).
                const legacyYear = new Date().getFullYear();
                const years = yearsFromSheetTitles(titles, legacyYear);

                const perYear = await Promise.all(years.map(async (year) => {
                    const tabs = monthTabsForYear(titles, year, legacyYear);
                    if (tabs.length === 0) return computeYearSummary(year, []);
                    const res = await batchRead(spreadsheetId, tabs.map(t => `'${t.title}'!B6:AF`));
                    const grids = tabs.map((t, i) => ({ month: t.month, rows: res?.[i]?.values || [] }));
                    return computeYearSummary(year, grids);
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
