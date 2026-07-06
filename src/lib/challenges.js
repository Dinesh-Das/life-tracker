/**
 * Monthly challenges computed from this month's checks.
 * A day counts as "complete" when every habit is done (skips tolerated,
 * but at least one real completion required).
 */
export function monthlyChallenges(habits, checks, daysInMonth, upToDay) {
    const list = [];
    if (!habits || habits.length === 0 || !upToDay) return list;

    const dayComplete = (d) =>
        habits.every(h => checks[h.id]?.[d] === true || checks[h.id]?.[d] === 'skip') &&
        habits.some(h => checks[h.id]?.[d] === true);

    // Perfect Week — 7 consecutive fully-completed days
    let run = 0;
    let bestRun = 0;
    for (let d = 1; d <= upToDay; d++) {
        run = dayComplete(d) ? run + 1 : 0;
        if (run > bestRun) bestRun = run;
    }
    list.push({
        id: 'perfect_week', emoji: '🏅', label: 'Perfect Week',
        desc: '7 consecutive days with every habit done',
        progress: Math.min(bestRun, 7), target: 7, achieved: bestRun >= 7,
    });

    // Consistency 80 — hold ≥80% overall completion
    let done = 0;
    let possible = 0;
    for (let d = 1; d <= upToDay; d++) {
        habits.forEach(h => {
            possible++;
            if (checks[h.id]?.[d] === true) done++;
        });
    }
    const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
    list.push({
        id: 'consistency_80', emoji: '🎯', label: 'Consistency 80',
        desc: 'Hold 80%+ completion all month',
        progress: pct, target: 80, achieved: pct >= 80,
        note: `${pct}% so far`,
    });

    // Iron Habit — keep at least one habit unbroken all month
    const iron = habits.filter(h => {
        for (let d = 1; d <= upToDay; d++) {
            const v = checks[h.id]?.[d];
            if (v !== true && v !== 'skip') return false;
        }
        return true;
    });
    list.push({
        id: 'iron_habit', emoji: '🛡️', label: 'Iron Habit',
        desc: 'Keep one habit unbroken all month',
        progress: iron.length > 0 ? 1 : 0, target: 1, achieved: iron.length > 0,
        note: iron.length > 0 ? `${iron.length} unbroken` : 'none unbroken yet',
    });

    return list;
}