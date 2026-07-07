import { getISOWeek, getISOWeekYear } from 'date-fns';

const DISMISS_KEY = 'lt_nudges_dismissed';

/** Week bucket for dismissals — a dismissed nudge returns next week. */
export function nudgeWeekKey(now = new Date()) {
    return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
}

/**
 * Turn passive correlation insights into at most two actionable prompts.
 * Priority: strongest positive mood link → next-day carryover (different
 * habit) → negative correlation reflection → weekday planning tip.
 *
 * Inputs are the outputs of habitMoodCorrelations, habitNextDayMoodCorrelations
 * and weekdayCompletion from correlations.js.
 */
export function generateNudges({ moodInsights = [], nextDayInsights = [], weekday = {} }) {
    const nudges = [];

    const booster = moodInsights.find(i => i.delta > 0);
    if (booster) {
        nudges.push({
            id: `boost-${booster.habitId}`,
            emoji: booster.emoji || '✨',
            text: `Your mood averages ${booster.doneAvg} on ${booster.habitName} days vs ${booster.missAvg} without it. Protect tomorrow's ${booster.habitName}?`,
        });
    }

    const carry = nextDayInsights.find(i => i.delta > 0 && (!booster || i.habitId !== booster.habitId));
    if (carry) {
        nudges.push({
            id: `carry-${carry.habitId}`,
            emoji: carry.emoji || '🌅',
            text: `${carry.habitName} pays off tomorrow: your next-day mood averages ${carry.doneAvg} after doing it vs ${carry.missAvg} after missing it. Do it today, thank yourself tomorrow.`,
        });
    }

    const drag = moodInsights.find(i => i.delta < 0);
    if (drag && nudges.length < 2) {
        nudges.push({
            id: `drag-${drag.habitId}`,
            emoji: drag.emoji || '🤔',
            text: `Days you complete ${drag.habitName} average a lower mood (${drag.doneAvg} vs ${drag.missAvg}). Is the habit draining you, or do you lean on it on hard days?`,
        });
    }

    const { best, worst } = weekday;
    if (best && worst && best.day !== worst.day && best.pct - worst.pct >= 15 && nudges.length < 2) {
        nudges.push({
            id: `weekday-${worst.day}`,
            emoji: '🗓️',
            text: `${worst.day}s are your weakest (${worst.pct}% vs ${best.pct}% on ${best.day}s). Plan your easiest habits for ${worst.day} — lower the bar, not the streak.`,
        });
    }

    return nudges.slice(0, 2);
}

function loadDismissed() {
    try {
        return JSON.parse(localStorage.getItem(DISMISS_KEY)) || {};
    } catch {
        return {};
    }
}

/** Filter out nudges dismissed during the current ISO week. */
export function visibleNudges(nudges, now = new Date()) {
    const dismissed = loadDismissed();
    const week = nudgeWeekKey(now);
    return nudges.filter(n => dismissed[n.id] !== week);
}

/** Snooze a nudge for the rest of the current ISO week. */
export function dismissNudge(id, now = new Date()) {
    const dismissed = loadDismissed();
    dismissed[id] = nudgeWeekKey(now);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed)); } catch { /* noop */ }
}