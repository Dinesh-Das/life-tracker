/**
 * Monthly Wrapped — pure month-scoped stats over a month tab's grid.
 * The yearly Wrapped is great but distant; this keeps the payoff loop tight.
 */

const isDone = (v) => v === '✓' || v === true || v === 'TRUE' || v === 'checked';

/**
 * @param {Object} opts
 * @param {Array}  opts.labels    col-A habit labels (rows 6..20 of the month tab)
 * @param {Array}  opts.habitRows B..AF grid rows aligned to labels
 * @param {Array}  opts.mentalRow B22..AF22 values (index 0 = day 1)
 * @param {number} opts.upToDay   last day to count (excludes future days)
 */
export function computeMonthlyStats({ labels = [], habitRows = [], mentalRow = [], upToDay = 0 }) {
    // Keep only real habit rows (skip blanks and the Mental State row)
    const habitLabels = [];
    const rows = [];
    labels.forEach((label, i) => {
        if (label && String(label).length > 2 && !String(label).includes('Mental State')) {
            habitLabels.push(String(label));
            rows.push(habitRows[i] || []);
        }
    });

    let totalCompleted = 0;
    let bestDay = null;
    const perHabit = habitLabels.map(() => 0);

    for (let d = 1; d <= upToDay; d++) {
        let count = 0;
        rows.forEach((row, h) => {
            if (isDone(row[d - 1])) {
                count++;
                perHabit[h]++;
            }
        });
        totalCompleted += count;
        if (count > 0 && (!bestDay || count > bestDay.count)) bestDay = { day: d, count };
    }

    let topHabit = null;
    perHabit.forEach((done, h) => {
        if (done > 0 && (!topHabit || done > topHabit.done)) topHabit = { name: habitLabels[h], done };
    });

    let moodSum = 0;
    let moodN = 0;
    for (let d = 1; d <= upToDay; d++) {
        const v = parseInt(mentalRow[d - 1]);
        if (v >= 1 && v <= 10) {
            moodSum += v;
            moodN++;
        }
    }

    const possible = rows.length * upToDay;
    return {
        totalCompleted,
        completionPct: possible > 0 ? Math.round((totalCompleted / possible) * 100) : 0,
        bestDay,
        topHabit,
        avgMood: moodN > 0 ? Math.round((moodSum / moodN) * 10) / 10 : null,
    };
}

/** Sum WORK focus minutes for a given month from FocusLogs rows. */
export function focusMinutesForMonth(focusRows = [], year, monthIndex) {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    return focusRows.reduce((sum, r) => {
        if (!r || !r[0]) return sum;
        const mode = r[3] ? String(r[3]) : 'WORK';
        if (String(r[0]).startsWith(prefix) && mode === 'WORK') return sum + (parseInt(r[2]) || 0);
        return sum;
    }, 0);
}