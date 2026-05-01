import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { subDays, parseISO } from 'date-fns';
const moodMap = {
    'happy': 6, 'energetic': 5, 'calm': 4,
    'anxious': 3, 'sad': 2, 'irritable': 1, 'none': null
};

const CycleCharts = ({ history = [], avgCycleLength, avgPeriodLength }) => {
    const [viewMode, setViewMode] = useState('quarterly');

    // Filter history based on selected view mode
    const filteredHistory = useMemo(() => {
        const daysToFilter = viewMode === 'quarterly' ? 90 : 365;
        const cutoffDate = subDays(new Date(), daysToFilter);
        return history.filter(h => parseISO(h.date) >= cutoffDate);
    }, [history, viewMode]);



    const moodData = useMemo(() => {
        return filteredHistory
            .filter(entry => entry.mood && moodMap[entry.mood.toLowerCase()])
            .map((entry) => ({
                date: entry.date,
                day: entry.cycleDay,
                moodScore: moodMap[entry.mood.toLowerCase()]
            }));
    }, [filteredHistory]);

    // 2. Energy vs Cycle Day
    const energyData = useMemo(() => {
        return filteredHistory
            .filter(entry => entry.energy != null)
            .map((entry) => ({
                date: entry.date,
                day: entry.cycleDay,
                energyScore: entry.energy
            }));
    }, [filteredHistory]);

    // 3. Symptom Frequency
    const symptomData = useMemo(() => {
        const symptomCounts = {};
        filteredHistory.forEach(entry => {
            if (Array.isArray(entry.symptoms)) {
                entry.symptoms.forEach(s => {
                    symptomCounts[s] = (symptomCounts[s] || 0) + 1;
                });
            }
        });

        return Object.entries(symptomCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6); // Top 6 symptoms
    }, [filteredHistory]);

    // Insights Engine
    const insights = useMemo(() => {
        const generated = [];
        // FIX: Use filteredHistory length for threshold — consistent with chart data
        if (filteredHistory.length < 5) {
            generated.push("Log more cycle data to unlock personalized insights.");
            return generated;
        }

        generated.push(`Your average cycle length is ${avgCycleLength} days.`);

        if (symptomData.length > 0) {
            generated.push(`"${symptomData[0].name}" is your most frequently logged symptom.`);
        }

        if (energyData.length > 0) {
            const energyByDay = {};
            energyData.forEach(d => {
                if (!energyByDay[d.day]) energyByDay[d.day] = { sum: 0, count: 0 };
                energyByDay[d.day].sum += d.energyScore;
                energyByDay[d.day].count += 1;
            });

            let lowestDay = null;
            let lowestAvg = Infinity;
            Object.entries(energyByDay).forEach(([day, data]) => {
                const avg = data.sum / data.count;
                if (avg < lowestAvg && data.count >= 2) {
                    lowestAvg = avg;
                    lowestDay = day;
                }
            });
            if (lowestDay) {
                generated.push(`You tend to feel lowest energy around Cycle Day ${lowestDay}.`);
            }
        }

        return generated;
    }, [filteredHistory, avgCycleLength, symptomData, energyData]);

    return (
        <div className="space-y-6 mt-12 mb-8 animate-fade-up stagger-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-black text-gray-800">Insights & Patterns</h3>
                <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <button
                        onClick={() => setViewMode('quarterly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'quarterly' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Quarterly
                    </button>
                    <button
                        onClick={() => setViewMode('annual')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'annual' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Annual
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Avg Cycle Length</span>
                    <span className="text-3xl font-serif font-black text-rose-500">{avgCycleLength} <span className="text-lg text-gray-400">days</span></span>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Avg Period Length</span>
                    <span className="text-3xl font-serif font-black text-rose-500">{avgPeriodLength} <span className="text-lg text-gray-400">days</span></span>
                </div>
            </div>

            {/* FIX: 3-column grid so all 3 charts get equal space at large breakpoints */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Recent Mood Trend</h4>
                    <div className="h-48">
                        {moodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={moodData}>
                                    <XAxis dataKey="day" hide />
                                    <YAxis domain={[1, 6]} hide />
                                    <Tooltip
                                        formatter={(v) => [Object.keys(moodMap).find(k => moodMap[k] === v), 'Mood']}
                                        labelFormatter={(label) => `Day ${label}`}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: '800', textTransform: 'capitalize' }}
                                    />
                                    <Line type="monotone" dataKey="moodScore" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm font-bold text-gray-300">Not enough mood data yet</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Recent Energy Trend</h4>
                    <div className="h-48">
                        {energyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={energyData}>
                                    <XAxis dataKey="day" hide />
                                    <YAxis domain={[1, 10]} hide />
                                    <Tooltip
                                        formatter={(v) => [v, 'Energy (1-10)']}
                                        labelFormatter={(label) => `Day ${label}`}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                    />
                                    <Line type="monotone" dataKey="energyScore" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm font-bold text-gray-300">Not enough energy data yet</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Top Symptoms</h4>
                    <div className="h-48">
                        {symptomData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={symptomData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                    />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {symptomData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill="#F43F5E" opacity={0.6 + (index * 0.1)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm font-bold text-gray-300">No symptoms logged yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Smart Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {insights.map((insight, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
                        <span className="text-rose-400 text-lg mt-0.5">💡</span>
                        <p className="text-sm font-bold text-gray-700 leading-snug">{insight}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CycleCharts;
