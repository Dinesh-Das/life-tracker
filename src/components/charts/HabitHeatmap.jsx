import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

function HabitHeatmap({ data, year }) {
    // data = Array of { date: 'YYYY-MM-DD', count: N, intensity: 0-5 }

    const { paddedDays, weeks } = useMemo(() => {
        if (!data || data.length === 0) return { paddedDays: [], weeks: 0 };

        // Find what day of the week Jan 1st is (0 = Sunday, 1 = Monday ...)
        // Let's use 0 = Sunday
        const jan1 = new Date(year, 0, 1);
        const startDayOfWeek = jan1.getDay();

        // Pad the beginning so the first column aligns with the correct day of the week
        const pads = Array.from({ length: startDayOfWeek }).map((_, i) => ({
            isPad: true,
            id: `pad-start-${i}`
        }));

        const combined = [...pads, ...data];

        // Pad the end to complete the last week
        const remainder = combined.length % 7;
        if (remainder !== 0) {
            const endPads = Array.from({ length: 7 - remainder }).map((_, i) => ({
                isPad: true,
                id: `pad-end-${i}`
            }));
            combined.push(...endPads);
        }

        return {
            paddedDays: combined,
            weeks: combined.length / 7
        };
    }, [data, year]);

    const getIntensityColor = (intensity) => {
        switch (intensity) {
            case 0: return 'bg-gray-100';
            case 1: return 'bg-emerald-100';
            case 2: return 'bg-emerald-300';
            case 3: return 'bg-emerald-500';
            case 4: return 'bg-emerald-700';
            case 5: return 'bg-emerald-900';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif font-black text-gray-800">Habit Heatmap ({year})</h3>
                <div className="flex items-center gap-1 text-[8px] font-black uppercase text-gray-400 hidden sm:flex">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded-sm bg-gray-100 mx-0.5" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-100 mx-0.5" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-300 mx-0.5" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-500 mx-0.5" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-700 mx-0.5" />
                    <span>More</span>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="flex gap-1 min-w-max">
                    {/* Y-Axis Labels (Mon, Wed, Fri) */}
                    <div className="flex flex-col gap-1 pr-2 text-[9px] font-bold text-gray-400 mt-[14px]">
                        <div className="h-3 leading-3"></div>
                        <div className="h-3 leading-3">Mon</div>
                        <div className="h-3 leading-3"></div>
                        <div className="h-3 leading-3">Wed</div>
                        <div className="h-3 leading-3"></div>
                        <div className="h-3 leading-3">Fri</div>
                        <div className="h-3 leading-3"></div>
                    </div>

                    {/* Grid */}
                    {Array.from({ length: weeks }).map((_, wIdx) => (
                        <div key={`week-${wIdx}`} className="flex flex-col gap-1 relative group">
                            {/* Simple month label for the first week of a month */}
                            {wIdx % 4 === 0 && wIdx < 50 && (
                                <div className="absolute -top-5 text-[9px] font-bold text-gray-400 whitespace-nowrap">
                                    {paddedDays[wIdx * 7]?.date ? format(parseISO(paddedDays[wIdx * 7].date), 'MMM') : ''}
                                </div>
                            )}

                            {Array.from({ length: 7 }).map((_, dIdx) => {
                                const dayData = paddedDays[wIdx * 7 + dIdx];

                                if (dayData.isPad) {
                                    return <div key={`pad-${wIdx}-${dIdx}`} className="w-3 h-3 bg-transparent" />;
                                }

                                const tooltip = `${format(parseISO(dayData.date), 'MMM d, yyyy')}: ${dayData.count} habits`;

                                return (
                                    <div
                                        key={dayData.date}
                                        className={`w-3 h-3 rounded-sm ${getIntensityColor(dayData.intensity)} transition-all hover:ring-1 hover:ring-gray-900 cursor-pointer`}
                                        title={tooltip}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default HabitHeatmap;
