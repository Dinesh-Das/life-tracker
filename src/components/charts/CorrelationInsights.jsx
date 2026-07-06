import { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { habitMoodCorrelations, habitNextDayMoodCorrelations, weekdayCompletion } from '../../lib/correlations';
/**
 * "What moves your mood" — correlates habit completion with mental-state
 * ratings and surfaces the strongest effects, plus weekday patterns.
 * Pure client-side analytics over data the app already collects.
 */
function CorrelationInsights({ habits, checks, mentalState, daysInMonth, year, monthIndex }) {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const upToDay = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    const moodInsights = useMemo(
        () => habitMoodCorrelations(habits, checks, mentalState, daysInMonth).slice(0, 3),
        [habits, checks, mentalState, daysInMonth]
    );

    const nextDayInsights = useMemo(
        () => habitNextDayMoodCorrelations(habits, checks, mentalState, daysInMonth).slice(0, 2),
        [habits, checks, mentalState, daysInMonth]
    );

    const { best, worst } = useMemo(
        () => weekdayCompletion(habits, checks, upToDay, year, monthIndex),
        [habits, checks, upToDay, year, monthIndex]
    );

    const hasWeekdayInsight = best && worst && best.day !== worst.day && best.pct !== worst.pct;

    if (moodInsights.length === 0 && nextDayInsights.length === 0 && !hasWeekdayInsight) return null;

    return (
        <div className="glass-card animate-fade-up" style={{ padding: '20px 24px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Sparkles size={18} style={{ color: '#4a7a62' }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    What Moves Your Mood
                </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {moodInsights.map((ins) => (
                    <div
                        key={ins.habitId}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.35)',
                        }}
                    >
                        {ins.delta >= 0
                            ? <TrendingUp size={16} style={{ color: '#2d7a52', flexShrink: 0 }} />
                            : <TrendingDown size={16} style={{ color: '#b0563a', flexShrink: 0 }} />}
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                            <strong>{ins.emoji} {ins.habitName}:</strong> your mental state averages{' '}
                            <strong>{ins.doneAvg}</strong> on days you complete it vs{' '}
                            <strong>{ins.missAvg}</strong> when you skip it ({ins.delta >= 0 ? '+' : ''}{ins.delta}).
                        </p>
                    </div>
                ))}
                
                {nextDayInsights.map((ins) => (
                    <div
                        key={`next-${ins.habitId}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.35)',
                        }}
                    >
                        <Sparkles size={16} style={{ color: '#8060c0', flexShrink: 0 }} />
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                            <strong>{ins.emoji} {ins.habitName}</strong> carries over: your <em>next-day</em> mood averages{' '}
                            <strong>{ins.doneAvg}</strong> after completing it vs <strong>{ins.missAvg}</strong> after missing it ({ins.delta >= 0 ? '+' : ''}{ins.delta}).
                        </p>
                    </div>
                ))}

                {hasWeekdayInsight && (
                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.35)',
                        }}
                    >
                        <CalendarDays size={16} style={{ color: '#4a7a62', flexShrink: 0 }} />
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                            Your strongest day is <strong>{best.day}</strong> ({best.pct}% completion); your weakest is{' '}
                            <strong>{worst.day}</strong> ({worst.pct}%).
                        </p>
                    </div>
                )}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '12px' }}>
                Based on this month&apos;s rated days — log your mental state daily for sharper insights
            </p>
        </div>
    );
}

export default CorrelationInsights;