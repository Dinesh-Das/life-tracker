import React, { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import { useAuth } from '../context/AuthContext'
import { useAppContext } from '../context/AppContext'
import { MONTHS } from '../lib/constants'
import { getWeeksInMonth } from '../lib/dateUtils'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

// Habit Components
import MonthHeader from '../components/ui/MonthHeader'
import HabitGrid from '../components/habits/HabitGrid'
import TrendAreaChart from '../components/charts/TrendAreaChart'
import MoodLineChart from '../components/charts/MoodLineChart'
import AnalysisPanel from '../components/habits/AnalysisPanel'
import CorrelationInsights from '../components/charts/CorrelationInsights'
import { useHabits } from '../hooks/useHabits'
import { useStreaks } from '../hooks/useStreaks'

// Task Components
import DayColumn from '../components/weekly/DayColumn'
import { useTasks } from '../hooks/useTasks'

import LoadingSkeleton from '../components/ui/LoadingSkeleton'

function Planner() {
    const navigate = useNavigate();
    const { spreadsheetId } = useAuth();
    const { currentMonth, currentYear, currentMonthIndex, setMonth, gender, currentDate } = useAppContext();

    // -- HABITS STATE --
    const {
        habits, checks, mentalState, loading: habitsLoading, saving: habitsSaving,
        daysInMonth, toggleCheck, updateMentalState, deleteHabit, updateHabit
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
                <Header title="Planner" subtitle={`${currentMonth} ${currentYear}`} saving={habitsSaving} />
                <div className="px-4 py-6 sm:px-10">
                    <LoadingSkeleton type="page" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <Header title="Planner" subtitle={`${currentMonth} ${currentYear}`} saving={habitsSaving} />

            {/* Month Picker */}
            <div className="px-4 sm:px-10" style={{
                paddingTop: '12px',
                paddingBottom: '16px',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.15)',
                position: 'sticky', top: 0, zIndex: 40,
            }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Select Month</p>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="scrollbar-thin">
                    {MONTHS.map((m, idx) => (
                        <button
                            key={m}
                            onClick={() => setMonth(idx)}
                            style={{
                                padding: '8px 18px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '11px',
                                fontFamily: 'var(--font-body)',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                flexShrink: 0,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(idx === currentMonthIndex
                                    ? { background: 'rgba(45,79,65,0.75)', color: '#a9cfbc', boxShadow: '0 2px 12px rgba(45,79,65,0.25)' }
                                    : { background: 'rgba(255,255,255,0.35)', color: 'var(--text-muted)' }
                                ),
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 pt-6 pb-20 sm:px-10" style={{ flex: 1 }}>

                {/* HABITS SECTION */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '16px' }}>Monthly Habits</h2>

                    <MonthHeader
                        month={currentMonth}
                        habits={visibleHabits}
                        checks={checks}
                        daysInMonth={daysInMonth}
                        onAddHabit={() => navigate('/settings')}
                    />

                    <div className="overflow-x-auto pb-4 scrollbar-thin" style={{ borderRadius: 'var(--radius-lg)', marginTop: '12px' }}>
                        <HabitGrid
                            currentMonth={currentMonth}
                            habits={visibleHabits}
                            checks={checks}
                            streaks={habitStreaks}
                            mentalState={mentalState}
                            daysInMonth={daysInMonth}
                            currentYear={currentYear}
                            currentMonthIndex={currentMonthIndex}
                            onToggle={toggleCheck}
                            onDelete={deleteHabit}
                            onUpdate={updateHabit}
                            onMentalStateChange={updateMentalState}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginTop: '20px' }}>
                        <TrendAreaChart data={trendData} />
                        <MoodLineChart data={moodData} />
                    </div>

                    <AnalysisPanel habits={visibleHabits} checks={checks} daysInMonth={daysInMonth} />
                    
                    <CorrelationInsights
                        habits={visibleHabits}
                        checks={checks}
                        mentalState={mentalState}
                        daysInMonth={daysInMonth}
                        year={currentYear}
                        monthIndex={currentMonthIndex}
                    />
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', margin: '8px 0 32px' }} />

                {/* TASKS SECTION */}
                <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '16px' }}>Weekly Tasks</h2>

                    {/* Week Selector */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '20px' }} className="scrollbar-thin">
                        {weeks.map((w, idx) => (
                            <button
                                key={w.key}
                                onClick={() => setCurrentWeekIdx(idx)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-body)',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    ...(currentWeekIdx === idx
                                        ? { background: 'rgba(45,79,65,0.75)', color: '#a9cfbc', boxShadow: '0 2px 12px rgba(45,79,65,0.25)' }
                                        : { background: 'rgba(255,255,255,0.35)', color: 'var(--text-muted)' }
                                    ),
                                }}
                            >
                                <span style={{ display: 'block' }}>Week {idx + 1}</span>
                                {w.days && (
                                    <span style={{ display: 'block', fontSize: '9px', opacity: 0.75, marginTop: '2px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                                        {format(w.days[0], 'MMM dd')} – {format(w.days[6], 'MMM dd')}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 7-Column Task Grid */}
                    <div className="overflow-x-auto pb-4 scrollbar-thin">
                        <div style={{ display: 'flex', gap: '12px', minWidth: 'max-content' }}>
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
