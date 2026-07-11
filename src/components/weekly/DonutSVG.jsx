function DonutSVG({ pct, size = 72 }) {
    const r = (size - 12) / 2;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (pct / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background ring */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth={6}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={pct === 100 ? '#10B981' : '#2E7D32'}
                    strokeWidth={6}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className={`text-lg font-black ${pct === 100 ? 'text-emerald-600' : 'theme-heading'} font-sans`}>
                    {pct}<span className="text-[10px] ml-0.5">%</span>
                </span>
            </div>
        </div>
    );
}

export default DonutSVG;
