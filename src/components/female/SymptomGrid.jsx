import React from 'react'
import { SYMPTOM_LIST } from '../../lib/constants'

const SymptomGrid = ({ selected = [], onToggle }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {SYMPTOM_LIST.map(s => (
                <button
                    key={s.id}
                    onClick={() => onToggle(s.id)}
                    className={`
                        flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-2
                        ${selected.includes(s.id)
                            ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm scale-[1.02]'
                            : 'bg-white border-gray-100/80 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}
                    `}
                >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{s.label}</span>
                </button>
            ))}
        </div>
    )
}

export default SymptomGrid
