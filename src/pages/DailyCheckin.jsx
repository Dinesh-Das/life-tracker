import Header from '../components/layout/Header'
import { useAuth } from '../context/AuthContext'
import { useAppContext } from '../context/AppContext'
import { useHabits } from '../hooks/useHabits'
import { format } from 'date-fns'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Brain, Trophy, Zap, Heart, DollarSign, Star, ChevronLeft, ChevronRight, CalendarClock, Info, Snowflake, Bell, BellOff } from 'lucide-react'
import { useWins } from '../hooks/useWins';
import { useStreaks } from '../hooks/useStreaks';
import { useSkipDay } from '../hooks/useSkipDay';
import { useSleep } from '../hooks/useSleep';
import { useMetrics } from '../hooks/useMetrics';
import { useReminders } from '../hooks/useReminders';
import SleepLogger from '../components/ui/SleepLogger';
import QuickMetrics from '../components/ui/QuickMetrics';
import { weeklyCount, weeklyTarget } from '../lib/frequency';
import { newMilestonesToCelebrate } from '../lib/celebrations';
import { saveNote } from '../lib/habitNotes';
import ChallengesCard from '../components/ui/ChallengesCard';
import CorrelationInsights from '../components/charts/CorrelationInsights';
import HabitDetailModal from '../components/ui/HabitDetailModal';
import { WIN_SUGGESTIONS } from '../lib/winSuggestions';
import CelebrationOverlay from '../components/ui/CelebrationOverlay';
import StreakBankCard from '../components/ui/StreakBankCard';
import DecayWarningCard from '../components/ui/DecayWarningCard';
import { useDecayWarnings } from '../hooks/useDecayWarnings';
import { recordFreezeEvent } from '../lib/freezeLedger';
import toast from 'react-hot-toast';

const EMPTY_WINS = { Physical: '', Mental: '', Social: '', Financial: '', Spiritual: '' };

