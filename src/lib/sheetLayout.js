import { colIndexToLabel } from './sheetsApi';

export const MONTH_HABIT_START_ROW = 6;
export const MONTH_LABEL_COLUMN = 'A';
export const MONTH_FIRST_DAY_COLUMN = 'B';
export const MONTH_LAST_DAY_COLUMN = 'AF';
export const MONTH_HABIT_ID_COLUMN = 'AG';
export const MONTH_HABIT_ID_INDEX = 32;
export const DAILY_STATE_TAB = 'DailyState';

export const dayColumn = (day) => colIndexToLabel(day);
export const monthHabitRange = (tabName) => `'${tabName}'!A${MONTH_HABIT_START_ROW}:${MONTH_HABIT_ID_COLUMN}`;

export function habitLabel(habit) {
    return `${habit.emoji || '✨'} ${String(habit.name || '').trim()}`.trim();
}

export function normalizeHabitLabel(label) {
    return String(label || '')
        .replace(/\uFE0F/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase();
}

export function decodeCheck(value) {
    if (value === 'S' || value === 's' || value === 'skip') return 'skip';
    return value === true || value === 'TRUE' || value === '✓' || value === 'checked';
}

export function encodeCheck(value) {
    if (value === 'skip') return 'S';
    return value === true ? '✓' : '';
}
