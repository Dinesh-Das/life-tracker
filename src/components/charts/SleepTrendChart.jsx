import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/** Sleep hours + quality over the last entries. */
const SleepTrendChart = ({ rows = [], insights = [] }) => {
    const data = rows.map(r => ({
        date: (r.date || '').slice(5), // MM-dd
        hours: r.hours,
        quality: r.quality,
    }));

    return (
        <div className="glass-card" style={{ minHeight: '350px', padding: '24px 28px' }}>
            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Sleep — Hours & Quality
            </h4>
            {data.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No sleep logged yet — add bedtime and wake time in Daily Check-in.
                </p>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="h" tick={{ fontSize: 10 }} domain={[0, 12]} />
                        <YAxis yAxisId="q" orientation="right" tick={{ fontSize: 10 }} domain={[0, 5]} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }} />
                        <Line yAxisId="h" type="monotone" dataKey="hours" name="Rest (h, incl. naps)" stroke="#4a7a62" strokeWidth={2} dot={false} connectNulls />
                        <Line yAxisId="q" type="monotone" dataKey="quality" name="Quality" stroke="#f0a860" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            )}
            {insights.length > 0 && (
                <ul style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', padding: 0 }}>
                    {insights.map((text, i) => (
                        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                            {text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SleepTrendChart;