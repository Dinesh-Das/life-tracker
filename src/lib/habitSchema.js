export const HABITS_TAB = 'Habits';
export const HABIT_COLUMNS = 22;
export const HABIT_HEADERS = [
    'ID', 'Habit Name', 'Emoji', 'Monthly Goal', 'Category', 'Female Only?',
    'Frequency', 'Order', 'Created At', 'Color', 'Focus Link', 'Active From',
    'Archived At', 'Updated At', 'Schedule Type', 'Schedule Days',
    'Interval Days', 'Times Per Month', 'Paused From', 'Paused Until',
    'Routine', 'Tags'
];

export function normalizeHabit(raw = {}, index = 0) {
    const now = new Date().toISOString();
    const name = String(raw.name || '').trim().slice(0, 120);
    const parsedGoal = Number.parseInt(raw.goal, 10);

    return {
        id: String(raw.id || crypto.randomUUID()),
        name,
        emoji: String(raw.emoji || '✨').slice(0, 16),
        goal: Number.isFinite(parsedGoal) ? Math.min(31, Math.max(1, parsedGoal)) : 30,
        category: String(raw.category || 'Health').slice(0, 40),
        femaleOnly: Boolean(raw.femaleOnly),
        frequency: String(raw.frequency || 'Daily').slice(0, 40),
        order: Number.parseInt(raw.order, 10) || index + 1,
        createdAt: raw.createdAt || now,
        color: String(raw.color || '').slice(0, 32),
        focusLink: Boolean(raw.focusLink),
        activeFrom: raw.activeFrom || String(raw.createdAt || now).slice(0, 10),
        archivedAt: raw.archivedAt || '',
        updatedAt: raw.updatedAt || now,
        scheduleType: String(raw.scheduleType || 'frequency').slice(0, 24),
        scheduleDays: Array.isArray(raw.scheduleDays)
            ? raw.scheduleDays.map(Number).filter(day => day >= 0 && day <= 6)
            : String(raw.scheduleDays || '').split(',').map(value => value.trim()).filter(value => value !== '').map(Number).filter(day => Number.isFinite(day) && day >= 0 && day <= 6),
        intervalDays: Math.min(365, Math.max(1, Number.parseInt(raw.intervalDays, 10) || 1)),
        timesPerMonth: Math.min(31, Math.max(1, Number.parseInt(raw.timesPerMonth, 10) || parsedGoal || 1)),
        pausedFrom: String(raw.pausedFrom || '').slice(0, 10),
        pausedUntil: String(raw.pausedUntil || '').slice(0, 10),
        routine: String(raw.routine || '').trim().slice(0, 60),
        tags: Array.isArray(raw.tags)
            ? raw.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 12)
            : String(raw.tags || '').split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12),
        sheetRow: raw.sheetRow || null,
    };
}

export function parseHabitRow(row = [], index = 0, sheetRow = null) {
    if (!row[0] && !row[1]) return null;
    return normalizeHabit({
        id: row[0],
        name: row[1],
        emoji: row[2],
        goal: row[3],
        category: row[4],
        femaleOnly: row[5] === 'TRUE' || row[5] === true,
        frequency: row[6],
        order: row[7],
        createdAt: row[8],
        color: row[9],
        focusLink: row[10] === 'TRUE' || row[10] === true,
        activeFrom: row[11],
        archivedAt: row[12],
        updatedAt: row[13],
        scheduleType: row[14],
        scheduleDays: row[15],
        intervalDays: row[16],
        timesPerMonth: row[17],
        pausedFrom: row[18],
        pausedUntil: row[19],
        routine: row[20],
        tags: row[21],
        sheetRow,
    }, index);
}

export function serializeHabit(habit, index = 0) {
    const h = normalizeHabit(habit, index);
    return [
        h.id, h.name, h.emoji, h.goal, h.category,
        h.femaleOnly ? 'TRUE' : 'FALSE', h.frequency, h.order,
        h.createdAt, h.color, h.focusLink ? 'TRUE' : 'FALSE',
        h.activeFrom, h.archivedAt, new Date().toISOString(),
        h.scheduleType, h.scheduleDays.join(','), h.intervalDays, h.timesPerMonth,
        h.pausedFrom, h.pausedUntil, h.routine, h.tags.join(','),
    ];
}

export function validateHabit(input) {
    const name = String(input?.name || '').trim();
    const goal = Number.parseInt(input?.goal, 10);
    if (!name) return { valid: false, message: 'Habit name is required.' };
    if (name.length > 120) return { valid: false, message: 'Habit name must be 120 characters or fewer.' };
    if (!Number.isInteger(goal) || goal < 1 || goal > 31) {
        return { valid: false, message: 'Monthly goal must be between 1 and 31.' };
    }
    return { valid: true, value: normalizeHabit({ ...input, name, goal }) };
}
