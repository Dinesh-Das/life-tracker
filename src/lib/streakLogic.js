import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';

/**
 * Pure, incremental streak update for a single toggle on "today".
 * Mirrors the legacy behavior exactly — kept fast for the common path.
 *
 * @param {{current:number, best:number, lastDone:string, total:number}} stats
 * @param {string} dateStr    'yyyy-MM-dd' of the toggled day (must be today)
 * @param {boolean} isChecked new state of the checkbox
 * @returns {{current:number, best:number, lastDone:string, total:number}}
 */
export function applyDailyToggle(stats, dateStr, isChecked) {
    let { current = 0, best = 0, lastDone = '', total = 0 } = stats;
    const yesterdayStr = format(subDays(parseISO(dateStr), 1), 'yyyy-MM-dd');

    if (isChecked) {
        total++;
        if (lastDone === yesterdayStr) {
            current++;
        } else if (lastDone !== dateStr) {
            current = 1;
        }
        if (current > best) best = current;
        lastDone = dateStr;
    } else if (lastDone === dateStr) {
        total = Math.max(0, total - 1);
        current = Math.max(0, current - 1);
        lastDone = yesterdayStr; // Approximation
    }

    return { current, best, lastDone, total };
}

/**
 * Full recompute from the complete history of done dates.
 * Used after backfills so out-of-order writes can't corrupt streaks —
 * past entries retroactively repair current/best.
 *
 * current = length of the run ending today or yesterday (still alive), else 0.
 *
 * @param {string[]} doneDates array of 'yyyy-MM-dd' strings (duplicates ok)
 * @param {string} todayStr    'yyyy-MM-dd' of today
 * @returns {{current:number, best:number, lastDone:string, total:number}}
 */
export function computeStreaks(doneDates, todayStr) {
    const dates = [...new Set(doneDates)].sort();
    const total = dates.length;
    if (total === 0) return { current: 0, best: 0, lastDone: '', total: 0 };

    let best = 1;
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
        const diff = differenceInCalendarDays(parseISO(dates[i]), parseISO(dates[i - 1]));
        run = diff === 1 ? run + 1 : 1;
        if (run > best) best = run;
    }

    const lastDone = dates[dates.length - 1];
    const gapFromToday = differenceInCalendarDays(parseISO(todayStr), parseISO(lastDone));
    const current = gapFromToday >= 0 && gapFromToday <= 1 ? run : 0;

    return { current, best, lastDone, total };
}