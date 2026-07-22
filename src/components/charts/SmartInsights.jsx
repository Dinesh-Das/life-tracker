import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export default function SmartInsights({ habits, stats, yearlyTrend }) {
    const insights = useMemo(() => {
        const list = [];

        // 1. Best Month Insight
        if (stats.bestMonth && stats.bestMonth.pct > 0) {
            list.push({
                type: 'success',
                icon: CheckCircle2,
                title: "Peak Performance",
                text: `In ${stats.bestMonth.name}, you logged activity on ${stats.bestMonth.pct}% of calendar days. Aim to beat this record in the coming months!`
            });
        }

        // 2. Trend Insight
        const recentMonths = yearlyTrend.filter(m => m.pct > 0);
        if (recentMonths.length >= 2) {
            const last = recentMonths[recentMonths.length - 1];
            const prev = recentMonths[recentMonths.length - 2];
            if (last.pct > prev.pct) {
                list.push({
                    type: 'growth',
                    icon: TrendingUp,
                    title: "Positive Momentum",
                    text: `Your completion rate grew by ${last.pct - prev.pct}% compared to last month. You're building solid consistency.`
                });
            }
        }

        // 3. Category Focus
        const lowHabits = habits.filter(h => h.goal > 0); // Simplified check
        if (lowHabits.length > 0) {
            list.push({
                type: 'info',
                icon: Lightbulb,
                title: "Consistency Tip",
                text: "Try to link your hardest habit to an existing routine (Habit Stacking) to increase your success rate."
            });
        }

        // Fallback if empty
        if (list.length === 0) {
            list.push({
                type: 'info',
                icon: AlertCircle,
                title: "Starting Your Journey",
                text: "Complete more habits to unlock personalized AI insights and trend analysis."
            });
        }

        return list;
    }, [habits, stats, yearlyTrend]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.map((insight, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '20px 22px' }}
                >
                    <div style={{
                        padding: '10px', borderRadius: '10px', flexShrink: 0,
                        background: insight.type === 'success' ? 'rgba(45,79,65,0.4)' :
                                    insight.type === 'growth'  ? 'rgba(80,120,220,0.4)' : 'rgba(220,160,50,0.4)',
                        color: insight.type === 'success' ? '#a9cfbc' :
                               insight.type === 'growth'  ? '#a0b8f0' : '#f0d080',
                    }}>
                        <insight.icon size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>{insight.title}</h4>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>{insight.text}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
