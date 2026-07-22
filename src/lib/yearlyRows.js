import { MONTHS } from './constants';
import { decodeCheck } from './sheetLayout';

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
        if (year === legacyYear && titles.includes(month)) sources.push({ month, title: month });
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

/** An active month means the user recorded at least one completion. */
export function monthHasRecordedActivity(completed) {
    return completed > 0;
}
