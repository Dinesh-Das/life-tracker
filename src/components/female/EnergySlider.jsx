import React from 'react';

const EnergySlider = ({ value = 5, onChange }) => {
    const getColor = (val) => {
        if (val <= 3) return 'bg-blue-400';
        if (val <= 7) return 'bg-emerald-400';
        return 'bg-amber-400';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Energy Level</h4>
                <span className={`text-sm font-black px-3 py-1 rounded-full text-white ${getColor(value)}`}>
                    {value}/10
                </span>
            </div>
            <input
                type="range"
                min="1"
                max="10"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                <span>Drained</span>
                <span>Steady</span>
                <span>Powerful</span>
            </div>
        </div>
    );
};

export default EnergySlider;
