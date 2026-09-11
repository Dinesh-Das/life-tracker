import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

export function getWeekKey(date) {
    return `week:${format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
}

/**
 * Returns an array of weeks for a given month, where each week starts on Monday.
 * @param {Date} date - Any date in the target month.
 */
export function getWeeksInMonth(date) {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    // Adjust startOfWeek to Monday (1)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks = [];
    let currentWeek = [];

    days.forEach((day, i) => {
        currentWeek.push(day);
        if ((i + 1) % 7 === 0) {
            weeks.push({
                key: getWeekKey(currentWeek[0]),
                days: currentWeek,
                weekNumber: Math.floor(weeks.length + 1)
            });
            currentWeek = [];
        }
    });

    return weeks;
}

export function normalizeWeekKey(key) {
    const value = String(key || '');
    if (!value || value.startsWith('week:')) return value;
    const match = value.match(/^(\d{4})-W(\d+)-M(\d+)$/);
    if (!match) return value;
    const [, yearText, weekText, monthText] = match;
    const year = Number(yearText);
    const monthIndex = Number(monthText);
    const weekIndex = Number(weekText) - 1;
    if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11 || weekIndex < 0) return value;
    const week = getWeeksInMonth(new Date(year, monthIndex, 1))[weekIndex];
    return week?.key || value;
}

export function getDayAbbr(date) {
    return format(date, 'EEEEEE'); // Sa, Su, Mo...
}

export function formatDate(date, pattern = 'yyyy-MM-dd') {
    return format(date, pattern);
}

export function getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
}
