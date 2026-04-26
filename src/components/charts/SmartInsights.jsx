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
                text: `In ${stats.bestMonth.name}, you achieved a ${stats.bestMonth.pct}% completion rate. Aim to beat this record in the coming months!`
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
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow"
                >
                    <div className={`p-3 rounded-2xl ${
                        insight.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                        insight.type === 'growth' ? 'bg-blue-50 text-blue-600' :
                        'bg-amber-50 text-amber-600'
                    }`}>
                        <insight.icon size={22} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-900">{insight.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{insight.text}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
