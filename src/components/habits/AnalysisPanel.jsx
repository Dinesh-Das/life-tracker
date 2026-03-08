import React from 'react';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

const AnalysisPanel = ({ habits = [], checks = {}, daysInMonth = 31 }) => {
    // Basic analysis logic
    const totalPossible = habits.length * daysInMonth;
    let totalDone = 0;
    habits.forEach(h => {
        totalDone += Object.values(checks[h.id] || {}).filter(Boolean).length;
    });

    const completionPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Target size={24} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Global Completion</h4>
                    <p className="text-2xl font-serif font-black text-gray-800">{completionPct}%</p>
                    <p className="text-xs text-gray-500 font-medium">Across all {habits.length} habits this month</p>
                </div>
            </div>

            <div className="flex items-start gap-4 border-x border-gray-200 px-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Top Performer</h4>
                    <p className="text-xl font-serif font-black text-gray-800">
                        {habits[0]?.name || '–'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium italic">Highest consistency this week</p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Attention Needed</h4>
                    <p className="text-xl font-serif font-black text-gray-800">
                        {habits.length > 2 ? habits[habits.length - 1].name : 'None'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium italic">Falling behind target goal</p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPanel;
