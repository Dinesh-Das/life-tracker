/**
 * Pure analytics over month-level habit checks and mental-state ratings.
 * Turns recorded data into insight: which habits actually move your mood,
 * and which weekdays you're strongest/weakest on.
 */

/**
 * For each habit, compare average mental state on days it was completed
 * vs days it was missed. Only mood-rated days count; both sides need at
 * least `minSamples` days. Sorted by absolute effect size (delta).
 *
 * @param {Array<{id:string,name:string,emoji:string}>} habits
 * @param {Object} checks       checks[habitId][day] = boolean
 * @param {Object} mentalState  mentalState[day] = 1..10
 * @param {number} daysInMonth
 * @param {number} minSamples
 */
export function habitMoodCorrelations(habits, checks, mentalState, daysInMonth, minSamples = 3) {
    const results = [];

    for (const habit of habits) {
        let doneSum = 0, doneN = 0, missSum = 0, missN = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const mood = mentalState[d];
            if (mood === undefined || mood === null) continue;
            if (checks[habit.id]?.[d]) {
                doneSum += mood;
                doneN++;
            } else {
                missSum += mood;
                missN++;
            }
        }

        if (doneN >= minSamples && missN >= minSamples) {
            const doneAvg = doneSum / doneN;
            const missAvg = missSum / missN;
            results.push({
                habitId: habit.id,
                habitName: habit.name,
                emoji: habit.emoji,
                doneAvg: Math.round(doneAvg * 10) / 10,
                missAvg: Math.round(missAvg * 10) / 10,
                delta: Math.round((doneAvg - missAvg) * 10) / 10,
                samples: doneN + missN,
            });
        }
    }

    return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Completion rate per weekday across all habits, up to `upToDay`
 * (pass today's date for the current month to exclude future days).
 * Returns the strongest and weakest weekday, or nulls with no data.
 *
 * @param {Array} habits
 * @param {Object} checks     checks[habitId][day] = boolean
 * @param {number} upToDay
 * @param {number} year
 * @param {number} monthIndex 0-based month
 */
export function weekdayCompletion(habits, checks, upToDay, year, monthIndex) {
    const done = Array(7).fill(0);
    const possible = Array(7).fill(0);

    for (let d = 1; d <= upToDay; d++) {
        const wd = new Date(year, monthIndex, d).getDay();
        for (const habit of habits) {
            possible[wd]++;
            if (checks[habit.id]?.[d]) done[wd]++;
        }
    }

    const rates = WEEKDAYS
        .map((day, i) => ({
            day,
            pct: possible[i] > 0 ? Math.round((done[i] / possible[i]) * 100) : 0,
            samples: possible[i],
        }))
        .filter(r => r.samples > 0);

    if (rates.length === 0) return { best: null, worst: null };

    const sorted = [...rates].sort((a, b) => b.pct - a.pct);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
    }

/**
 * Next-day causality: average mood the day AFTER completing a habit vs
 * the day after missing it. Highlights habits whose effect carries over
 * into the next day (e.g. evening workouts → better mornings).
 */
export function habitNextDayMoodCorrelations(habits, checks, mentalState, daysInMonth, minSamples = 3) {
    const results = [];

    for (const habit of habits) {
        let doneSum = 0, doneN = 0, missSum = 0, missN = 0;

        for (let d = 1; d < daysInMonth; d++) {
            const nextMood = mentalState[d + 1];
            if (nextMood === undefined || nextMood === null) continue;
            if (checks[habit.id]?.[d] === true) {
                doneSum += nextMood;
                doneN++;
            } else {
                missSum += nextMood;
                missN++;
            }
        }

        if (doneN >= minSamples && missN >= minSamples) {
            const doneAvg = doneSum / doneN;
            const missAvg = missSum / missN;
            results.push({
                habitId: habit.id,
                habitName: habit.name,
                emoji: habit.emoji,
                doneAvg: Math.round(doneAvg * 10) / 10,
                missAvg: Math.round(missAvg * 10) / 10,
                delta: Math.round((doneAvg - missAvg) * 10) / 10,
                samples: doneN + missN,
            });
        }
    }

    return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

}