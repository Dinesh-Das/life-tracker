import { useState, useEffect } from 'react';
import { readRange } from '../lib/sheetsApi';
import { ensureSleepSheet } from '../lib/sheetScaffold';

/** Recent sleep entries for the Analytics trend chart. */
export function useSleepHistory(spreadsheetId, limit = 30) {
    const [sleepRows, setSleepRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!spreadsheetId) return;
            try {
                await ensureSleepSheet(spreadsheetId);
                const rows = await readRange(spreadsheetId, 'SleepLogs!A2:F500');
                const parsed = rows
                    .filter(r => r[0])
                    .map(r => {
                        const night = parseFloat(r[3]);
                        const napMin = parseInt(r[5]);
                        const hasNight = !Number.isNaN(night);
                        const hasNap = !Number.isNaN(napMin) && napMin > 0;
                        // Total rest = night sleep + naps
                        const hours = (hasNight || hasNap)
                            ? Math.round(((hasNight ? night : 0) + (hasNap ? napMin / 60 : 0)) * 10) / 10
                            : null;
                        return {
                            date: r[0],
                            hours,
                            quality: parseInt(r[4]) || null,
                        };
                    })
                    .filter(r => r.hours !== null || r.quality !== null)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(-limit);
                if (alive) setSleepRows(parsed);
            } catch (e) {
                console.error('Failed to load sleep history', e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [spreadsheetId, limit]);

    return { sleepRows, loading };
}