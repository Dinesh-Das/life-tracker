import React from 'react';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { summarizeHabitPerformance } from '../../lib/habitAnalytics';

const formatTarget = value => Number.isInteger(value) ? value : value.toFixed(1);

const AnalysisPanel = ({ habits = [], checks = {}, daysInMonth = 31, upToDay = daysInMonth, year, monthIndex, globalPause = null }) => {
    const { completionPct, top, needsAttention } = summarizeHabitPerformance(habits, checks, {
        year,
        monthIndex,
        daysInMonth,
        upToDay,
        globalPause,
    });

    return (
        <div className="theme-panel-muted grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 p-8 rounded-[2rem] border">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Target size={24} />
                </div>
                <div>
                    <h4 className="theme-muted text-[10px] font-black uppercase tracking-widest mb-1">Global Completion</h4>
                    <p className="theme-heading text-2xl font-serif font-black">{completionPct}%</p>
                    <p className="theme-muted text-xs font-medium">Across all {habits.length} habits this month</p>
                </div>
            </div>

            <div className="theme-divider flex items-start gap-4 border-x px-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h4 className="theme-muted text-[10px] font-black uppercase tracking-widest mb-1">Top Performer</h4>
                    <p className="theme-heading text-xl font-serif font-black">
                        {top?.habit.name || '—'}
                    </p>
                    <p className="theme-muted text-xs font-medium italic">
                        {top ? `${top.pacePct}% of target pace · ${top.completed}/${formatTarget(top.target)}` : 'No eligible days recorded'}
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h4 className="theme-muted text-[10px] font-black uppercase tracking-widest mb-1">Attention Needed</h4>
                    <p className="theme-heading text-xl font-serif font-black">
                        {needsAttention?.habit.name || 'None'}
                    </p>
                    <p className="theme-muted text-xs font-medium italic">
                        {needsAttention
                            ? `${needsAttention.pacePct}% of target pace · ${formatTarget(needsAttention.shortfall)} behind`
                            : 'No target shortfalls recorded'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPanel;
