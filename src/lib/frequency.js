/**
 * Weekly frequency goals — makes the Settings `frequency` column
 * ('Daily', '3x/week', '5x/week', ...) actually mean something.
 */

/** Target completions per week for a habit's frequency string. */
export function weeklyTarget(frequency) {
    if (!frequency || frequency === 'Daily') return 7;
    const m = String(frequency).match(/(\d+)/);
    return m ? Math.min(7, Math.max(1, parseInt(m[1]))) : 7;
}

/**
 * Completions in the Monday-Sunday week containing `day`.
 * Only counts days inside the current month (cross-month weeks are partial).
 * @param {Object} dayChecks map of day-of-month -> true | 'skip' | false
 */
export function weeklyCount(dayChecks = {}, day, year, monthIndex) {
    const date = new Date(year, monthIndex, day);
    const dow = (date.getDay() + 6) % 7; // Monday = 0
    const start = day - dow;
    let count = 0;
    for (let d = start; d < start + 7; d++) {
        if (d >= 1 && dayChecks[d] === true) count++;
    }
    return count;
}