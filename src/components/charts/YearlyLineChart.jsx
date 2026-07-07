import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { tickStyle, gridStroke, tooltipStyle, tooltipItemStyle } from '../../lib/chartTheme';

function YearlyLineChart({ data }) {
    // data = [{ month: 'Jan', pct: 82 }, ...]

    return (
        <div className="glass-card" style={{ padding: '24px 28px', height: '310px', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '20px' }}>Yearly Completion Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                    />
                    <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        itemStyle={tooltipItemStyle}
                    />
                    <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="#2E7D32"
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#2E7D32', strokeWidth: 2, stroke: 'var(--card-solid-bg)' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={2000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default YearlyLineChart;
