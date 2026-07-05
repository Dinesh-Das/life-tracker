
/**
 * Pure last-N-days summary computed from month-level habit data.
 * The window is clamped to the start of the month (day 1).
 */
export function buildWeeklyReview(habits, checks, mentalState, todayDay, windowSize = 7) {
    const start = Math.max(1, todayDay - windowSize + 1);
    const days = [];
    for (let d = start; d <= todayDay; d++) days.push(d);
    if (habits.length === 0 || days.length === 0) return null;

    let done = 0;
    const perHabit = habits.map(h => {
        let count = 0;
        days.forEach(d => {
            if (checks[h.id]?.[d]) {
                count++;
                done++;
            }
        });
        return { id: h.id, name: h.name, emoji: h.emoji, count };
    });

    const possible = habits.length * days.length;
    const completionPct = possible > 0 ? Math.round((done / possible) * 100) : 0;

    const sorted = [...perHabit].sort((a, b) => b.count - a.count);
    const best = sorted[0];
    const worstCandidate = sorted[sorted.length - 1];
    const worst = worstCandidate.id === best.id ? null : worstCandidate;

    const avgMood = (ds) => {
        const vals = ds.map(d => mentalState[d]).filter(v => v !== undefined && v !== null);
        if (vals.length === 0) return null;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    };

    const prevDays = [];
    for (let d = Math.max(1, start - windowSize); d < start; d++) prevDays.push(d);

    return {
        days: days.length,
        completionPct,
        best,
        worst,
        moodAvg: avgMood(days),
        moodPrevAvg: avgMood(prevDays),
    };
}