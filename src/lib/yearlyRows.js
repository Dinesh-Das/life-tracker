import { MONTHS } from './constants';
import { decodeCheck } from './sheetLayout';

export function legacyMonthTitles(titles = []) {
    return MONTHS.filter(month => titles.includes(month));
}

/**
 * Bare legacy tabs still contain their original year in A1 (for example
 * "Jan 2025 Tracking"). Preserve that year instead of reassigning the tab to
 * whatever year the browser happens to be running in.
 */
export function inferLegacyMonthYears(titles = [], headerResponses = [], fallbackYear = new Date().getFullYear()) {
    const result = {};
    legacyMonthTitles(titles).forEach((month, index) => {
        const header = String(headerResponses[index]?.values?.[0]?.[0] || '');
        const match = header.match(/\b(?:19|20)\d{2}\b/);
        result[month] = match ? Number(match[0]) : fallbackYear;
    });
    return result;
}

/**
 * Return every month-tab source that belongs to a year. During migration a
 * current year can have both a legacy `Jul` tab and a `Jul 2026` tab; both are
 * intentionally returned so analytics can merge rather than discard history.
 */
export function monthTabSources(titles = [], year, legacyYear = new Date().getFullYear()) {
    return MONTHS.flatMap(month => {
        const sources = [];
        const titled = `${month} ${year}`;
        if (titles.includes(titled)) sources.push({ month, title: titled });
        const monthLegacyYear = typeof legacyYear === 'object' ? legacyYear?.[month] : legacyYear;
        if (year === monthLegacyYear && titles.includes(month)) sources.push({ month, title: month });
        return sources;
    });
}

const mergeStatus = (current, incoming) => {
    if (current === true || incoming === true) return true;
    if (current === 'skip' || incoming === 'skip') return 'skip';
    return false;
};

/**
 * Merge duplicate legacy/year-suffixed month rows by resolved habit and day.
 * A completion wins over a skip/empty value, and a skip wins over empty.
 */
export function mergeMonthHabitRows(mappings = [], responses = [], resolveHabit) {
    const months = new Map();
    mappings.forEach((mapping, index) => {
        const month = months.get(mapping.month) || new Map();
        (responses[index]?.values || []).forEach(row => {
            const habit = resolveHabit(row, mapping);
            if (!habit) return;
            const key = String(habit.id);
            const entry = month.get(key) || { habit, statuses: {} };
            for (let day = 1; day <= 31; day++) {
                entry.statuses[day] = mergeStatus(entry.statuses[day], decodeCheck(row[day]));
            }
            month.set(key, entry);
        });
        months.set(mapping.month, month);
    });
    return new Map([...months].map(([month, rows]) => [month, [...rows.values()]]));
}

/** Limit yearly analytics to elapsed calendar days; future cells never count. */
export function aggregationDayLimit(year, monthIndex, now = new Date()) {
    const days = new Date(year, monthIndex + 1, 0).getDate();
    if (new Date(year, monthIndex, 1) > now) return 0;
    if (year === now.getFullYear() && monthIndex === now.getMonth()) return Math.min(now.getDate(), days);
    return days;
}

/**
 * Calendar consistency for a month: the share of eligible calendar days on
 * which at least one habit was completed. This deliberately does not let a
 * single completed habit on a single day turn into a 100% month.
 */
export function calendarConsistencyPct(activeDays, dayCount) {
    return dayCount > 0 ? Math.round((activeDays / dayCount) * 100) : 0;
}

/** An active month means the user recorded at least one completion. */
export function monthHasRecordedActivity(completed) {
    return completed > 0;
}
