import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StreakBarChart = ({ habits = [], streaks = {} }) => {
    const data = habits.map(h => ({
        name: h.name,
        streak: streaks[h.name]?.current || 0,
        best: streaks[h.name]?.best || 0,
        emoji: h.emoji
    })).sort((a, b) => b.streak - a.streak);

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[350px]">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Current Streaks By Habit</h4>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 10, fontWeight: 700 }}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="streak" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.streak > 10 ? '#f97316' : '#10b981'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StreakBarChart;
