import { X, Check } from 'lucide-react';
import { useState } from 'react';

function TaskItem({ task, onToggle, onDelete, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempText, setTempText] = useState(task.text);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempText !== task.text) {
            onUpdate(task.id, { text: tempText });
        }
    };

    return (
        <div className="group flex items-center gap-3 p-3 bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <button
                onClick={() => onToggle(task.id)}
                className={`
          w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
          ${task.done
                        ? 'bg-primary border-primary animate-checkPop text-white'
                        : 'bg-white border-gray-200 hover:border-primary'}
        `}
            >
                {task.done && <Check size={14} strokeWidth={4} />}
            </button>

            {isEditing ? (
                <input
                    autoFocus
                    className="flex-1 bg-white border border-primary rounded px-2 py-0.5 text-sm outline-none font-medium"
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                />
            ) : (
                <span
                    onDoubleClick={() => setIsEditing(true)}
                    className={`flex-1 text-sm font-medium transition-all ${task.done ? 'line-through text-gray-300' : 'text-gray-700'}`}
                >
                    {task.text}
                </span>
            )}

            <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default TaskItem;
