import HabitCheckbox from './HabitCheckbox';
import StreakBadge from '../ui/StreakBadge';
import { X } from 'lucide-react';
import { useState } from 'react';

function HabitRow({ habit, days, checks, streak, onToggle, onDelete, onUpdate }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(habit.name);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempName !== habit.name) {
            onUpdate(habit.id, { name: tempName });
        }
    };

    const actual = Object.values(checks || {}).filter(Boolean).length;
    const progressPct = Math.round((actual / habit.goal) * 100);

    return (
        <tr
            className="group transition-colors hover:bg-background-subtle border-b border-gray-100"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Sticky Habit Name Column */}
            <td className="sticky left-0 z-10 bg-white min-w-[160px] md:min-w-[200px] p-0 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                <div className="flex items-center px-3 py-3 h-full gap-2 group/name max-w-[160px] md:max-w-[200px]">
                    <span className="text-base md:text-lg cursor-pointer hover:scale-125 transition-transform shrink-0" title="Click to change emoji">
                        {habit.emoji}
                    </span>

                    {isEditing ? (
                        <input
                            autoFocus
                            className="flex-1 bg-white border border-primary rounded px-1 py-0.5 text-[11px] md:text-sm outline-none w-0"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                        />
                    ) : (
                        <span
                            className="flex-1 text-[11px] md:text-sm font-bold text-gray-700 cursor-text hover:text-primary transition-colors leading-tight line-clamp-2 whitespace-normal"
                            onClick={() => setIsEditing(true)}
                        >
                            {habit.name}
                        </span>
                    )}

                    <button
                        onClick={() => onDelete(habit.id)}
                        className={`text-red-400 hover:text-red-600 transition-opacity p-1 rounded-full hover:bg-red-50 shrink-0 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <X size={14} />
                    </button>
                </div>
            </td>

            {/* Grid of Checkboxes */}
            {days.map((day) => {
                const isNewWeek = (day - 1) % 7 === 0 && day !== 1;
                return (
                    <td
                        key={day}
                        className={`p-[3px] text-center min-w-[22px] ${isNewWeek ? 'border-l-2 border-gray-200' : 'border-l border-gray-100'}`}
                    >
                        <HabitCheckbox
                            done={checks?.[day] || false}
                            onClick={() => onToggle(habit.id, day)}
                        />
                    </td>
                );
            })}

            {/* Analysis Panel */}
            <td className="border-l-2 border-gray-200 min-w-[110px] px-3 py-2 text-center bg-white/50">
                <div className="flex flex-col items-center">
                    <div className="text-[10px] font-bold text-gray-500 mb-1">
                        {habit.goal} → <span className="text-primary">{actual}</span>
                    </div>
                    {streak && <div className="mb-1"><StreakBadge count={streak.current} size="sm" /></div>}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                    </div>
                    <span className="text-[9px] font-black text-primary uppercase">{progressPct}%</span>
                </div>
            </td>
        </tr>
    );
}

export default HabitRow;
