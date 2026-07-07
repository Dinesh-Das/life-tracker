import { nudgeWeekKey } from './nudges';

/**
 * Habit decay warnings — flag habits whose completion is sliding before
 * the streak actually breaks, by comparing the last 7 days against the
 * prior 7.
 *
 * Frozen ('skip') days count as completions here: a deliberately frozen
 * day is not decay.
 */

const DISMISS_KEY = 'lt_decay_dismissed';

/**
 * @param {Array<{id:string,name:string,emoji:string}>} habits
 * @param {Object} seriesByHabitId { [habitId]: Array(14) of true|false|'skip' } oldest → newest
 * @param {Object} [opts]
 * @param {number} [opts.minPriorDone=4] habit must have been at least this active in the prior week
 * @param {number} [opts.minDrop=3]      completions lost week-over-week to warn
 * @returns [{habitId, name, emoji, prior, recent, drop}] steepest drop first
 */
export function habitDecayWarnings(habits, seriesByHabitId, { minPriorDone = 4, minDrop = 3 } = {}) {
    const doneCount = (slice) => slice.filter(v => v === true || v === 'skip').length;
    const warnings = [];
    habits.forEach((h) => {
        const series = seriesByHabitId[h.id];
        if (!series || series.length < 14) return;
        const prior = doneCount(series.slice(0, 7));
        const recent = doneCount(series.slice(7, 14));
        if (prior >= minPriorDone && prior - recent >= minDrop) {
            warnings.push({ habitId: h.id, name: h.name, emoji: h.emoji, prior, recent, drop: prior - recent });
        }
    });
    return warnings.sort((a, b) => b.drop - a.drop);
}

/** True when the user hid decay warnings for the current ISO week. */
export function decayDismissedThisWeek(now = new Date()) {
    try {
        return localStorage.getItem(DISMISS_KEY) === nudgeWeekKey(now);
    } catch {
        return false;
    }
}

/** Hide decay warnings until next ISO week. */
export function dismissDecayForWeek(now = new Date()) {
    try {
        localStorage.setItem(DISMISS_KEY, nudgeWeekKey(now));
    } catch { /* noop */ }
}