import React, { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import { useAuth } from '../context/AuthContext'
import { useAppContext } from '../context/AppContext'
import { MONTHS } from '../lib/constants'
import { getWeeksInMonth } from '../lib/dateUtils'
import { format } from 'date-fns'

// Habit Components
import MonthHeader from '../components/ui/MonthHeader'
import HabitGrid from '../components/habits/HabitGrid'
import TrendAreaChart from '../components/charts/TrendAreaChart'
import MoodLineChart from '../components/charts/MoodLineChart'
import AnalysisPanel from '../components/habits/AnalysisPanel'
import { useHabits } from '../hooks/useHabits'
import { useStreaks } from '../hooks/useStreaks'

// Task Components
import DayColumn from '../components/weekly/DayColumn'
import { useTasks } from '../hooks/useTasks'

import LoadingSkeleton from '../components/ui/LoadingSkeleton'

function Planner() {
    const { spreadsheetId } = useAuth();
    const { currentMonth, currentYear, currentMonthIndex, setMonth, gender, currentDate } = useAppContext();

    // -- HABITS STATE --
    const {
        habits, checks, mentalState, loading: habitsLoading, saving: habitsSaving,
        daysInMonth, toggleCheck, updateMentalState, addHabit, deleteHabit, updateHabit
    } = useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex);

    const { habitStreaks } = useStreaks(habits, checks);

    const visibleHabits = useMemo(() => {
        if (gender === 'female') return habits;
        return habits.filter(h => !h.femaleOnly);
    }, [habits, gender]);

    const trendData = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            let done = 0;
            visibleHabits.forEach(h => {
                if (checks[h.id]?.[day]) done++;
            });
            const pct = visibleHabits.length > 0 ? Math.round((done / visibleHabits.length) * 100) : 0;
            return { day, pct };
        });
    }, [visibleHabits, checks, daysInMonth]);

    const moodData = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return { day, val: mentalState[day] || null };
        }).filter(d => d.val !== null);
    }, [mentalState, daysInMonth]);

    // -- TASKS STATE --
    const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
    const weeks = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);

    // Ensure week index is valid when switching months
    React.useEffect(() => {
        if (currentWeekIdx >= weeks.length) {
            setCurrentWeekIdx(0);
        }
    }, [weeks, currentWeekIdx]);

    const currentWeek = weeks[currentWeekIdx] || weeks[0];

    const {
        tasks, loading: tasksLoading, toggleTask, addTask, deleteTask, updateTask
    } = useTasks(spreadsheetId, currentYear, currentMonthIndex, currentWeekIdx + 1);

    const days = useMemo(() => {
        if (!currentWeek?.days) return [];
        return currentWeek.days.map(date => ({
            name: format(date, 'EEEE'),
            date: format(date, 'dd.MM.yyyy'),
            dayIndex: date.getDay() === 0 ? 6 : date.getDay() - 1, // Mon=0, Sun=6
        }));
    }, [currentWeek]);


    const isLoading = habitsLoading || tasksLoading;

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Unified Planner" />
                <LoadingSkeleton type="page" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/30">
            <Header title={`Planner — ${currentMonth} ${currentYear}`} saving={habitsSaving} />

            {/* Global Month Picker for Planner */}
            <div className="bg-white px-4 md:px-6 py-5 border-b border-gray-100 sticky top-0 z-40">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Select Month</h3>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600/60 animate-pulse md:hidden">
                        <span>Swipe to navigate</span>
                        <span className="text-lg">→</span>
                    </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x h-[58px]">
                    {MONTHS.map((m, idx) => (
                        <button
                            key={m}
                            onClick={() => setMonth(idx)}
                            className={`
                                px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 min-w-[100px] snap-start border-2
                                ${idx === currentMonthIndex
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100 scale-105'
                                    : 'bg-white text-gray-400 border-gray-50 hover:border-gray-100 hover:text-gray-600'
                                }
                            `}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 pb-32">

                {/* ---------- HABITS SECTION ---------- */}
                <div className="p-4 md:p-6 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl md:text-2xl font-serif font-black text-gray-800">Monthly Habits</h2>
                    </div>

                    <MonthHeader
                        month={currentMonth}
                        habits={visibleHabits}
                        checks={checks}
                        onAddHabit={() => addHabit({ name: 'New Habit', emoji: '✨', goal: 30, category: 'Mind' })}
                    />

                    <div className="overflow-x-auto pb-4 scrollbar-thin rounded-3xl">
                        <HabitGrid
                            currentMonth={currentMonth}
                            habits={visibleHabits}
                            checks={checks}
                            streaks={habitStreaks}
                            mentalState={mentalState}
                            daysInMonth={daysInMonth}
                            onToggle={toggleCheck}
                            onDelete={deleteHabit}
                            onUpdate={updateHabit}
                            onMentalStateChange={updateMentalState}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TrendAreaChart data={trendData} />
                        <MoodLineChart data={moodData} />
                    </div>

                    <AnalysisPanel habits={visibleHabits} checks={checks} daysInMonth={daysInMonth} />
                </div>

                <div className="h-px bg-gray-200 mx-6 my-4" />

                {/* ---------- TASKS SECTION ---------- */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-serif font-black text-gray-800">Weekly Tasks</h2>
                    </div>

                    {/* Week Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100">
                        {weeks.map((w, idx) => (
                            <button
                                key={w.key}
                                onClick={() => setCurrentWeekIdx(idx)}
                                className={`
                                    px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0
                                    ${currentWeekIdx === idx
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                        : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <span className="block">Week {idx + 1}</span>
                                {w.days && (
                                    <span className="block text-[9px] opacity-70 mt-0.5 normal-case tracking-normal">
                                        {format(w.days[0], 'MMM dd')} – {format(w.days[6], 'MMM dd')}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 7-Column Grid */}
                    <div className="overflow-x-auto pb-4 scrollbar-thin">
                        <div className="flex gap-4 min-w-max h-full">
                            {days.map((day, idx) => (
                                <DayColumn
                                    key={day.name + idx}
                                    dayName={day.name}
                                    date={day.date}
                                    tasks={tasks[idx] || []}
                                    onToggle={(taskId) => toggleTask(idx, taskId)}
                                    onDelete={(taskId) => deleteTask(idx, taskId)}
                                    onUpdate={(taskId, updates) => updateTask?.(idx, taskId, updates)}
                                    onAddTask={(text) => addTask(idx, text)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Planner;
