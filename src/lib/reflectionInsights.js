import { format, subDays, parseISO } from 'date-fns';

export const WIN_CATEGORIES = ['Physical', 'Mental', 'Social', 'Financial', 'Spiritual'];

/**
 * Count logged wins per category from DailyWins rows (A2:F —
 * [date, Physical, Mental, Social, Financial, Spiritual]).
 */
export function computeWinBalance(rows = []) {
    const counts = WIN_CATEGORIES.map(() => 0);
    rows.forEach(row => {
        WIN_CATEGORIES.forEach((_, i) => {
            if (row[i + 1] && String(row[i + 1]).trim()) counts[i]++;
        });
    });
    return WIN_CATEGORIES.map((category, i) => ({ category, count: counts[i] }));
}

/**
 * Consecutive-day streak of rows that have any non-empty content,
 * ending today or yesterday (today may not be logged yet).
 */
export function computeEntryStreak(rows = [], todayStr) {
    const dates = new Set(
        rows
            .filter(r => r[0] && r.slice(1).some(c => c && String(c).trim()))
            .map(r => r[0])
    );
    if (dates.size === 0) return 0;
    let cursor = parseISO(todayStr);
    if (!dates.has(todayStr)) cursor = subDays(cursor, 1);
    let streak = 0;
    while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
        streak++;
        cursor = subDays(cursor, 1);
    }
    return streak;
}

/** Human-readable insights derived from wins balance + entry streaks. */
export function buildInsights(balance, winsStreak, journalStreak) {
    const insights = [];
    const total = balance.reduce((s, b) => s + b.count, 0);
    if (total === 0) {
        return ['Start logging Daily Wins to unlock insights about your life balance.'];
    }
    const sorted = [...balance].sort((a, b) => b.count - a.count);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    insights.push(`💪 Strongest area: ${strongest.category} (${strongest.count} wins logged).`);
    if (weakest.count < strongest.count / 2) {
        insights.push(`🌱 ${weakest.category} is getting less attention (${weakest.count} wins) — try one small ${weakest.category.toLowerCase()} win tomorrow.`);
    }
    if (winsStreak >= 3) {
        insights.push(`🔥 ${winsStreak}-day Daily Wins streak — keep it alive!`);
    }
    if (journalStreak >= 3) {
        insights.push(`📝 ${journalStreak} days of consistent reflections. Clarity compounds.`);
    } else {
        insights.push('📝 Reflecting most evenings correlates with better habit follow-through — try tonight.');
    }
    return insights;
}