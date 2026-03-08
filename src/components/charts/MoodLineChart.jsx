import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function MoodLineChart({ data }) {
    // data = [{ day: 1, val: 8 }, ...]

    return (
        <div className="h-[150px] w-full bg-white/50 p-4 rounded-xl">
            <h4 className="text-[10px] font-black text-amber-500 uppercase mb-4 tracking-widest">🧠 Mental State Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FEF3C7" />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#D97706' }}
                        interval={2}
                    />
                    <YAxis
                        domain={[0, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#D97706' }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#B45309' }}
                    />
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
