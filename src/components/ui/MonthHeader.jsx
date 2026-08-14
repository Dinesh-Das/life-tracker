import { summarizeHabitPerformance } from '../../lib/habitAnalytics';

function MonthHeader({
    month = 'March',
    habits = [],
    checks = {},
    daysInMonth = 31,
    upToDay = daysInMonth,
    currentYear,
    currentMonthIndex,
    globalPause = null,
    onAddHabit
}) {
    const totalHabits = habits.length;
    const { completed: completedCount, completionPct: progressPct } = summarizeHabitPerformance(habits, checks, {
        year: currentYear,
        monthIndex: currentMonthIndex,
        daysInMonth,
        upToDay,
        globalPause,
    });

    return (
        <div className="theme-panel-solid p-6 border shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
                <h2 className="theme-heading text-4xl font-serif font-black">{month}</h2>
                <div className="theme-muted flex items-center gap-4 mt-2 text-xs font-bold uppercase tracking-tighter">
                    <div className="flex items-center gap-1">
                        <span className="text-primary-light">●</span> {totalHabits} Habits
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-primary-light">✓</span> {completedCount} Done
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="theme-muted text-[10px] font-black uppercase">Monthly Progress</span>
                    <span className="text-xl font-serif font-black" style={{ color: 'var(--positive)' }}>{progressPct}%</span>
                </div>
                <div className="theme-progress-track w-full h-3 rounded-full overflow-hidden shadow-inner flex items-center p-[2px]">
                    <div
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${progressPct}%`, background: 'var(--positive)' }}
                    />
                </div>
            </div>

            <button
                onClick={onAddHabit}
                className="system-action-button px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
            >
                Manage Habits
            </button>
        </div>
    );
}

export default MonthHeader;
