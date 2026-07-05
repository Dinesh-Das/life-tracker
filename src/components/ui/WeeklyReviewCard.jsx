
import { useMemo } from 'react';
import { CalendarCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useHabits } from '../../hooks/useHabits';
import { useStreaks } from '../../hooks/useStreaks';
import { buildWeeklyReview } from '../../lib/weeklyReview';
import { earnedMilestones } from '../../lib/milestones';

const Stat = ({ label, children }) => (
    <div className="glass-card-inner" style={{ padding: '12px 14px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {label}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>
            {children}
        </p>
    </div>
);

/**
 * "Your Last 7 Days" — completion, star habit, needs-attention habit,
 * mood trend vs the previous week, and earned streak badges.
 * Reads are served from the shared sheetsApi cache, so this adds no
 * meaningful load on top of the check-in pages.
 */
function WeeklyReviewCard() {
    const { spreadsheetId } = useAuth();
    const { currentMonth, currentYear, currentMonthIndex, gender } = useAppContext();
    const { habits, checks, mentalState, loading } = useHabits(spreadsheetId, currentMonth, currentYear, currentMonthIndex);

    const visibleHabits = useMemo(() => {
        if (gender === 'female') return habits;
        return habits.filter(h => !h.femaleOnly);
    }, [habits, gender]);

    const { habitStreaks } = useStreaks(visibleHabits, checks);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonthIndex && today.getFullYear() === currentYear;
    const todayDay = isCurrentMonth ? today.getDate() : 1;

    const review = useMemo(
        () => buildWeeklyReview(visibleHabits, checks, mentalState, todayDay),
        [visibleHabits, checks, mentalState, todayDay]
    );

    const milestones = useMemo(
        () => earnedMilestones(visibleHabits, habitStreaks).slice(0, 3),
        [visibleHabits, habitStreaks]
    );

    if (loading || !review) return null;

    const moodDelta = review.moodAvg !== null && review.moodPrevAvg !== null
        ? Math.round((review.moodAvg - review.moodPrevAvg) * 10) / 10
        : null;

    return (
        <div className="glass-card animate-fade-up" style={{ padding: '24px 28px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CalendarCheck size={18} style={{ color: '#4a7a62' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    Your Last {review.days} Days
                </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Completion">{review.completionPct}%</Stat>
                <Stat label="Star Habit">
                    {review.best.emoji} {review.best.name} ({review.best.count}/{review.days})
                </Stat>
                {review.worst && (
                    <Stat label="Needs Attention">
                        {review.worst.emoji} {review.worst.name} ({review.worst.count}/{review.days})
                    </Stat>
                )}
                <Stat label="Avg Mood">
                    {review.moodAvg !== null ? review.moodAvg : '—'}
                    {moodDelta !== null && moodDelta !== 0 && (
                        <span style={{ marginLeft: '6px', fontSize: '12px', color: moodDelta > 0 ? '#2d7a52' : '#b0563a' }}>
                            {moodDelta > 0 ? <TrendingUp size={12} style={{ display: 'inline' }} /> : <TrendingDown size={12} style={{ display: 'inline' }} />}
                            {' '}{moodDelta > 0 ? '+' : ''}{moodDelta} vs last week
                        </span>
                    )}
                </Stat>
            </div>

            {milestones.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {milestones.map(m => (
                        <span key={m.habitId} className="chip chip-green">
                            {m.emoji} {m.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default WeeklyReviewCard;