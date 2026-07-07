import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { tickStyle, gridStroke, tooltipStyle, tooltipLabelStyle } from '../../lib/chartTheme';

function MoodLineChart({ data }) {
    // data = [{ day: 1, val: 8 }, ...]

    return (
        <div className="h-[150px] w-full glass-card-inner p-4">
            <h4 className="text-[10px] font-black text-amber-500 uppercase mb-4 tracking-widest">🧠 Mental State Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                        interval={2}
                    />
                    <YAxis
                        domain={[0, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={tickStyle}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Line
                        type="monotone"
                        dataKey="val"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#F59E0B' }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default MoodLineChart;
