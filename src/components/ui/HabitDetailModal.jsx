import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { habitMoodCorrelations } from '../../lib/correlations';
import { loadNotesForHabit, saveNote } from '../../lib/habitNotes';
import { tiersForHabit, setCustomTiersForHabit, getCustomTiers } from '../../lib/milestones';

const labelStyle = { color: 'var(--text-muted)' };
const insetStyle = { background: 'var(--card-inset-bg)' };
const fieldStyle = {
    background: 'var(--card-inset-bg)',
    border: '1px solid var(--card-solid-border)',
    color: 'var(--text-body)',
};

/**
 * Per-habit deep dive: streaks, custom milestone tiers, month heatmap,
 * measured mood effect, and a per-day note ("why did it go well or not").
 * All colors come from theme tokens so the modal adapts to dark mode.
 */
function HabitDetailModal({ isOpen, onClose, habit, checks, mentalState, daysInMonth, streak, spreadsheetId, monthLabel }) {
    const [notes, setNotes] = useState([]);
    const [noteInput, setNoteInput] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [tierInput, setTierInput] = useState('');
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

    // Custom milestone tiers — device-local override of the 7/30/100 defaults
    useEffect(() => {
        if (isOpen && habit) setTierInput((getCustomTiers()[habit.id] || []).join(', '));
    }, [isOpen, habit]);

    // Live preview: tiers reflect the input as you type, before saving
    const activeTiers = useMemo(() => {
        if (!habit) return [];
        const typed = tierInput.split(/[\s,]+/)
            .map(d => parseInt(d, 10))
            .filter(d => Number.isFinite(d) && d >= 2 && d <= 1000);
        return tiersForHabit(habit.id, typed.length ? { [habit.id]: typed } : {});
    }, [habit, tierInput]);

    const handleSaveTiers = useCallback(() => {
        if (!habit) return;
        const clean = setCustomTiersForHabit(habit.id, tierInput.split(/[\s,]+/).filter(Boolean));
        setTierInput(clean.join(', '));
        toast.success(clean.length ? 'Custom milestones saved' : 'Milestones reset to 7 / 30 / 100');
    }, [habit, tierInput]);

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
                    <div className="rounded-2xl p-3" style={insetStyle}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={labelStyle}>Current</p>
                        <p className="font-serif font-black text-lg" style={{ color: 'var(--accent-strong)' }}>{streak?.current ?? 0}d</p>
                    </div>
                    <div className="rounded-2xl p-3" style={insetStyle}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={labelStyle}>Best</p>
                        <p className="font-serif font-black text-lg" style={{ color: 'var(--warning-ink)' }}>{streak?.best ?? 0}d</p>
                    </div>
                    <div className="rounded-2xl p-3" style={insetStyle}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={labelStyle}>This Month</p>
                        <p className="font-serif font-black text-lg" style={{ color: 'var(--text-heading)' }}>{doneDays}/{habit.goal || daysInMonth}</p>
                    </div>
                </div>

                {/* Custom milestone tiers */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={labelStyle}>Milestone Tiers</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {activeTiers.map(t => {
                            const reached = (streak?.best ?? 0) >= t.days;
                            return (
                                <span
                                    key={t.days}
                                    title={reached ? 'Reached!' : `Reach a ${t.days}-day best streak`}
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                    style={{
                                        background: 'var(--card-inset-bg)',
                                        color: 'var(--warning-ink)',
                                        border: '1px solid var(--card-solid-border)',
                                        opacity: reached ? 1 : 0.55,
                                    }}
                                >
                                    {t.emoji} {t.days}d{reached ? ' ✓' : ''}
                                </span>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={tierInput}
                            onChange={(e) => setTierInput(e.target.value)}
                            placeholder="e.g. 5, 21, 66 — empty = defaults"
                            aria-label="Custom milestone tier days"
                            className="flex-1 rounded-2xl px-3 py-2 text-sm outline-none"
                            style={fieldStyle}
                        />
                        <button
                            onClick={handleSaveTiers}
                            className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-[10px] mt-1.5 leading-relaxed" style={labelStyle}>
                        Celebrations fire when your best streak reaches each tier. Save an empty list to restore 7 / 30 / 100.
                    </p>
                </div>

                {/* Month mini-heatmap */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={labelStyle}>{monthLabel}</p>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const done = !!checks[habit.id]?.[d];
                            return (
                                <div
                                    key={d}
                                    title={`Day ${d}${done ? ' — completed' : ''}`}
                                    className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold"
                                    style={{
                                        background: done ? 'rgba(var(--heat-rgb),0.9)' : 'var(--ring-track)',
                                        color: done ? 'var(--card-solid-bg)' : 'var(--text-muted)',
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
                    <p
                        className="text-xs rounded-2xl p-3 leading-relaxed"
                        style={{ background: 'var(--positive-bg)', border: '1px solid var(--divider)', color: 'var(--text-body)' }}
                    >
                        Your mental state averages <strong>{moodEffect.doneAvg}</strong> on days you complete this habit vs{' '}
                        <strong>{moodEffect.missAvg}</strong> when you skip it ({moodEffect.delta >= 0 ? '+' : ''}{moodEffect.delta}).
                    </p>
                )}

                {/* Today's note */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={labelStyle}>Note for Today</p>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Why did it go well (or not)?"
                        rows={2}
                        className="w-full rounded-2xl p-3 text-sm resize-none outline-none"
                        style={fieldStyle}
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
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={labelStyle}>Recent Notes</p>
                        <div className="space-y-2">
                            {notes.map((n) => (
                                <div key={`${n.date}-${n.row}`} className="text-xs rounded-xl p-2.5" style={{ ...insetStyle, color: 'var(--text-body)' }}>
                                    <span className="font-bold mr-2" style={labelStyle}>{n.date}</span>
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