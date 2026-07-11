import { format } from 'date-fns';

const dateKey = value => typeof value === 'string' ? value.slice(0, 10) : format(value, 'yyyy-MM-dd');

export function isWithinPause(start, end, value) {
    const key = dateKey(value);
    return Boolean(start && end && start <= key && key <= end);
}

export function isHabitScheduledForDate(habit, value, globalPause = null) {
    const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
    const key = dateKey(date);
    if (isWithinPause(globalPause?.from, globalPause?.until, key)) return false;
    if (isWithinPause(habit.pausedFrom, habit.pausedUntil, key)) return false;
    if (habit.activeFrom && habit.activeFrom > key) return false;
    if (habit.archivedAt && habit.archivedAt.slice(0, 10) <= key) return false;

    if (habit.scheduleType === 'weekdays' && habit.scheduleDays?.length) {
        return habit.scheduleDays.includes(date.getDay());
    }
    if (habit.scheduleType === 'interval') {
        const origin = new Date(`${habit.activeFrom || key}T12:00:00`);
        const elapsed = Math.round((date - origin) / 86_400_000);
        return elapsed >= 0 && elapsed % Math.max(1, habit.intervalDays || 1) === 0;
    }
    return true;
}

export function forecastHabit(habit, checks = {}, selectedDate = new Date(), daysInMonth = 31) {
    const elapsed = Math.max(1, selectedDate.getDate());
    const completed = Object.entries(checks).filter(([day, value]) => Number(day) <= elapsed && value === true).length;
    const target = habit.scheduleType === 'monthly' ? habit.timesPerMonth : habit.goal;
    const projected = Math.min(daysInMonth, Math.round((completed / elapsed) * daysInMonth));
    const remaining = Math.max(0, target - completed);
    const remainingDays = Math.max(1, daysInMonth - elapsed);
    const weeklyPace = Math.ceil((remaining / remainingDays) * 7);
    return {
        completed, target, projected, remaining, weeklyPace,
        status: completed >= target ? 'complete' : projected >= target ? 'on-track' : 'at-risk',
    };
}
