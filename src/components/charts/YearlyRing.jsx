import React from 'react';

const YearlyRing = ({ months = [] }) => {
    // A SVG ring visualization of the year's progress
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6 self-start">Yearly Completion Ring</h4>
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none" stroke="#f3f4f6" strokeWidth="8"
                    />
                    {months.map((m, idx) => {
                        const totalMonths = months.length;
                        const strokeLength = (m.pct / 100) * (2 * Math.PI * 45) / totalMonths;
                        const fullLength = (2 * Math.PI * 45) / totalMonths;
                        const offset = - (idx * fullLength);

                        return (
                            <circle
                                key={idx}
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={m.pct > 75 ? '#10b981' : m.pct > 50 ? '#3b82f6' : '#f59e0b'}
                                strokeWidth="8"
                                strokeDasharray={`${strokeLength} ${2 * Math.PI * 45}`}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-serif font-black text-gray-800">2025</span>
                    <span className="text-[8px] font-black text-gray-400 uppercase">Yearly Avg</span>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2 w-full">
                {months.slice(0, 4).map(m => (
                    <div key={m.name} className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-gray-400">{m.name.slice(0, 1)}</span>
                        <div className="w-1.5 h-8 bg-gray-100 rounded-full relative overflow-hidden">
                            <div className="absolute bottom-0 w-full bg-primary rounded-full" style={{ height: `${m.pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default YearlyRing;
