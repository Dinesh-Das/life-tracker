import React from 'react'

const SavingIndicator = ({ saving }) => {
    return (
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${saving ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Saving to Cloud
            </span>
        </div>
    )
}

export default SavingIndicator
