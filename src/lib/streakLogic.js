import { format, subDays, addDays, parseISO, differenceInCalendarDays } from 'date-fns';

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
 * True when every day strictly between dateA and dateB ('yyyy-MM-dd')
 * is present in the skipped set. Used so skip days bridge streak runs.
 */
function gapIsSkipped(dateA, dateB, skipped) {
    if (!skipped || skipped.size === 0) return false;
    let cursor = addDays(parseISO(dateA), 1);
    const end = parseISO(dateB);
    while (cursor < end) {
        if (!skipped.has(format(cursor, 'yyyy-MM-dd'))) return false;
        cursor = addDays(cursor, 1);
    }
    return true;
}

/**
 * Full recompute from the complete history of done dates.
 * Used after backfills so out-of-order writes can't corrupt streaks —
 * past entries retroactively repair current/best.
 *
 * current = length of the run ending today or yesterday (still alive), else 0.
 * Days in `skippedDates` bridge runs (streak survives) but never increment them.
 *
 * @param {string[]} doneDates    array of 'yyyy-MM-dd' strings (duplicates ok)
 * @param {string} todayStr       'yyyy-MM-dd' of today
 * @param {string[]} skippedDates array of 'yyyy-MM-dd' skip-day strings
 * @returns {{current:number, best:number, lastDone:string, total:number}}
 */
export function computeStreaks(doneDates, todayStr, skippedDates = []) {
    const skipped = new Set(skippedDates);
    const dates = [...new Set(doneDates)].sort();
    const total = dates.length;
    if (total === 0) return { current: 0, best: 0, lastDone: '', total: 0 };

    let best = 1;
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
        const diff = differenceInCalendarDays(parseISO(dates[i]), parseISO(dates[i - 1]));
        run = (diff === 1 || gapIsSkipped(dates[i - 1], dates[i], skipped)) ? run + 1 : 1;
        if (run > best) best = run;
    }

    const lastDone = dates[dates.length - 1];
    const gapFromToday = differenceInCalendarDays(parseISO(todayStr), parseISO(lastDone));
    const alive = gapFromToday >= 0 && (gapFromToday <= 1 || gapIsSkipped(lastDone, todayStr, skipped));
    const current = alive ? run : 0;

    return { current, best, lastDone, total };
}

/**
 * A streak is recoverable when exactly one day was missed:
 * lastDone is two calendar days before today. The user repairs it by
 * completing the habit today and marking yesterday as a skip ('S').
 */
export function canRecoverStreak(stats, todayStr) {
    if (!stats?.lastDone) return false;
    return differenceInCalendarDays(parseISO(todayStr), parseISO(stats.lastDone)) === 2;
}

/** Every full week of best streak earns one freeze token. */
export const FREEZE_EARN_INTERVAL = 7;

/**
  * Streak freeze budget — gamified: one token is earned per full
 * 7-day best streak, minus tokens already spent, capped so they
 * can't be hoarded.
 */
export function skipTokensAvailable(bestStreak, usedTokens, cap = 3) {
    const earned = Math.floor((bestStreak || 0) / FREEZE_EARN_INTERVAL);
    return Math.max(0, Math.min(earned - (usedTokens || 0), cap));
}

/**
 * Days of best-streak growth left until the next freeze token is earned.
 * e.g. best 5 → 2 more days; best 7 → 7 (the next token lands at 14).
 */
export function skipTokenProgress(bestStreak = 0, interval = FREEZE_EARN_INTERVAL) {
    return interval - ((bestStreak || 0) % interval);
}