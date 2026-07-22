import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

function HabitHeatmap({ data, year }) {
    // data = Array of { date: 'YYYY-MM-DD', count: N, intensity: 0-5 }

    const { paddedDays, weeks, monthLabels } = useMemo(() => {
        if (!data || data.length === 0) return { paddedDays: [], weeks: 0, monthLabels: new Map() };

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

        const labels = new Map();
        combined.forEach((day, index) => {
            if (day.date?.endsWith('-01')) {
                labels.set(Math.floor(index / 7), format(parseISO(day.date), 'MMM'));
            }
        });

        return {
            paddedDays: combined,
            weeks: combined.length / 7,
            monthLabels: labels,
        };
    }, [data, year]);

    // --heat-rgb flips from forest green (light) to mint (dark) so
    // low-intensity cells stay visible on the dark canvas.
    const getIntensityColor = (intensity) => {
        const alphas = [0.08, 0.22, 0.40, 0.60, 0.80, 0.96];
        return `rgba(var(--heat-rgb), ${alphas[intensity] ?? alphas[0]})`;
    };

    return (
        <div className="glass-card" style={{ padding: '28px 32px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>Habit Heatmap ({year})</h3>
                <div className="hidden sm:flex" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    <span>Less</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(var(--heat-rgb),0.1)', margin: '0 2px' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(var(--heat-rgb),0.25)', margin: '0 2px' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(var(--heat-rgb),0.45)', margin: '0 2px' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(var(--heat-rgb),0.70)', margin: '0 2px' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(var(--heat-rgb),0.90)', margin: '0 2px' }} />
                    <span>More</span>
                </div>
            </div>

            <div style={{ width: '100%', minWidth: 0, paddingBottom: 4 }}>
                <div className="heatmap-grid-wrap">
                    {/* Y-Axis Labels (Mon, Wed, Fri) */}
                    <div className="mobile-hide flex flex-col gap-1 pr-2 text-[9px] font-bold mt-[14px]" style={{ color: 'var(--text-muted)' }}>
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
                        <div key={`week-${wIdx}`} className="heatmap-week relative group">
                            {/* Label the actual week containing the first of each month. */}
                            {monthLabels.has(wIdx) && (
                                <div className="absolute -top-5 text-[9px] font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                    {monthLabels.get(wIdx)}
                                </div>
                            )}

                            {Array.from({ length: 7 }).map((_, dIdx) => {
                                const dayData = paddedDays[wIdx * 7 + dIdx];

                                if (dayData.isPad) {
                                    return <div key={`pad-${wIdx}-${dIdx}`} className="heatmap-cell bg-transparent" />;
                                }

                                const tooltip = `${format(parseISO(dayData.date), 'MMM d, yyyy')}: ${dayData.count} habits`;

                                return (
                                    <div
                                        key={dayData.date}
                                        style={{
                                            borderRadius: '3px',
                                            background: getIntensityColor(dayData.intensity),
                                            transition: 'all 0.15s',
                                            cursor: 'pointer',
                                        }}
                                        className="heatmap-cell" title={tooltip}
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
