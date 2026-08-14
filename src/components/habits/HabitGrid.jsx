import HabitRow from './HabitRow';
import { useEffect, useMemo, useState } from 'react';
import { buildCompletionTrend } from '../../lib/habitAnalytics';

const PAGE_SIZE = 50;

function HabitGrid({
    habits = [],
    checks = {},
    streaks = {},
    mentalState = {},
    daysInMonth = 31,
    upToDay = daysInMonth,
    globalPause = null,
    onToggle,
    onDelete,
    onUpdate,
    onMentalStateChange,
    currentYear = new Date().getFullYear(),
    currentMonthIndex = new Date().getMonth()
}) {
    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(habits.length / PAGE_SIZE));
    useEffect(() => setPage(current => Math.min(current, pageCount - 1)), [pageCount]);
    const visibleHabits = useMemo(
        () => habits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [habits, page]
    );
    const dailyStats = useMemo(() => {
        const result = Object.fromEntries(days.map(day => [day, { done: 0, notDone: 0, pct: 0, eligible: 0 }]));
        buildCompletionTrend(habits, checks, {
            year: currentYear,
            monthIndex: currentMonthIndex,
            daysInMonth,
            upToDay,
            globalPause,
        }).forEach(({ day, completed, eligible, pct }) => {
            result[day] = { done: completed, notDone: eligible - completed, pct, eligible };
        });
        return result;
    }, [checks, days, habits, currentYear, currentMonthIndex, daysInMonth, upToDay, globalPause]);

    return (
        <div>
        <div className="theme-table overflow-auto rounded-xl shadow-sm border" style={{ maxHeight: '75vh' }}>
            <table className="w-full border-collapse">
                <thead className="theme-table-header sticky top-0 z-40 text-[10px] font-bold uppercase tracking-wider">
                    {/* Row 1 — Week group headers */}
                    <tr>
                        <th className="theme-table-header sticky left-0 z-30 min-w-[160px] md:min-w-[200px] border-r p-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">My Habits</th>
                        <th colSpan={7} className="border-r border-gray-200 p-1 text-center">Week 1</th>
                        <th colSpan={7} className="border-r border-gray-200 p-1 text-center">Week 2</th>
                        <th colSpan={7} className="border-r border-gray-200 p-1 text-center">Week 3</th>
                        <th colSpan={9} className="border-r border-gray-200 p-1 text-center">Week 4+</th>
                        <th className="p-1 px-4 text-center">Analysis</th>
                    </tr>

                    {/* Row 2 — Day abbreviations + numbers */}
                    <tr className="border-b border-gray-200">
                        <th className="theme-table-header sticky left-0 z-20 border-r"></th>
                        {days.map(day => {
                            const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                            return (
                                <th
                                    key={day}
                                    className={`p-1 min-w-[22px] text-center ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'}`}
                                >
                                    <div className="flex flex-col text-[8px] md:text-[9px] leading-tight">
                                        <span className="opacity-60">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(currentYear, currentMonthIndex, day).getDay()]}</span>
                                        <span className="theme-heading font-black">{day}</span>
                                    </div>
                                </th>
                            );
                        })}
                        <th className="border-l-2 border-gray-200"></th>
                    </tr>
                </thead>

                {/* Habit Rows */}
                <tbody className="theme-table">
                    {visibleHabits.map(habit => (
                        <HabitRow
                            key={habit.id}
                            habit={habit}
                            days={days}
                            checks={checks[habit.id]}
                            streak={streaks[habit.id]}
                            upToDay={upToDay}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                        />
                    ))}
                </tbody>

                {/* Footer Rows */}
                <tfoot className="text-[9px] font-bold">
                    {/* Progress % row */}
                    <tr className="bg-green-50/50 border-t-2 border-gray-100 italic">
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-primary font-black">Progress %</td>
                        {days.map(day => {
                            const stats = dailyStats[day];
                            const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                            return (
                                <td
                                    key={day}
                                    className={`p-1 text-center ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'} ${stats.pct > 0 ? 'text-primary' : 'text-gray-300'}`}
                                >
                                    {stats.eligible > 0 ? `${stats.pct}%` : '–'}
                                </td>
                            );
                        })}
                        <td className="border-l-2 border-gray-200"></td>
                    </tr>

                    {/* Done row */}
                    <tr className="bg-lime-50/30 border-t border-gray-100">
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-lime-700">Done</td>
                        {days.map(day => {
                            const stats = dailyStats[day];
                            const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                            return (
                                <td
                                    key={day}
                                    className={`p-1 text-center ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'} text-lime-600`}
                                >
                                    {stats.done > 0 ? stats.done : '–'}
                                </td>
                            );
                        })}
                        <td className="border-l-2 border-gray-200"></td>
                    </tr>

                    {/* Not Done row */}
                    <tr className="bg-red-50/30 border-t border-gray-100">
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-red-700">Not Done</td>
                        {days.map(day => {
                            const stats = dailyStats[day];
                            const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                            return (
                                <td
                                    key={day}
                                    className={`p-1 text-center ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'} text-red-600`}
                                >
                                    {stats.notDone > 0 ? stats.notDone : '–'}
                                </td>
                            );
                        })}
                        <td className="border-l-2 border-gray-200"></td>
                    </tr>

                    {/* Mental State row */}
                    <tr className="bg-amber-50/50 border-t border-gray-100 italic">
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-amber-700 flex items-center gap-1">
                            <span>🧠</span> Mental State
                        </td>
                        {days.map(day => {
                            const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                            return (
                                <td
                                    key={day}
                                    className={`p-1 text-center ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'}`}
                                >
                                    <input
                                        type="number"
                                        min="1" max="10"
                                        placeholder="–"
                                        className="table-mental-input w-5 text-center font-black appearance-none"
                                        value={mentalState[day] || ''}
                                        onChange={(e) => onMentalStateChange(day, e.target.value)}
                                        disabled={day > upToDay}
                                        title={day > upToDay ? 'Future dates cannot be edited' : undefined}
                                        aria-label={`Mental state for day ${day}${day > upToDay ? ' (future, unavailable)' : ''}`}
                                    />
                                </td>
                            );
                        })}
                        <td className="border-l-2 border-gray-200"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        {pageCount > 1 && (
            <nav aria-label="Habit pages" className="flex items-center justify-center gap-3 mt-3">
                <button type="button" className="system-action-button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Habits {page * PAGE_SIZE + 1}–{Math.min(habits.length, (page + 1) * PAGE_SIZE)} of {habits.length}</span>
                <button type="button" className="system-action-button" disabled={page >= pageCount - 1} onClick={() => setPage(value => value + 1)}>Next</button>
            </nav>
        )}
        </div>
    );
}

export default HabitGrid;
