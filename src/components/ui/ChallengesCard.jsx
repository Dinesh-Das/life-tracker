import { Medal, CheckCircle2 } from 'lucide-react';
import { monthlyChallenges } from '../../lib/challenges';

/** Monthly challenge progress — Perfect Week, Consistency 80, Iron Habit. */
function ChallengesCard({ habits, checks, daysInMonth, upToDay, monthLabel, year, monthIndex, globalPause = null }) {
    if (!upToDay || !habits || habits.length === 0) return null;
    const challenges = monthlyChallenges(habits, checks, daysInMonth, upToDay, { year, monthIndex, globalPause });
    if (challenges.length === 0) return null;

    return (
        <div className="glass-card animate-fade-up" style={{ padding: '20px 24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Medal size={18} style={{ color: '#f0c060' }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    {monthLabel} Challenges
                </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {challenges.map(ch => {
                    const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
                    return (
                        <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">{ch.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>{ch.label}</span>
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>{ch.desc}</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '9999px', background: 'var(--ring-track)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '9999px', background: ch.achieved ? 'var(--gold)' : 'var(--accent-ink)', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                            {ch.achieved ? (
                                <CheckCircle2 size={18} style={{ color: '#f0c060', flexShrink: 0 }} />
                            ) : (
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                                    {ch.note || `${ch.progress}/${ch.target}`}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ChallengesCard;
