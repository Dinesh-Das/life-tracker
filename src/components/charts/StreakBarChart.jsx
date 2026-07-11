import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { tickStyle, tooltipStyle, tooltipItemStyle, cursorFill } from '../../lib/chartTheme';

const StreakBarChart = ({ habits = [], streaks = {} }) => {
const data = habits.map(h => {
        // Streaks are keyed by habit ID in the Streaks sheet; fall back to name
        const s = streaks[h.id] || streaks[h.name] || {};
        return {
            name: h.name,
            streak: s.current || 0,
            best: s.best || 0,
            emoji: h.emoji
        };
    }).sort((a, b) => b.streak - a.streak);

    return (
        <div className="glass-card" style={{ height: '350px', padding: '24px 28px' }}>
            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>Best Streaks By Habit</h4>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={tickStyle}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: cursorFill }}
                        contentStyle={tooltipStyle}
                        itemStyle={tooltipItemStyle}
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
