import { earnedMilestones } from './milestones';

const STORAGE_KEY = 'lt_celebrated';

function loadCelebrated() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveCelebrated(map) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch { /* noop */ }
}

/**
 * Milestones the user hasn't been congratulated for yet on this device.
 * Records them so each tier fires exactly once per habit.
 */
export function newMilestonesToCelebrate(habits, habitStreaks) {
    const celebrated = loadCelebrated();
    const fresh = earnedMilestones(habits, habitStreaks)
        .filter(m => (celebrated[m.habitId] || 0) < m.days);
    if (fresh.length > 0) {
        fresh.forEach(m => { celebrated[m.habitId] = m.days; });
        saveCelebrated(celebrated);
    }
    return fresh;
}