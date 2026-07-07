/**
 * Streak milestone badges with customizable tiers.
 *
 * Default tiers are 7 / 30 / 100 days. Users can override the tiers per
 * habit (stored locally on the device, like the celebration ledger).
 * A habit earns the highest tier its best streak has reached.
 */

export const DEFAULT_TIER_DAYS = [7, 30, 100];

const CUSTOM_TIERS_KEY = 'lt_custom_milestones';

/** Badge emoji scales with tier size. */
export function tierEmoji(days) {
    if (days >= 100) return '🏆';
    if (days >= 30) return '🥇';
    return '🔥';
}

/** { [habitId]: [days...] } — device-local custom tier overrides. */
export function getCustomTiers() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_TIERS_KEY)) || {};
    } catch {
        return {};
    }
}

/**
 * Save custom tiers for one habit. Values are sanitized to unique
 * integers between 2 and 1000, sorted ascending. An empty list clears
 * the override (the habit falls back to the defaults).
 * @returns {number[]} the sanitized tier days that were saved
 */
export function setCustomTiersForHabit(habitId, days) {
    const clean = [...new Set((days || [])
        .map(d => parseInt(d, 10))
        .filter(d => Number.isFinite(d) && d >= 2 && d <= 1000))]
        .sort((a, b) => a - b);
    try {
        const all = getCustomTiers();
        if (clean.length === 0) delete all[habitId];
        else all[habitId] = clean;
        localStorage.setItem(CUSTOM_TIERS_KEY, JSON.stringify(all));
    } catch { /* noop */ }
    return clean;
}

/** Tier objects for a habit, highest first. */
export function tiersForHabit(habitId, customTiers = getCustomTiers()) {
    const days = customTiers?.[habitId]?.length ? customTiers[habitId] : DEFAULT_TIER_DAYS;
    return [...days]
        .sort((a, b) => b - a)
        .map(d => ({ days: d, emoji: tierEmoji(d), label: `${d}-Day Streak` }));
}

/**
 * @param {Array<{id:string,name:string,emoji:string}>} habits
 * @param {Object} habitStreaks  { [habitId]: { current, best } }
 * @param {Object} [customTiers] optional tier override map (defaults to stored)
 * @returns earned badges sorted by tier (highest first)
 */
export function earnedMilestones(habits, habitStreaks, customTiers = getCustomTiers()) {
    const earned = [];
    habits.forEach(h => {
        const s = habitStreaks[h.id];
        if (!s) return;
        const tier = tiersForHabit(h.id, customTiers).find(t => (s.best || 0) >= t.days);
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