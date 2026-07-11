import HabitCheckbox from './HabitCheckbox';
import StreakBadge from '../ui/StreakBadge';
import { X } from 'lucide-react';
import { memo, useState } from 'react';

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

    const actual = Object.values(checks || {}).filter(status => status === true).length;
    const progressPct = Math.round((actual / habit.goal) * 100);

    return (
        <tr
            className="theme-row group transition-colors border-b"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '48px' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Sticky Habit Name Column */}
            <td className="theme-table sticky left-0 z-10 min-w-[160px] md:min-w-[200px] p-0 border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
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
                            className="theme-heading flex-1 text-[11px] md:text-sm font-bold cursor-text hover:text-primary transition-colors leading-tight line-clamp-2 whitespace-normal"
                            onClick={() => setIsEditing(true)}
                        >
                            {habit.name}
                        </span>
                    )}

                    <button
                        onClick={() => onDelete(habit.id)}
                        aria-label={`Archive ${habit.name}`}
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
                            done={checks?.[day] === true}
                            onClick={() => onToggle(habit.id, day)}
                        />
                    </td>
                );
            })}

            {/* Analysis Panel */}
            <td className="theme-panel-subtle border-l-2 min-w-[110px] px-3 py-2 text-center">
                <div className="flex flex-col items-center">
                    <div className="theme-muted text-[10px] font-bold mb-1">
                        {habit.goal} → <span className="text-primary">{actual}</span>
                    </div>
                    {streak && <div className="mb-1"><StreakBadge count={streak.current} size="sm" /></div>}
                    <div className="theme-progress-track w-full h-1.5 rounded-full overflow-hidden mb-1">
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

export default memo(HabitRow);
