import React from 'react'
import { Flame } from 'lucide-react'

const StreakBadge = ({ count, size = 'md' }) => {
    if (count <= 0) return null

    const sizes = {
        sm: 'px-2 py-0.5 text-[8px] gap-1',
        md: 'px-3 py-1.5 text-[10px] gap-1.5',
        lg: 'px-4 py-2 text-xs gap-2'
    }

    return (
        <div className={`
            inline-flex items-center font-black uppercase tracking-widest leading-none
            bg-orange-50 text-orange-600 rounded-full border border-orange-100
            shadow-sm transition-all hover:scale-110 cursor-default group
            ${sizes[size]}
        `}>
            <Flame size={size === 'sm' ? 10 : 14} className="fill-orange-500 animate-bounce group-hover:animate-pulse" />
            <span>{count} Day Streak</span>
        </div>
    )
}

export default StreakBadge
