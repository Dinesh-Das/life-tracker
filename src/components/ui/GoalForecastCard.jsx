import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { forecastHabit } from '../../lib/habitSchedule';

export default function GoalForecastCard({ habits, checks, selectedDate, daysInMonth }) {
    const forecasts = useMemo(() => habits.map(habit => ({
        habit,
        ...forecastHabit(habit, checks[habit.id], selectedDate, daysInMonth),
    })).sort((a, b) => a.status === 'at-risk' ? -1 : b.status === 'at-risk' ? 1 : b.remaining - a.remaining), [checks, daysInMonth, habits, selectedDate]);
    if (!forecasts.length) return null;
    return (
        <section className="glass-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-ink)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-heading)' }}>Goal forecast</h3>
            </div>
            <div className="responsive-grid" style={{ gap: 10 }}>
                {forecasts.slice(0, 6).map(item => (
                    <div key={item.habit.id} style={{ padding: 12, borderRadius: 12, background: 'var(--surface-inner)', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{item.habit.emoji}</span>
                            <strong style={{ color: 'var(--text-heading)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.habit.name}</strong>
                            {item.status === 'complete' ? <CheckCircle2 size={15} color="var(--positive)" /> : item.status === 'at-risk' ? <AlertTriangle size={15} color="var(--warning-ink)" /> : <TrendingUp size={15} color="var(--accent-ink)" />}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
                            {item.completed}/{item.target} · projected {item.projected}
                            {item.remaining > 0 ? ` · ${item.weeklyPace}/week needed` : ' · goal reached'}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
