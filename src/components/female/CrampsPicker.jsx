import React from 'react'
import { CRAMPS_LEVELS } from '../../lib/constants'

const CrampsPicker = ({ selected, onSelect }) => {
    return (
        <div className="flex justify-between gap-2">
            {CRAMPS_LEVELS.map(level => {
                const isSelected = selected === level.id;

                // Color mapping for tailwind classes based on our constants
                const getColors = () => {
                    if (!isSelected) return 'text-gray-400 hover:bg-gray-50 border border-transparent hover:border-gray-100';
                    switch (level.color) {
                        case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-md scale-110';
                        case 'amber': return 'bg-amber-50 text-amber-600 border-amber-200 shadow-md scale-110';
                        case 'orange': return 'bg-orange-50 text-orange-600 border-orange-200 shadow-md scale-110';
                        case 'rose': return 'bg-rose-50 text-rose-600 border-rose-200 shadow-md scale-110';
                        default: return 'bg-gray-100 text-gray-800';
                    }
                };

                return (
                    <button
                        key={level.id}
                        onClick={() => onSelect(level.id)}
                        className={`
                            flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all
                            ${getColors()}
                        `}
                    >
                        <span className="text-2xl mb-1">{level.emoji}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{level.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default CrampsPicker
