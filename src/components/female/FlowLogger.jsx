import React from 'react'

const FlowLogger = ({ selected, onSelect }) => {
    const flows = [
        { id: 'none', label: 'None', color: 'bg-gray-100', text: 'text-gray-400' },
        { id: 'light', label: 'Light', color: 'bg-rose-100', text: 'text-rose-500' },
        { id: 'medium', label: 'Medium', color: 'bg-rose-500', text: 'text-white' },
        { id: 'heavy', label: 'Heavy', color: 'bg-rose-800', text: 'text-white' },
    ]

    return (
        <div className="flex gap-4">
            {flows.map(flow => (
                <button
                    key={flow.id}
                    onClick={() => onSelect(flow.id)}
                    className={`
                        flex-1 flex flex-col items-center gap-2 p-4 rounded-3xl transition-all
                        ${selected === flow.id ? `${flow.color} ${flow.text} scale-105 shadow-md` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
                    `}
                >
                    <div className={`w-3 h-3 rounded-full ${selected === flow.id ? 'bg-current' : 'bg-gray-200'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{flow.label}</span>
                </button>
            ))}
        </div>
    )
}

export default FlowLogger
