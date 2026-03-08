import { getDaysInMonth } from 'date-fns';

function MonthHeader({
    month = 'March',
    habits = [],
    checks = {},
    onAddHabit
}) {
    // Compute global stats
    const totalHabits = habits.length;
    const dim = getDaysInMonth(new Date());
    const totalSlots = totalHabits * dim;

    let completedCount = 0;
    Object.values(checks).forEach(habitChecks => {
        Object.values(habitChecks).forEach(done => {
            if (done) completedCount++;
        });
    });

    const progressPct = totalSlots > 0 ? Math.round((completedCount / totalSlots) * 100) : 0;

    return (
        <div className="bg-white p-6 border-b border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
                <h2 className="text-4xl font-serif font-black text-gray-800">{month}</h2>
                <div className="flex items-center gap-4 mt-2 text-xs font-bold text-gray-400 uppercase tracking-tighter">
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
                    <span className="text-[10px] font-black text-gray-400 uppercase">Monthly Progress</span>
                    <span className="text-xl font-serif font-black text-primary">{progressPct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner flex items-center p-[2px]">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            <button
                onClick={onAddHabit}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
            >
                + Add Habit
            </button>
        </div>
    );
}

export default MonthHeader;
