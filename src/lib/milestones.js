/**
 * Streak milestone badges. A habit earns the highest tier its best
 * streak has reached.
 */
const STREAK_TIERS = [
    { days: 100, emoji: '🏆', label: '100-Day Streak' },
    { days: 30, emoji: '🥇', label: '30-Day Streak' },
    { days: 7, emoji: '🔥', label: '7-Day Streak' },
];

/**
 * @param {Array<{id:string,name:string,emoji:string}>} habits
 * @param {Object} habitStreaks  { [habitId]: { current, best } }
 * @returns earned badges sorted by tier (highest first)
 */
export function earnedMilestones(habits, habitStreaks) {
    const earned = [];
    habits.forEach(h => {
        const s = habitStreaks[h.id];
        if (!s) return;
        const tier = STREAK_TIERS.find(t => (s.best || 0) >= t.days);
        if (tier) {
            earned.push({
                habitId: h.id,
                habitName: h.name,
                habitEmoji: h.emoji,
                days: tier.days,
                emoji: tier.emoji,
                tierLabel: tier.label,
                label: `${h.emoji} ${h.name} — ${tier.label}`,
            });
        }
    });
    return earned.sort((a, b) => b.days - a.days);
}