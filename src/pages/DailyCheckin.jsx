import Header from '../components/layout/Header'
import { useAuth } from '../context/AuthContext'
import { useAppContext } from '../context/AppContext'
import { useHabits } from '../hooks/useHabits'
import { format, getDaysInMonth } from 'date-fns'
import { useState, useMemo, useEffect } from 'react'
import { CheckCircle2, Circle, Brain, Trophy, Zap, Heart, DollarSign, Star } from 'lucide-react'
import { useWins } from '../hooks/useWins';
import { WIN_SUGGESTIONS } from '../lib/winSuggestions';

function DailyCheckin() {
    const { spreadsheetId } = useAuth();
    const { currentMonth, currentYear, currentMonthIndex, gender } = useAppContext();

    const {
        habits,
        checks,
        mentalState,
        loading: habitsLoading,
        saving: habitsSaving,
        toggleCheck,
        updateMentalState,
    } = useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex);

    const {
        wins,
        loading: winsLoading,
        saving: winsSaving,
        saveWin
    } = useWins(spreadsheetId);

    const loading = habitsLoading || winsLoading;
    const saving = habitsSaving || winsSaving;

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    const isCurrentMonth = todayMonth === currentMonthIndex && todayYear === currentYear;
    const activeDay = isCurrentMonth ? todayDay : 1;

    const [mentalInput, setMentalInput] = useState(mentalState[activeDay] || '');

    // Sync mental input with fetched state
    useEffect(() => {
        if (mentalState[activeDay] !== undefined) {
            setMentalInput(mentalState[activeDay]);
        }
    }, [mentalState, activeDay]);

    // Filter habits by gender
    const visibleHabits = useMemo(() => {
        if (gender === 'female') return habits;
        return habits.filter(h => !h.femaleOnly);
    }, [habits, gender]);

    const doneCount = useMemo(() => {
        return visibleHabits.filter(h => checks[h.id]?.[activeDay]).length;
    }, [visibleHabits, checks, activeDay]);

    const totalHabits = visibleHabits.length;
    const pct = totalHabits > 0 ? Math.round((doneCount / totalHabits) * 100) : 0;

    // Donut ring calculation
    const donutSize = 120;
    const donutR = (donutSize - 16) / 2;
    const circumference = 2 * Math.PI * donutR;
    const dashOffset = circumference - (pct / 100) * circumference;

    const handleMentalBlur = () => {
        const val = parseInt(mentalInput);
        if (val >= 1 && val <= 10) {
            updateMentalState(activeDay, val);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Daily Check-in" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4 animate-pulse">
                        <div className="text-4xl">🎮</div>
                        <p className="text-gray-400 font-medium">Loading your habits...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Daily Check-in" saving={saving} />

            <div className="flex-1 overflow-y-auto pb-24">
                {/* Date & Progress Hero */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 md:p-8 lg:p-12">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8">
                        {/* Date Display */}
                        <div className="flex-1 text-center md:text-left animate-fade-up">
                            <p className="text-emerald-200 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-1 md:mb-2">
                                {format(today, 'EEEE')}
                            </p>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-1">
                                {format(today, 'dd')}
                            </h1>
                            <p className="text-emerald-100 text-base md:text-lg font-medium">
                                {format(today, 'MMMM yyyy')}
                            </p>
                        </div>

                        {/* Progress Donut */}
                        <div className="flex flex-col items-center animate-fade-up stagger-1">
                            <svg width={donutSize} height={donutSize} className="drop-shadow-lg">
                                <circle
                                    cx={donutSize / 2} cy={donutSize / 2} r={donutR}
                                    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={10}
                                />
                                {pct > 0 && (
                                    <circle
                                        cx={donutSize / 2} cy={donutSize / 2} r={donutR}
                                        fill="none"
                                        stroke={pct === 100 ? '#A5D6A7' : '#ffffff'}
                                        strokeWidth={10}
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                        strokeLinecap="round"
                                        transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                )}
                                <text
                                    x={donutSize / 2} y={donutSize / 2 + 6}
                                    textAnchor="middle"
                                    fontSize={pct === 100 ? 22 : 20}
                                    fontWeight="800"
                                    fill="#ffffff"
                                    fontFamily="'DM Sans', sans-serif"
                                >
                                    {pct}%
                                </text>
                            </svg>
                            <p className="text-emerald-200 text-xs font-bold mt-2 uppercase tracking-wider">
                                {doneCount} / {totalHabits} done
                            </p>
                        </div>
                    </div>
                </div>

                {/* Habit Checklist */}
                <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
                    <div className="flex items-center justify-between mb-2 mt-2">
                        <h3 className="text-xl font-serif font-black text-gray-900">Today's Habits</h3>
                        {pct === 100 && (
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-check-pop">
                                💀 All Done!
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {visibleHabits.map((habit, idx) => {
                            const done = checks[habit.id]?.[activeDay] || false;
                            return (
                                <button
                                    key={habit.id}
                                    onClick={() => toggleCheck(habit.id, activeDay)}
                                    role="checkbox"
                                    aria-checked={done}
                                    aria-label={`${habit.name} — ${done ? 'completed' : 'not completed'}`}
                                    className={`
                                        w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200
                                        animate-fade-up
                                        ${done
                                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                            : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-sm'
                                        }
                                    `}
                                    style={{ animationDelay: `${idx * 0.03}s` }}
                                >
                                    {/* Checkbox */}
                                    <div className={`
                                        w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all
                                        ${done
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                            : 'bg-gray-100 text-gray-300'
                                        }
                                    `}>
                                        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </div>

                                    {/* Emoji + Name */}
                                    <span className="text-2xl" aria-hidden="true">{habit.emoji}</span>
                                    <span className={`
                                        text-sm font-semibold flex-1 text-left transition-all
                                        ${done ? 'text-emerald-700 line-through' : 'text-gray-800'}
                                    `}>
                                        {habit.name}
                                    </span>

                                    {/* Category */}
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                        {habit.category}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Mental State Input */}
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 mt-8 animate-fade-up stagger-5">
                        <div className="flex items-center gap-3 mb-4">
                            <Brain className="text-amber-600" size={20} />
                            <h4 className="text-sm font-bold text-amber-800">Mental State</h4>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Rate 1–10</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={mentalInput || 5}
                                onChange={(e) => setMentalInput(e.target.value)}
                                onMouseUp={handleMentalBlur}
                                onTouchEnd={handleMentalBlur}
                                onKeyUp={handleMentalBlur}
                                aria-label="Mental state rating from 1 to 10"
                                aria-valuetext={`${mentalInput || 5} out of 10`}
                                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #EF5350 0%, #FF8F00 50%, #4CAF50 100%)`,
                                }}
                            />
                            <span className="text-2xl font-serif font-bold text-amber-700 min-w-[2ch] text-center" aria-live="polite">
                                {mentalInput || '–'}
                            </span>
                        </div>
                    </div>

                    {/* Daily Wins Tracker */}
                    <div className="mt-12 space-y-6 animate-fade-up stagger-6">
                        <div className="flex items-center gap-3">
                            <Trophy className="text-emerald-600" size={24} />
                            <h3 className="text-xl font-serif font-bold text-gray-900">Daily Wins</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'Physical', icon: Zap, color: 'emerald', label: 'Physical', placeholder: 'Workout, hydration, sleep...' },
                                { id: 'Mental', icon: Brain, color: 'amber', label: 'Mental', placeholder: 'Learning, focus, meditation...' },
                                { id: 'Social', icon: Heart, color: 'rose', label: 'Social', placeholder: 'Family, friends, kindness...' },
                                { id: 'Financial', icon: DollarSign, color: 'blue', label: 'Financial', placeholder: 'Savings, budget, investments...' },
                                { id: 'Spiritual', icon: Star, color: 'purple', label: 'Spiritual', placeholder: 'Peace, nature, growth...' },
                            ].map((cat) => (
                                <div
                                    key={cat.id}
                                    className="p-5 rounded-3xl border transition-all duration-300 bg-white hover:shadow-md border-gray-100 group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-xl bg-gray-50 text-gray-600 group-hover:scale-110 transition-transform">
                                            <cat.icon size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-800 flex-1">{cat.label}</h4>

                                        {/* Suggestions Dropdown */}
                                        <div className="relative">
                                            <select
                                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const current = wins[cat.id] || '';
                                                        const newVal = current ? `${current}, ${e.target.value}` : e.target.value;
                                                        saveWin(cat.id, newVal);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            >
                                                <option value="">💡 Pick a Win</option>
                                                {WIN_SUGGESTIONS[cat.id]?.map((s, idx) => (
                                                    <option key={idx} value={s}>{s}</option>
                                                ))}
                                            </select>
                                            <div className="text-[11px] font-black bg-emerald-50 text-emerald-600 rounded-xl px-3 py-2 flex items-center gap-1.5 whitespace-nowrap">
                                                <span>💡 Suggestions</span>
                                            </div>
                                        </div>
                                    </div>
                                    <textarea
                                        value={wins[cat.id] || ''}
                                        onChange={(e) => saveWin(cat.id, e.target.value)}
                                        placeholder={cat.placeholder}
                                        className="w-full bg-gray-50/50 border border-transparent focus:border-emerald-100 focus:bg-white rounded-2xl text-base md:text-sm text-gray-600 placeholder:text-gray-300 resize-none h-24 p-3 transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default DailyCheckin;
