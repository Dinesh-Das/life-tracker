import { useState, useEffect, useMemo } from 'react';
import { readRange, colIndexToLabel } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';
import { habitDecayWarnings, decayDismissedThisWeek, dismissDecayForWeek } from '../lib/decay';

/**
 * Habit decay warnings — compares each habit's last 7 days against the
 * prior 7 (a 14-day window ending yesterday) and flags sharp drops
 * before the streak actually breaks.
 *
 * Pass the FULL habit list (sheet row order): when the window crosses a
 * month boundary the previous month tab is fetched once and its rows are
 * aligned by index. Warnings are dismissable for the current ISO week.
 */
export function useDecayWarnings(spreadsheetId, habits, checks, isCurrentMonth) {
    const [prevRows, setPrevRows] = useState(null); // null = not resolved yet
    const [dismissed, setDismissed] = useState(() => decayDismissedThisWeek());

    const todayDay = new Date().getDate();
    // The window ends yesterday: yesterday-13 must land inside this month,
    // otherwise the previous month tab is needed.
    const needsPrevMonth = isCurrentMonth && todayDay < 15;

    useEffect(() => {
        if (!spreadsheetId || !isCurrentMonth) return;
        if (!needsPrevMonth) {
            setPrevRows([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const now = new Date();
                const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                const tab = `${MONTHS[prevLastDay.getMonth()]} ${prevLastDay.getFullYear()}`;
                const rows = await readRange(spreadsheetId, `'${tab}'!B6:${colIndexToLabel(prevLastDay.getDate())}20`);
                if (!cancelled) setPrevRows(rows || []);
            } catch {
                // Previous month tab missing — treat as no data (no warnings fire)
                if (!cancelled) setPrevRows([]);
            }
        })();
        return () => { cancelled = true; };
    }, [spreadsheetId, isCurrentMonth, needsPrevMonth]);

    const warnings = useMemo(() => {
        if (!isCurrentMonth || dismissed || prevRows === null || habits.length === 0) return [];
        const now = new Date();
        const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

        const valueFor = (habitIdx, habitId, day) => {
            if (day >= 1) {
                const v = checks[habitId]?.[day];
                return v === 'skip' ? 'skip' : v === true;
            }
            const raw = prevRows?.[habitIdx]?.[daysInPrevMonth + day - 1]; // day <= 0 → previous month
            if (raw === 'S' || raw === 's') return 'skip';
            return raw === true || raw === 'TRUE' || raw === '✓';
        };

        const series = {};
        habits.forEach((h, idx) => {
            const s = [];
            for (let offset = 13; offset >= 0; offset--) {
                s.push(valueFor(idx, h.id, todayDay - 1 - offset));
            }
            series[h.id] = s;
        });
        return habitDecayWarnings(habits, series);
    }, [habits, checks, prevRows, dismissed, isCurrentMonth, todayDay]);

    const dismissForWeek = () => {
        dismissDecayForWeek();
        setDismissed(true);
    };

    return { warnings, dismissForWeek };
}