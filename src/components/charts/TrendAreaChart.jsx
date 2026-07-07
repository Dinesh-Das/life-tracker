import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { tickStyle, gridStroke, tooltipStyle, tooltipLabelStyle } from '../../lib/chartTheme';

function TrendAreaChart({ data }) {
    // data = [{ day: 1, pct: 20 }, ...]

    return (
        <div className="h-[150px] w-full glass-card-inner p-4">
            <h4 className="text-[10px] font-black uppercase mb-4 tracking-widest" style={{ color: 'var(--text-muted)' }}>Completion Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                        interval={2}
                    />
                    <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                        tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Area
                        type="monotone"
                        dataKey="pct"
                        stroke="#2E7D32"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPct)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default TrendAreaChart;
