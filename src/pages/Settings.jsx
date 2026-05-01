import Header from '../components/layout/Header'
import { Plus, Trash2, Edit2, User, Shield, ExternalLink, Copy } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import Modal from '../components/ui/Modal'
import EmojiPicker from '../components/ui/EmojiPicker'
import { CATEGORIES } from '../lib/constants'
import toast from 'react-hot-toast'

function Settings() {
    const { spreadsheetId, user, userGender, updateUserGender } = useAuth();
    const { hideFemaleData, toggleHideFemaleData } = useAppContext();
    const { habits, loading, saving, saveHabits } = useSettings(spreadsheetId);

    const [localGender, setLocalGender] = useState(userGender || 'male');
    const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [currentHabit, setCurrentHabit] = useState({ name: '', emoji: '✨', goal: 30, category: 'Health' });

    useEffect(() => {
        if (userGender && userGender !== 'needs_selection') {
            setLocalGender(userGender);
        }
    }, [userGender]);

    const handleGenderChange = (newGender) => {
        setLocalGender(newGender);
        updateUserGender(newGender);
        toast.success(`Gender updated to ${newGender}`);
    };

    const handleDeleteHabit = (id) => {
        if (confirm('Are you sure you want to delete this habit?')) {
            saveHabits(habits.filter(h => h.id !== id));
        }
    };

    const openHabitModal = (habit = null) => {
        if (habit) {
            setCurrentHabit(habit);
        } else {
            setCurrentHabit({ name: '', emoji: '✨', goal: 30, category: 'Health', id: Date.now().toString() });
        }
        setIsHabitModalOpen(true);
    };

    const handleSaveHabit = (e) => {
        e.preventDefault();
        const exists = habits.find(h => h.id === currentHabit.id);
        if (exists) {
            saveHabits(habits.map(h => h.id === currentHabit.id ? currentHabit : h));
        } else {
            saveHabits([...habits, currentHabit]);
        }
        setIsHabitModalOpen(false);
    };

    const copySheetId = () => {
        if (spreadsheetId) {
            navigator.clipboard.writeText(spreadsheetId);
            toast.success('Sheet ID copied!');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Settings" />
                <div style={{ padding: '24px 40px' }}>
                    <LoadingSkeleton type="page" />
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Settings" saving={saving} />

            <div style={{ padding: '8px 40px 80px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Profile Section */}
                    <section className="glass-card animate-fade-up" style={{ padding: '24px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(100,140,220,0.4)', color: '#a0b8f0', flexShrink: 0 }}>
                                <User size={18} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>Profile</h3>
                        </div>

                        {/* User card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(45,79,65,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                {user?.getImageUrl?.() ? (
                                    <img src={user.getImageUrl()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: '#a9cfbc' }}>{user?.getName?.()?.charAt(0) || 'U'}</span>
                                )}
                            </div>
                            <div>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{user?.getName?.() || 'User'}</p>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{user?.getEmail?.()}</p>
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>Gender</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[['male', '♂ Male', 'rgba(80,120,220,0.5)', '#a0b8f0'], ['female', '♀ Female', 'rgba(180,60,100,0.5)', '#f0a0b8']].map(([val, label, bg, color]) => (
                                    <button
                                        key={val}
                                        onClick={() => handleGenderChange(val)}
                                        style={{
                                            flex: 1, padding: '12px',
                                            borderRadius: 'var(--radius-md)',
                                            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                            background: localGender === val ? bg : 'rgba(255,255,255,0.3)',
                                            color: localGender === val ? color : 'var(--text-muted)',
                                            boxShadow: localGender === val ? '0 2px 12px rgba(0,0,0,0.1)' : 'none',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Privacy */}
                        {localGender === 'female' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.25)' }}>
                                <div>
                                    <label style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: '3px' }}>Hide Female Data</label>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '340px' }}>Removes the Female Tracker from the sidebar and hides cycle stats on the Dashboard.</p>
                                </div>
                                <button
                                    onClick={() => toggleHideFemaleData(!hideFemaleData)}
                                    style={{
                                        width: '44px', height: '24px', borderRadius: '9999px',
                                        border: 'none', cursor: 'pointer', position: 'relative',
                                        transition: 'background 0.3s',
                                        background: hideFemaleData ? 'rgba(180,60,100,0.6)' : 'rgba(255,255,255,0.3)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: '3px',
                                        left: hideFemaleData ? '23px' : '3px',
                                        transition: 'left 0.3s',
                                    }} />
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Habit Management */}
                    <section className="glass-card animate-fade-up stagger-1" style={{ padding: '24px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(45,79,65,0.5)', color: '#a9cfbc', flexShrink: 0 }}>
                                    <Shield size={18} />
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>Habits ({habits.length}/15)</h3>
                            </div>
                            {habits.length < 15 && (
                                <button
                                    id="add-habit-btn"
                                    onClick={() => openHabitModal()}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'rgba(45,79,65,0.65)', color: '#a9cfbc',
                                        border: 'none', borderRadius: 'var(--radius-full)',
                                        padding: '8px 18px', cursor: 'pointer',
                                        fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                                        letterSpacing: '0.06em', textTransform: 'uppercase',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Plus size={14} />
                                    <span>Add Habit</span>
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {habits.map((habit, idx) => (
                                <div key={habit.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.3)',
                                    transition: 'background 0.2s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.45)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', width: '18px', textAlign: 'right' }}>{idx + 1}</span>
                                        <span style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', fontSize: '18px' }}>{habit.emoji}</span>
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>{habit.name}</h4>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{habit.category} • {habit.goal} days/mo</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => openHabitModal(habit)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,140,220,0.3)'; e.currentTarget.style.color = '#a0b8f0'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHabit(habit.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,60,60,0.3)'; e.currentTarget.style.color = '#f0a0a0'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Connected Sheet */}
                    {spreadsheetId && (
                        <section className="glass-card animate-fade-up stagger-2" style={{ padding: '24px 28px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '14px' }}>Connected Sheet</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.3)' }}>
                                <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spreadsheetId}</code>
                                <button onClick={copySheetId} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex' }} title="Copy ID"
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-heading)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <Copy size={14} />
                                </button>
                                <a
                                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'color 0.2s' }}
                                    title="Open in Google Sheets"
                                    onMouseEnter={e => e.currentTarget.style.color = '#a9cfbc'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </section>
                    )}

                </div>
            </div>

            {/* Habit Modal */}
            <Modal
                isOpen={isHabitModalOpen}
                onClose={() => setIsHabitModalOpen(false)}
                title={currentHabit.id ? 'Edit Habit' : 'New Habit'}
            >
                <form onSubmit={handleSaveHabit} className="space-y-5">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setIsEmojiPickerOpen(true)}
                            className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-2xl hover:bg-gray-100 transition-all shrink-0"
                        >
                            {currentHabit.emoji}
                        </button>
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Habit Name</label>
                            <input
                                type="text"
                                required
                                value={currentHabit.name}
                                onChange={e => setCurrentHabit({ ...currentHabit, name: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="e.g. Morning Run"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Category</label>
                            <select
                                value={currentHabit.category}
                                onChange={e => setCurrentHabit({ ...currentHabit, category: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Monthly Goal</label>
                            <input
                                type="number"
                                value={currentHabit.goal}
                                onChange={e => setCurrentHabit({ ...currentHabit, goal: parseInt(e.target.value) })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Save Habit
                    </button>
                </form>
            </Modal>

            <EmojiPicker
                isOpen={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                onSelect={(emoji) => setCurrentHabit({ ...currentHabit, emoji })}
            />
        </>
    );
}

export default Settings;
