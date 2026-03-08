function CycleWheel({ day = 14, cycleLength = 28, phase = 'Ovulatory', ovulationInfo }) {
    const radius = 90;
    const strokeWidth = 15;
    const center = 110;
    const circumference = 2 * Math.PI * radius;
    const progress = (day / cycleLength) * circumference;

    // Colors (must match cycleUtils.getPhaseColor and legend below)
    const colors = {
        Menstrual: '#F43F5E', // Rose
        Follicular: '#8B5CF6', // Violet
        Ovulatory: '#10B981', // Emerald
        Luteal: '#F59E0B', // Amber
    };

    // Helper: compute strokeDasharray props to paint an arc segment
    // The outer SVG is rotated -90deg so Day 1 starts at the top (12 o'clock).
    // All segment arcs inherit this rotation automatically — they don't need adjustment.
    const getStrokeProps = (startDay, endDay) => {
        const span = endDay - startDay + 1;
        const arcLength = (span / cycleLength) * circumference;
        const offsetRotation = ((startDay - 1) / cycleLength) * 360;
        return {
            strokeDasharray: `${arcLength} ${circumference}`,
            strokeDashoffset: 0,
            transform: `rotate(${offsetRotation} ${center} ${center})`,
        };
    };

    // Fertile window
    const fwStart = ovulationInfo ? Math.max(1, ovulationInfo.ovulationDay - 5) : 10;
    const fwEnd = ovulationInfo ? Math.min(cycleLength, ovulationInfo.ovulationDay + 1) : 16;
    const fertProps = ovulationInfo ? getStrokeProps(fwStart, fwEnd) : { strokeDasharray: '0 1000' };

    // FIX: Markers live inside the -rotate-90 SVG context, so we need to ADD 90°
    // to cancel the SVG-level rotation (which shifts everything +90°).
    // Net result: angle 0 = 12 o'clock, matching the arc ring.
    const markerAngle = (day) => ((day - 1) / cycleLength) * 360 - 90;
    const ovulationAngle = ovulationInfo ? markerAngle(ovulationInfo.ovulationDay) : 0;
    const currentDayAngle = markerAngle(day);

    return (
        <div className="relative flex flex-col items-center w-full max-w-sm mx-auto p-4">
            <div className="relative flex items-center justify-center p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm w-full aspect-square">
                {/* SVG rotated -90° so arcs start at 12 o'clock */}
                <svg
                    width="100%" height="100%"
                    viewBox={`0 0 ${center * 2} ${center * 2}`}
                    className="transform -rotate-90 origin-center absolute inset-0 m-auto"
                    style={{ maxWidth: '220px', maxHeight: '220px' }}
                    role="img"
                    aria-label={`Cycle wheel: Day ${day} of ${cycleLength}, currently in ${phase} phase`}
                >
                    {/* Background Ring */}
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth}
                    />

                    {/* Fertile Window Arc */}
                    {ovulationInfo && (
                        <circle
                            cx={center} cy={center} r={radius}
                            fill="none" stroke="#60A5FA" strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            className="opacity-30 transition-all duration-1000 ease-in-out"
                            {...fertProps}
                        />
                    )}

                    {/* Phase Progress Arc */}
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none" stroke={colors[phase] || '#94A3B8'} strokeWidth={strokeWidth}
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-in-out"
                    />

                    {/* Ovulation Marker 🌸 — uses corrected angle */}
                    {ovulationInfo && (
                        <g transform={`rotate(${ovulationAngle} ${center} ${center})`}>
                            <text
                                x={center + radius - 6}
                                y={center + 4}
                                fontSize="14"
                                transform={`rotate(90 ${center + radius} ${center})`}
                                className="drop-shadow-sm pointer-events-none select-none"
                            >
                                🌸
                            </text>
                        </g>
                    )}

                    {/* Current Day Dot — uses corrected angle */}
                    <g transform={`rotate(${currentDayAngle} ${center} ${center})`}>
                        <circle cx={center + radius} cy={center} r="6" fill="#1F2937" className="drop-shadow-md" />
                        <circle cx={center + radius} cy={center} r="2" fill="#FFFFFF" />
                    </g>
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Cycle Day</span>
                    <span className="text-6xl font-serif font-black text-gray-800 leading-none mb-2">{day}</span>
                    <span
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white shadow-lg"
                        style={{ backgroundColor: colors[phase] || '#94A3B8' }}
                    >
                        {phase} Phase
                    </span>
                </div>
            </div>

            {/* Legend — colors now match the actual wheel colors */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-[9px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Menstrual</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Follicular</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ovulatory</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Luteal</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-300" /> Fertile</div>
            </div>
        </div>
    );
}

export default CycleWheel;
