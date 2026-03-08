import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, getWeek, getYear, getMonth } from 'date-fns';

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
                key: `${getYear(day)}-W${getWeek(day, { weekStartsOn: 1 })}-M${getMonth(start)}`,
                days: currentWeek,
                weekNumber: Math.floor(weeks.length + 1)
            });
            currentWeek = [];
        }
    });

    return weeks;
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
