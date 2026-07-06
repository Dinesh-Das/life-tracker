import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

/** Life-balance radar built from Daily Wins + generated insights. */
const WinBalanceChart = ({ balance = [], insights = [], loading }) => (
    <div className="glass-card" style={{ minHeight: '350px', padding: '24px 28px' }}>
        <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Life Balance — Daily Wins
        </h4>
        {loading ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
            <>
                <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={balance} outerRadius="75%">
                        <PolarGrid stroke="rgba(45,79,65,0.25)" />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700 }} />
                        <Radar dataKey="count" stroke="#4a7a62" fill="#4a7a62" fillOpacity={0.45} />
                    </RadarChart>
                </ResponsiveContainer>
                <ul style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', padding: 0 }}>
                    {insights.map((text, i) => (
                        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                            {text}
                        </li>
                    ))}
                </ul>
            </>
        )}
    </div>
);

export default WinBalanceChart;