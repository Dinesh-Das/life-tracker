import React from 'react'

const MOODS = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: 'bg-emerald-50 text-emerald-600' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: 'bg-sky-50 text-sky-600' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: 'bg-blue-50 text-blue-600' },
    { id: 'angry', label: 'Angry', emoji: '😠', color: 'bg-rose-50 text-rose-600' },
    { id: 'anxious', label: 'Anxious', emoji: '😰', color: 'bg-amber-50 text-amber-600' },
]

const MoodPicker = ({ selected, onSelect }) => {
    return (
        <div className="flex justify-between gap-2">
            {MOODS.map(mood => (
                <button
                    key={mood.id}
                    onClick={() => onSelect(mood.id)}
                    className={`
                        flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                        ${selected === mood.id ? `${mood.color} scale-110 shadow-md` : 'hover:bg-gray-50 text-gray-400'}
                    `}
                >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">{mood.label}</span>
                </button>
            ))}
        </div>
    )
}

export default MoodPicker
