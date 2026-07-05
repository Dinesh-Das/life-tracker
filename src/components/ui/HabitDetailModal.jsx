import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { habitMoodCorrelations } from '../../lib/correlations';
import { loadNotesForHabit, saveNote } from '../../lib/habitNotes';

/**
 * Per-habit deep dive: streaks, month heatmap, measured mood effect,
 * and a per-day note ("why did it go well or not").
 */
function HabitDetailModal({ isOpen, onClose, habit, checks, mentalState, daysInMonth, streak, spreadsheetId, monthLabel }) {
    const [notes, setNotes] = useState([]);
    const [noteInput, setNoteInput] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    useEffect(() => {
        if (!isOpen || !habit || !spreadsheetId) return;
        let cancelled = false;
        loadNotesForHabit(spreadsheetId, habit.id)
            .then((list) => {
                if (cancelled) return;
                setNotes(list.slice(-5).reverse());
                const todayNote = list.find(n => n.date === todayStr);
                setNoteInput(todayNote?.note || '');
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen, habit, spreadsheetId, todayStr]);

    const doneDays = useMemo(() => {
        if (!habit) return 0;
        let c = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            if (checks[habit.id]?.[d]) c++;
        }
        return c;
    }, [habit, checks, daysInMonth]);

    const moodEffect = useMemo(() => {
        if (!habit) return null;
        return habitMoodCorrelations([habit], checks, mentalState, daysInMonth)[0] || null;
    }, [habit, checks, mentalState, daysInMonth]);

    const handleSaveNote = useCallback(async () => {
        if (!habit) return;
        setSavingNote(true);
        try {
            await saveNote(spreadsheetId, habit.id, todayStr, noteInput.trim());
            toast.success('Note saved');
        } catch {
            toast.error('Failed to save note');
        } finally {
            setSavingNote(false);
        }
    }, [habit, spreadsheetId, todayStr, noteInput]);

    if (!habit) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${habit.emoji} ${habit.name}`}>
            <div className="space-y-5">
                {/* Streak & goal stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Current</p>
                        <p className="font-serif font-black text-lg text-emerald-700">{streak?.current ?? 0}d</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Best</p>
                        <p className="font-serif font-black text-lg text-amber-600">{streak?.best ?? 0}d</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">This Month</p>
                        <p className="font-serif font-black text-lg text-gray-800">{doneDays}/{habit.goal || daysInMonth}</p>
                    </div>
                </div>

                {/* Month mini-heatmap */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{monthLabel}</p>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const done = !!checks[habit.id]?.[d];
                            return (
                                <div
                                    key={d}
                                    title={`Day ${d}${done ? ' — completed' : ''}`}
                                    className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold"
                                    style={{
                                        background: done ? 'rgba(45,122,82,0.85)' : 'rgba(0,0,0,0.06)',
                                        color: done ? '#d9f0e4' : '#9aa5a0',
                                    }}
                                >
                                    {d}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Measured mood effect */}
                {moodEffect && (
                    <p className="text-xs text-gray-600 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 leading-relaxed">
                        Your mental state averages <strong>{moodEffect.doneAvg}</strong> on days you complete this habit vs{' '}
                        <strong>{moodEffect.missAvg}</strong> when you skip it ({moodEffect.delta >= 0 ? '+' : ''}{moodEffect.delta}).
                    </p>
                )}

                {/* Today's note */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Note for Today</p>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Why did it go well (or not)?"
                        rows={2}
                        className="w-full border border-gray-200 rounded-2xl p-3 text-sm resize-none outline-none focus:border-emerald-300"
                    />
                    <button
                        onClick={handleSaveNote}
                        disabled={savingNote}
                        className="mt-2 w-full py-2.5 rounded-2xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                        {savingNote ? 'Saving…' : 'Save Note'}
                    </button>
                </div>

                {/* Recent notes */}
                {notes.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Recent Notes</p>
                        <div className="space-y-2">
                            {notes.map((n) => (
                                <div key={`${n.date}-${n.row}`} className="text-xs text-gray-600 bg-gray-50 rounded-xl p-2.5">
                                    <span className="font-bold text-gray-400 mr-2">{n.date}</span>
                                    {n.note}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default HabitDetailModal;