import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function TrendAreaChart({ data }) {
    // data = [{ day: 1, pct: 20 }, ...]

    return (
        <div className="h-[150px] w-full bg-white/50 p-4 rounded-xl">
            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Completion Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 700 }}
                        interval={2}
                    />
                    <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 700 }}
                        tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#2E7D32' }}
                    />
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
