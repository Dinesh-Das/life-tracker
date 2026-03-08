import DonutSVG from './DonutSVG';
import TaskItem from './TaskItem';
import { Plus } from 'lucide-react';
import { useState } from 'react';

function DayColumn({ dayName, date, tasks, onToggle, onDelete, onUpdate, onAddTask }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');

    const completed = tasks.filter(t => t.done).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onAddTask(newTaskText);
            setNewTaskText('');
            // Keep adding mode for continuous entry
        }
    };

    return (
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-[200px] flex-1">
            {/* Header */}
            <div className={`
        p-4 text-center text-white transition-colors duration-500
        ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}
      `}>
                <h3 className="text-lg font-serif font-black flex items-center justify-center gap-2">
                    {dayName} {pct === 100 && '💀'}
                </h3>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{date}</p>
            </div>

            {/* Progress Donut */}
            <div className="py-6 flex justify-center bg-gray-50/50">
                <DonutSVG pct={pct} />
            </div>

            {/* Tasks Subheader */}
            <div className="bg-primary-dark text-white text-[10px] font-black uppercase tracking-tighter py-1 px-4 text-center">
                Tasks
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto max-h-[350px] scrollbar-thin scrollbar-thumb-gray-200">
                {tasks.map(task => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                    />
                ))}

                {isAdding ? (
                    <form onSubmit={handleSubmit} className="p-3">
                        <input
                            autoFocus
                            className="w-full bg-gray-50 border border-primary rounded p-2 text-sm outline-none font-medium placeholder:text-gray-300"
                            placeholder="Type task & press Enter…"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onBlur={() => !newTaskText && setIsAdding(false)}
                            onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="border border-dashed border-gray-300 rounded-full p-1 group-hover:border-primary">
                            <Plus size={14} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Add task</span>
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-gray-100 divide-y divide-gray-50">
                <div className="px-4 py-2 flex justify-between items-center text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">
                    <span>✓ Completed</span>
                    <span>{completed}</span>
                </div>
                <div className="px-4 py-2 flex justify-between items-center text-[10px] font-black uppercase bg-red-50 text-red-600">
                    <span>✗ Not Done</span>
                    <span>{total - completed}</span>
                </div>
            </div>
        </div>
    );
}

export default DayColumn;
