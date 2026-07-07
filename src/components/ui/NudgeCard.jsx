import { useMemo, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { habitMoodCorrelations, habitNextDayMoodCorrelations, weekdayCompletion } from '../../lib/correlations';
import { generateNudges, visibleNudges, dismissNudge } from '../../lib/nudges';

/**
 * Correlation nudges — turns the passive "what moves your mood" insights
 * into at most two actionable prompts. Dismissed nudges stay hidden for
 * the rest of the ISO week, then return if the pattern persists.
 */
function NudgeCard({ habits, checks, mentalState, daysInMonth, year, monthIndex }) {
    const [dismissedTick, setDismissedTick] = useState(0);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const upToDay = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    const nudges = useMemo(() => {
        const moodInsights = habitMoodCorrelations(habits, checks, mentalState, daysInMonth);
        const nextDayInsights = habitNextDayMoodCorrelations(habits, checks, mentalState, daysInMonth);
        const weekday = weekdayCompletion(habits, checks, upToDay, year, monthIndex);
        return visibleNudges(generateNudges({ moodInsights, nextDayInsights, weekday }));
    }, [habits, checks, mentalState, daysInMonth, upToDay, year, monthIndex, dismissedTick]);

    if (nudges.length === 0) return null;

    const handleDismiss = (id) => {
        dismissNudge(id);
        setDismissedTick(t => t + 1);
    };

    return (
        <div className="glass-card animate-fade-up" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Lightbulb size={18} style={{ color: '#f0c060' }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    Nudges
                </h4>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    From your own data
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nudges.map((n) => (
                    <div
                        key={n.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.35)',
                        }}
                    >
                        <span style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">{n.emoji}</span>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5, flex: 1 }}>
                            {n.text}
                        </p>
                        <button
                            onClick={() => handleDismiss(n.id)}
                            aria-label="Dismiss nudge for this week"
                            title="Dismiss for this week"
                            style={{
                                border: 'none', background: 'rgba(45,79,65,0.12)', borderRadius: '9999px',
                                width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NudgeCard;