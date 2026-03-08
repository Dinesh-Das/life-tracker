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
    const { gender, hideFemaleData, toggleHideFemaleData } = useAppContext();
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
                <LoadingSkeleton type="page" />
            </div>
        );
    }

    return (
        <>
            <Header title="Settings" saving={saving} />

            <div className="p-6 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto pb-24">
                {/* Profile Section */}
                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-up">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <User size={20} />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900">Profile</h3>
                    </div>

                    <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden shrink-0">
                            {user?.getImageUrl?.() ? (
                                <img src={user.getImageUrl()} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user?.getName?.().charAt(0) || 'U'
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">{user?.getName?.() || 'User'}</p>
                            <p className="text-xs text-gray-400">{user?.getEmail?.()}</p>
                        </div>
                    </div>

                    {/* Gender Selection */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-3 block">Gender</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleGenderChange('male')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localGender === 'male'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                                    }`}
                            >
                                ♂ Male
                            </button>
                            <button
                                onClick={() => handleGenderChange('female')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localGender === 'female'
                                    ? 'bg-rose-500 text-white shadow-md'
                                    : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                    }`}
                            >
                                ♀ Female
                            </button>
                        </div>
                    </div>

                    {/* Privacy Settings (Female Only) */}
                    {localGender === 'female' && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                            <div>
                                <label className="text-sm font-bold text-gray-900 block mb-1">Hide Female Data</label>
                                <p className="text-xs text-gray-500 max-w-xs">Removes the Female Tracker from the sidebar and hides cycle stats on the Dashboard.</p>
                            </div>
                            <button
                                onClick={() => toggleHideFemaleData(!hideFemaleData)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${hideFemaleData ? 'bg-rose-500' : 'bg-gray-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${hideFemaleData ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    )}
                </section>

                {/* Habit Management */}
                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-up stagger-1">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Shield size={20} />
                            </div>
                            <h3 className="text-lg font-serif font-bold text-gray-900">Habits ({habits.length}/15)</h3>
                        </div>
                        {habits.length < 15 && (
                            <button
                                onClick={() => openHabitModal()}
                                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-gray-900/10"
                            >
                                <Plus size={14} />
                                <span>Add Habit</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {habits.map((habit, idx) => (
                            <div key={habit.id} className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-300 w-5">{idx + 1}</span>
                                    <span className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-lg">{habit.emoji}</span>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">{habit.name}</h4>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{habit.category} • {habit.goal} days/mo</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => openHabitModal(habit)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteHabit(habit.id)}
                                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-up stagger-2">
                        <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">Connected Sheet</h3>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <code className="text-xs text-gray-500 flex-1 truncate">{spreadsheetId}</code>
                            <button onClick={copySheetId} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all" title="Copy ID">
                                <Copy size={14} />
                            </button>
                            <a
                                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Open in Google Sheets"
                            >
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </section>
                )}
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