function DailyCheckin() {
    const { spreadsheetId } = useAuth();
    const {
        currentDate, currentMonth, currentYear, currentMonthIndex, gender,
        prevMonth, nextMonth, selectDate, goToToday,
    } = useAppContext();

    const {
        habits,
        checks,
        mentalState,
        loading: habitsLoading,
        saving: habitsSaving,
        daysInMonth,
        toggleCheck,
        updateMentalState,
        error: habitsError,
        reload: reloadHabits,
    } = useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex);

    const today = new Date();
    const todayDay = today.getDate();
    const isCurrentMonth = today.getMonth() === currentMonthIndex && today.getFullYear() === currentYear;
    const isFutureMonth = new Date(currentYear, currentMonthIndex, 1) > today;

    const selectedDate = currentDate;
    const activeDay = selectedDate.getDate();
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const isBackfilling = !isCurrentMonth || activeDay !== todayDay;

    const {
        wins,
        loading: winsLoading,
        saving: winsSaving,
        saveWin
    } = useWins(spreadsheetId, selectedDateStr);

    const {
        tokens: skipTokens, used: usedTokens, bestStreak: bankBestStreak,
        daysToNextToken, cap: tokenCap, skipDay, repairYesterday,
    } = useSkipDay(spreadsheetId, currentMonth, currentYear);
    const sleep = useSleep(spreadsheetId, selectedDateStr);
    const metrics = useMetrics(spreadsheetId, selectedDateStr);
    const { remindersOn, toggleReminders } = useReminders();

    // Local buffer so typing in the textarea doesn't re-render via hook state on every keystroke.
    // Synced from `wins` when the selected day's wins load from the sheet.
    const [localWins, setLocalWins] = useState(EMPTY_WINS);
    useEffect(() => {
        if (!winsLoading) {
            setLocalWins({ ...EMPTY_WINS, ...wins });
        }
    }, [winsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleWinChange = useCallback((catId, text) => {
        setLocalWins(prev => ({ ...prev, [catId]: text }));
        saveWin(catId, text);
    }, [saveWin]);

    const loading = habitsLoading || winsLoading;
    const saving = habitsSaving || winsSaving;


    const [mentalInput, setMentalInput] = useState(mentalState[activeDay] || '');

    // Sync mental input with fetched state (clears when switching to an empty day)
    useEffect(() => {
        setMentalInput(mentalState[activeDay] !== undefined ? mentalState[activeDay] : '');
    }, [mentalState, activeDay]);

    // Filter habits by gender
    const visibleHabits = useMemo(() => {
        if (gender === 'female') return habits;
        return habits.filter(h => !h.femaleOnly);
    }, [habits, gender]);

    const { habitStreaks } = useStreaks(visibleHabits, checks);
    const [detailHabit, setDetailHabit] = useState(null);
    const [localSkipped, setLocalSkipped] = useState({});
    const [repaired, setRepaired] = useState({});
    const [celebration, setCelebration] = useState(null);

    // Habit decay — flag slipping habits before the streak actually breaks.
    // Uses the FULL habit list so previous-month rows stay sheet-aligned.
    const { warnings: allDecayWarnings, dismissForWeek } = useDecayWarnings(spreadsheetId, habits, checks, isCurrentMonth);
    const decayWarnings = useMemo(
        () => allDecayWarnings.filter(w => visibleHabits.some(h => h.id === w.habitId)),
        [allDecayWarnings, visibleHabits]
    );

    const dayIsSkipped = useMemo(() => (
        !!localSkipped[activeDay] || visibleHabits.some(h => checks[h.id]?.[activeDay] === 'skip')
    ), [localSkipped, visibleHabits, checks, activeDay]);

    // Streak recovery: habits missed yesterday (single-day gap) that can be
    // repaired by completing them today, marking yesterday as a skip.
    const recoverable = useMemo(() => {
        if (!isCurrentMonth || todayDay <= 2) return [];
        return visibleHabits.filter(h =>
            !repaired[h.id] &&
            checks[h.id]?.[todayDay - 1] !== true &&
            checks[h.id]?.[todayDay - 1] !== 'skip' &&
            checks[h.id]?.[todayDay - 2] === true
        );
    }, [visibleHabits, checks, isCurrentMonth, todayDay, repaired]);

    // Milestone celebrations — fires once per streak tier per habit (per device).
    // The highest fresh milestone gets the full overlay; any extras get toasts.
    useEffect(() => {
        if (loading) return;
        const fresh = newMilestonesToCelebrate(visibleHabits, habitStreaks);
        if (fresh.length === 0) return;
        setCelebration(prev => prev || fresh[0]);
        fresh.slice(1).forEach((m, i) => {
            setTimeout(() => toast.success(`${m.label} 🎉`, { icon: m.emoji, duration: 5000 }), i * 700);
        });
    }, [loading, visibleHabits, habitStreaks]);

    const doneCount = useMemo(() => {
        return visibleHabits.filter(h => checks[h.id]?.[activeDay] === true).length;
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
    
    const jumpToToday = goToToday;

    if (habitsError) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Daily Check-in" subtitle={format(selectedDate, 'EEEE, MMMM d')} />
                <div className="px-4 py-6 sm:px-10" role="alert">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', marginBottom: '8px' }}>Habits could not be loaded</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{habitsError.message || 'Check your connection and retry.'}</p>
                        <button className="glass-button" onClick={reloadHabits} style={{ padding: '10px 18px', borderRadius: '9999px' }}>Retry habits</button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Daily Check-in" subtitle={format(today, 'EEEE, MMMM d')} />
                <div className="px-4 py-6 sm:px-10">
                    <div className="text-center animate-fade-up" style={{ padding: '40px 0' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>Loading your habits...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Daily Check-in" subtitle={format(selectedDate, 'EEEE, MMMM d')} saving={saving} />

            <div className="w-full px-4 pt-4 pb-20 sm:px-10">

                {/* Day Picker — pick a past day to backfill missed entries */}
                <div className="glass-card animate-fade-up" style={{ padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <button
                            className="glass-button"
                            onClick={prevMonth}
                            aria-label="Previous month"
                            style={{ borderRadius: '9999px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-heading)' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {currentMonth} {currentYear}
                        </p>
                        <button
                            className="glass-button"
                            onClick={nextMonth}
                            disabled={isCurrentMonth}
                            aria-label="Next month"
                            style={{ borderRadius: '9999px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', opacity: isCurrentMonth ? 0.35 : 1, color: 'var(--text-heading)' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="scrollbar-thin" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const isFuture = isCurrentMonth ? d > todayDay : isFutureMonth;
                            const isSelected = d === activeDay;
                            const isToday = isCurrentMonth && d === todayDay;
                            return (
                                <button
                                    key={d}
                                    onClick={() => !isFuture && selectDate(new Date(currentYear, currentMonthIndex, d))}
                                    disabled={isFuture}
                                    aria-label={`Select day ${d}`}
                                    aria-pressed={isSelected}
                                    style={{
                                        minWidth: '44px', height: '52px', flexShrink: 0,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                                        borderRadius: '12px',
                                        border: isSelected ? '1px solid rgba(45,79,65,0.5)' : '1px solid var(--control-border)',
                                        background: isSelected ? 'rgba(45,79,65,0.7)' : (isToday ? 'var(--surface-inner-strong)' : 'var(--surface-inner)'),
                                        color: isSelected ? '#a9cfbc' : (isFuture ? 'var(--disabled-ink)' : 'var(--text-body)'),
                                        cursor: isFuture ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>
                                        {format(new Date(currentYear, currentMonthIndex, d), 'EEE')}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700 }}>{d}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Backfill banner — shown when editing a past day */}
                {isBackfilling && (
                    <div className="animate-fade-up" style={{
                        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                        padding: '10px 16px', marginBottom: '16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                    }}>
                        <CalendarClock size={16} style={{ color: 'var(--warning-ink)', flexShrink: 0 }} />
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--warning-ink)', flex: 1, minWidth: '160px' }}>
                            Backfilling {format(selectedDate, 'EEEE, MMMM d')} — entries save to that day.
                        </p>
                        <button
                            onClick={jumpToToday}
                            style={{
                                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                padding: '6px 14px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                                background: 'rgba(122,74,32,0.85)', color: '#f0c898',
                            }}
                        >
                            Back to Today
                        </button>
                    </div>
                )}


                {/* Progress Hero Card */}
                <div className="glass-card animate-fade-up" style={{ padding: '28px 32px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            {format(selectedDate, 'EEEE')}
                        </p>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1, marginBottom: '4px' }}>
                            {format(selectedDate, 'dd')}
                        </h2>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-muted)' }}>
                            {format(selectedDate, 'MMMM yyyy')}
                        </p>
                    </div>

                    {/* Progress Donut */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div className="circle-progress" style={{ width: donutSize, height: donutSize }}>
                            <svg width={donutSize} height={donutSize}>
                                <circle cx={donutSize / 2} cy={donutSize / 2} r={donutR} fill="none" stroke="var(--ring-track)" strokeWidth={10} />
                                {pct > 0 && (
                                    <circle
                                        cx={donutSize / 2} cy={donutSize / 2} r={donutR}
                                        fill="none" stroke="var(--accent-ink)" strokeWidth={10}
                                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                        strokeLinecap="round"
                                        transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                )}
                                <text x={donutSize / 2} y={donutSize / 2 + 7}
                                    textAnchor="middle" fontSize={20} fontWeight="700"
                                    fill="var(--text-heading)" fontFamily="Manrope, sans-serif"
                                >
                                    {pct}%
                                </text>
                            </svg>
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {doneCount} / {totalHabits} done
                        </p>
                    </div>
                </div>
                
                {/* Monthly Challenges */}
                <ChallengesCard
                    habits={visibleHabits}
                    checks={checks}
                    daysInMonth={daysInMonth}
                    upToDay={isCurrentMonth ? todayDay : (isFutureMonth ? 0 : daysInMonth)}
                    monthLabel={currentMonth}
                />

                {/* Streak Bank — freeze-token budget, progress and history */}
                <StreakBankCard
                    tokens={skipTokens}
                    used={usedTokens}
                    bestStreak={bankBestStreak}
                    daysToNextToken={daysToNextToken}
                    cap={tokenCap}
                />

                {/* Habit decay warnings — dismissable for the week */}
                {!isBackfilling && decayWarnings.length > 0 && (
                    <DecayWarningCard warnings={decayWarnings} onDismiss={dismissForWeek} />
                )}

                {/* Habit Checklist */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text-heading)' }}>
                            {isBackfilling ? `Habits — ${format(selectedDate, 'MMM d')}` : "Today's Habits"}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={toggleReminders}
                                title={remindersOn ? 'Evening reminder on (8pm)' : 'Enable evening reminder'}
                                aria-label={remindersOn ? 'Disable evening reminder' : 'Enable evening reminder'}
                                className="glass-button"
                                style={{
                                    width: '32px', height: '32px', borderRadius: '9999px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)',
                                    color: remindersOn ? '#4a7a62' : 'var(--text-muted)',
                                }}
                            >
                                {remindersOn ? <Bell size={14} /> : <BellOff size={14} />}
                            </button>
                            {dayIsSkipped ? (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'var(--info-bg-soft)', color: 'var(--info-ink)',
                                    padding: '5px 14px', borderRadius: '9999px',
                                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                                    fontFamily: 'var(--font-body)',
                                }}>
                                    <Snowflake size={12} /> Day Frozen
                                </span>
                            ) : pct < 100 && (
                                <button
                                    onClick={async () => {
                                        const ok = await skipDay(activeDay, habits, checks);
                                        if (ok) {
                                            setLocalSkipped(prev => ({ ...prev, [activeDay]: true }));
                                            recordFreezeEvent({ type: 'freeze', date: selectedDateStr });
                                            const reason = window.prompt('Optional: why are you skipping today? (feeds future insights)');
                                            if (reason && reason.trim()) {
                                                saveNote(spreadsheetId, '_skip', selectedDateStr, reason.trim()).catch(() => {});
                                            }
                                        }
                                    }}
                                    disabled={skipTokens <= 0}
                                    title={skipTokens > 0 ? 'Freeze this day — streaks stay safe' : 'Earn a token with a 14-day streak'}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: skipTokens > 0 ? 'var(--info-bg)' : 'var(--disabled-bg)',
                                        color: skipTokens > 0 ? '#eaf4ff' : 'var(--text-muted)',
                                        padding: '6px 14px', borderRadius: '9999px', border: 'none',
                                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                                        fontFamily: 'var(--font-body)',
                                        cursor: skipTokens > 0 ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <Snowflake size={12} /> Skip Day ({skipTokens})
                                </button>
                            )}
                            {pct === 100 && (
                                <span style={{
                                    background: 'rgba(45,79,65,0.65)', color: '#a9cfbc',
                                    padding: '5px 14px', borderRadius: '9999px',
                                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                                }} className="animate-check-pop">
                                    All Done! 🎉
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Streak recovery — repair yesterday's single miss */}
                    {!isBackfilling && recoverable.length > 0 && (
                        <div className="glass-card animate-fade-up" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '10px' }}>
                                💪 Streak recovery available — complete the habit today, then repair yesterday:
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {recoverable.map(h => {
                                    const doneToday = checks[h.id]?.[todayDay] === true;
                                    return (
                                        <button
                                            key={h.id}
                                            disabled={!doneToday}
                                            title={doneToday ? 'Repair yesterday' : 'Complete this habit today first'}
                                            onClick={async () => {
                                                const ok = await repairYesterday(h.id, todayDay - 1);
                                                if (ok) {
                                                    setRepaired(prev => ({ ...prev, [h.id]: true }));
                                                    const missedDateStr = format(new Date(currentYear, currentMonthIndex, todayDay - 1), 'yyyy-MM-dd');
                                                    recordFreezeEvent({ type: 'repair', date: missedDateStr, habitName: h.name });
                                                    const reason = window.prompt(`Optional: why was ${h.name} missed yesterday?`);
                                                    if (reason && reason.trim()) {
                                                        saveNote(spreadsheetId, h.id, missedDateStr, reason.trim()).catch(() => {});
                                                    }
                                                    // Comeback celebration — bouncing back matters more than never missing
                                                    setCelebration({
                                                        emoji: '💪',
                                                        days: (habitStreaks[h.id]?.current || 1) + 1,
                                                        habitId: h.id,
                                                        habitName: h.name,
                                                        habitEmoji: h.emoji,
                                                        label: `${h.emoji} ${h.name} — Comeback`,
                                                        title: 'Comeback Complete!',
                                                        subtitle: 'You missed a day and came right back — that is how streaks survive',
                                                    });
                                                }
                                            }}
                                            style={{
                                                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                                                padding: '6px 12px', borderRadius: '9999px', border: 'none',
                                                background: doneToday ? 'rgba(45,79,65,0.7)' : 'rgba(120,120,120,0.25)',
                                                color: doneToday ? '#a9cfbc' : 'var(--text-muted)',
                                                cursor: doneToday ? 'pointer' : 'not-allowed',
                                            }}
                                        >
                                            {h.emoji} Repair {h.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {visibleHabits.map((habit, idx) => {
                            const done = checks[habit.id]?.[activeDay] === true;
                            const skippedDay = checks[habit.id]?.[activeDay] === 'skip' || (!done && !!localSkipped[activeDay]);
                            return (
                                <div
                                    key={habit.id}
                                    className="animate-fade-up"
                                    style={{ display: 'flex', gap: '8px', animationDelay: `${idx * 0.03}s` }}
                                >
<button
                                        onClick={() => toggleCheck(habit.id, activeDay)}
                                        role="checkbox"
                                        aria-checked={done}
                                        aria-label={`${habit.name} — ${done ? 'completed' : 'not completed'}`}
                                        style={{
                                            flex: 1, minWidth: 0,
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: done ? '1px solid rgba(45,79,65,0.35)' : '1px solid var(--control-border)',
                                            background: done ? 'rgba(45,79,65,0.25)' : 'var(--surface-inner)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <div style={{
                                            width: '26px', height: '26px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            background: done ? 'rgba(45,79,65,0.7)' : 'var(--surface-inner-strong)',
                                            color: done ? '#a9cfbc' : 'var(--disabled-ink)',
                                            transition: 'all 0.2s',
                                        }}>
                                        {done ? <CheckCircle2 size={16} /> : skippedDay ? <Snowflake size={16} /> : <Circle size={16} />}
                                        </div>
                                        
                                        {/* Emoji + Name */}
                                        <span style={{ fontSize: '22px' }} aria-hidden="true">{habit.emoji}</span>
                                        <span style={{
                                            fontFamily: 'var(--font-body)',
                                            fontSize: '14px', fontWeight: 500, flex: 1,
                                            color: done ? 'var(--text-muted)' : 'var(--text-body)',
                                            textDecoration: done ? 'line-through' : 'none',
                                            opacity: done ? 0.7 : 1,
                                            transition: 'all 0.2s',
                                        }}>
                                            {habit.name}
                                        </span>

                                        {/* Category badge */}
                                        <span style={{
                                            fontFamily: 'var(--font-body)',
                                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                            padding: '4px 10px', borderRadius: '9999px',
                                            background: 'rgba(45,79,65,0.4)', color: '#a9cfbc',
                                        }}>
                                            {habit.category}
                                        </span>
                                        
                                        {/* Weekly frequency progress (non-daily habits) */}
                                        {habit.frequency && habit.frequency !== 'Daily' && (
                                            <span style={{
                                                fontFamily: 'var(--font-body)',
                                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                                padding: '4px 10px', borderRadius: '9999px',
                                                background: 'rgba(160,120,40,0.35)', color: '#7a5a20',
                                            }}>
                                                {weeklyCount(checks[habit.id], activeDay, currentYear, currentMonthIndex)}/{weeklyTarget(habit.frequency)} wk
                                            </span>
                                        )}
                                    </button>

                                    {/* Detail view trigger */}
                                    <button
                                        onClick={() => setDetailHabit(habit)}
                                        aria-label={`View details for ${habit.name}`}
                                        className="glass-button"
                                        style={{
                                            width: '46px', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            color: 'var(--text-muted)', cursor: 'pointer',
                                        }}
                                    >
                                        <Info size={16} />
                                    </button>
                                </div>

                            );
                        })}
                    </div>
                </div>

                {/* Mental State */}
                <div className="glass-card animate-fade-up stagger-5" style={{ padding: '22px 24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <Brain style={{ color: '#f0c060' }} size={18} />
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>Mental State</h4>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginLeft: '4px' }}>Rate 1–10</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <input
                            type="range" min="1" max="10"
                            value={mentalInput || 5}
                            onChange={(e) => setMentalInput(e.target.value)}
                            onMouseUp={handleMentalBlur}
                            onTouchEnd={handleMentalBlur}
                            onKeyUp={handleMentalBlur}
                            aria-label="Mental state rating from 1 to 10"
                            style={{
                                flex: 1, height: '6px', borderRadius: '9999px', appearance: 'none', cursor: 'pointer',
                                background: `linear-gradient(to right, #EF5350 0%, #FF8F00 50%, #4a7a62 100%)`,
                            }}
                        />
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--text-heading)', minWidth: '2ch', textAlign: 'center' }} aria-live="polite">
                            {mentalInput || '–'}
                        </span>
                    </div>
                </div>
                
                {/* Mood ↔ Habit causality — same-day and next-day effects */}
                <div style={{ marginBottom: '24px' }}>
                    <CorrelationInsights
                        habits={visibleHabits}
                        checks={checks}
                        mentalState={mentalState}
                        daysInMonth={daysInMonth}
                        year={currentYear}
                        monthIndex={currentMonthIndex}
                    />
                </div>

                {/* Sleep & Quick Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up" style={{ marginBottom: '24px' }}>
                    <SleepLogger sleep={sleep} />
                    <QuickMetrics metrics={metrics} />
                </div>

                {/* Daily Wins */}
                <div className="animate-fade-up stagger-6">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Trophy style={{ color: '#f0c060' }} size={20} />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text-heading)' }}>Daily Wins</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { id: 'Physical',  icon: Zap,        label: 'Physical',  placeholder: 'Workout, hydration, sleep...' },
                            { id: 'Mental',    icon: Brain,       label: 'Mental',    placeholder: 'Learning, focus, meditation...' },
                            { id: 'Social',    icon: Heart,       label: 'Social',    placeholder: 'Family, friends, kindness...' },
                            { id: 'Financial', icon: DollarSign,  label: 'Financial', placeholder: 'Savings, budget, investments...' },
                            { id: 'Spiritual', icon: Star,        label: 'Spiritual', placeholder: 'Peace, nature, growth...' },
                        ].map((cat) => (
                            <div key={cat.id} className="glass-card" style={{ padding: '16px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ padding: '6px', borderRadius: '8px', background: 'var(--surface-inner-strong)', color: 'var(--text-heading)', flexShrink: 0 }}>
                                        <cat.icon size={16} />
                                    </div>
                                    <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>{cat.label}</h4>

                                    {/* Suggestions Dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const current = localWins[cat.id] || '';
                                                    const newVal = current ? `${current}, ${e.target.value}` : e.target.value;
                                                    handleWinChange(cat.id, newVal);
                                                    e.target.value = '';
                                                }
                                            }}
                                        >
                                            <option value="">💡 Pick a Win</option>
                                            {WIN_SUGGESTIONS[cat.id]?.map((s, idx) => (
                                                <option key={idx} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(45,79,65,0.4)', color: '#a9cfbc', borderRadius: '9999px', padding: '4px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                                            💡
                                        </div>
                                    </div>
                                </div>
                                <textarea
                                    value={localWins[cat.id] || ''}
                                    onChange={(e) => handleWinChange(cat.id, e.target.value)}
                                    placeholder={cat.placeholder}
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        borderRadius: '8px', border: '1px solid var(--control-border)',
                                        background: 'var(--surface-inner)', backdropFilter: 'blur(8px)',
                                        fontFamily: 'var(--font-body)', fontSize: '13px',
                                        color: 'var(--text-body)', lineHeight: 1.5,
                                        resize: 'none', outline: 'none', height: '80px',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--outline)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--control-border)'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {celebration && (
                <CelebrationOverlay milestone={celebration} onClose={() => setCelebration(null)} />
            )}
            
            <HabitDetailModal
                isOpen={!!detailHabit}
                onClose={() => setDetailHabit(null)}
                habit={detailHabit}
                checks={checks}
                mentalState={mentalState}
                daysInMonth={daysInMonth}
                streak={detailHabit ? habitStreaks[detailHabit.id] : null}
                spreadsheetId={spreadsheetId}
                monthLabel={`${currentMonth} ${currentYear}`}
            />
        </>
    );
}

export default DailyCheckin;
