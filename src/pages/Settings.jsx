import Header from '../components/layout/Header'
import { Plus, Trash2, Edit2, User, Shield, ExternalLink, Copy, RefreshCw, Search, ArchiveRestore, ArrowUp, ArrowDown, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { useSettings } from '../hooks/useSettings'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import Modal from '../components/ui/Modal'
import EmojiPicker from '../components/ui/EmojiPicker'
import { CATEGORIES } from '../lib/constants'
import toast from 'react-hot-toast'
import { validateHabit } from '../lib/habitSchema'
import { clearSpreadsheetCache } from '../lib/sheetsApi'
import { recordActivity } from '../lib/activityLog'

const WEEKDAYS = [['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]];
const EMPTY_HABIT = { name: '', emoji: '✨', goal: 30, category: 'Health', frequency: 'Daily', scheduleType: 'frequency', scheduleDays: [], intervalDays: 1, timesPerMonth: 12, pausedFrom: '', pausedUntil: '', routine: '', tags: [] };

function Settings() {
    const { spreadsheetId, user, userGender, updateUserGender } = useAuth();
    const { hideFemaleData, toggleHideFemaleData } = useAppContext();
    const { habits, archivedHabits, loading, saving, status, error, saveHabits, refresh } = useSettings(spreadsheetId);

    const [localGender, setLocalGender] = useState(userGender || 'male');
    const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
    const [habitModalMode, setHabitModalMode] = useState('create');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [habitQuery, setHabitQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [currentHabit, setCurrentHabit] = useState(EMPTY_HABIT);
    const [selectedHabitIds, setSelectedHabitIds] = useState([]);
    const [bulkCategory, setBulkCategory] = useState('Health');

    const filteredHabits = useMemo(() => {
        const query = habitQuery.trim().toLocaleLowerCase();
        return habits.filter(habit =>
            (categoryFilter === 'All' || habit.category === categoryFilter) &&
            (!query || habit.name.toLocaleLowerCase().includes(query))
        );
    }, [categoryFilter, habitQuery, habits]);

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

    const commitHabitChange = async (next, type, label) => {
        const snapshot = habits;
        const saved = await saveHabits(next);
        if (saved) recordActivity(spreadsheetId, type, label, snapshot);
        return saved;
    };

    const handleDeleteHabit = (id) => {
        if (confirm('Archive this habit? Its history will be preserved.')) {
            void commitHabitChange(habits.filter(h => h.id !== id), 'archive', 'Archived a habit');
        }
    };

    const openHabitModal = (habit = null) => {
        if (habit) {
            setHabitModalMode('edit');
            setCurrentHabit(habit);
        } else {
            setHabitModalMode('create');
            setCurrentHabit({ ...EMPTY_HABIT, id: crypto.randomUUID() });
        }
        setIsHabitModalOpen(true);
    };

    const handleSaveHabit = async (e) => {
        e.preventDefault();
        const validation = validateHabit(currentHabit);
        if (!validation.valid) {
            toast.error(validation.message);
            return;
        }
        const exists = habits.find(h => h.id === currentHabit.id);
        let saved;
        if (exists) {
            saved = await commitHabitChange(habits.map(h => h.id === currentHabit.id ? validation.value : h), 'edit', `Edited ${validation.value.name}`);
        } else {
            saved = await commitHabitChange([...habits, validation.value], 'create', `Created ${validation.value.name}`);
        }
        if (saved) setIsHabitModalOpen(false);
    };

    const copySheetId = () => {
        if (spreadsheetId) {
            navigator.clipboard.writeText(spreadsheetId);
            toast.success('Sheet ID copied!');
        }
    };

    const handleRestoreHabit = async (habit) => {
        await commitHabitChange([
            ...habits,
            { ...habit, archivedAt: '', order: habits.length + 1 },
        ], 'restore', `Restored ${habit.name}`);
    };

    const moveHabit = async (id, direction) => {
        const index = habits.findIndex(habit => habit.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= habits.length) return;
        const next = [...habits];
        [next[index], next[target]] = [next[target], next[index]];
        await commitHabitChange(next, 'reorder', `Reordered ${habits[index].name}`);
    };

    const duplicateHabit = async habit => {
        const copy = { ...habit, id: crypto.randomUUID(), name: `${habit.name} copy`, createdAt: new Date().toISOString(), archivedAt: '', sheetRow: null };
        await commitHabitChange([...habits, copy], 'duplicate', `Duplicated ${habit.name}`);
    };

    const applyBulkCategory = async () => {
        if (!selectedHabitIds.length) return;
        const ids = new Set(selectedHabitIds);
        if (await commitHabitChange(habits.map(habit => ids.has(habit.id) ? { ...habit, category: bulkCategory } : habit), 'bulk-edit', `Updated ${ids.size} habit categories`)) setSelectedHabitIds([]);
    };

    const bulkArchive = async () => {
        if (!selectedHabitIds.length || !confirm(`Archive ${selectedHabitIds.length} selected habits? History will be preserved.`)) return;
        const ids = new Set(selectedHabitIds);
        if (await commitHabitChange(habits.filter(habit => !ids.has(habit.id)), 'bulk-archive', `Archived ${ids.size} habits`)) setSelectedHabitIds([]);
    };

    const hardRefresh = async () => {
        try {
            await clearSpreadsheetCache(spreadsheetId);
            toast.success('Local sheet cache cleared. Reloading…');
            window.setTimeout(() => window.location.reload(), 250);
        } catch {
            toast.error('Could not clear the local cache.');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Settings" />
                <div className="px-4 py-6 sm:px-10">
                    <LoadingSkeleton type="page" />
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Settings" />
                <div className="px-4 py-6 sm:px-10" role="alert">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h2 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>Settings could not be loaded</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{error?.message || 'Please check your connection and try again.'}</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button className="system-action-button" onClick={refresh}>Retry</button>
                            <button className="system-action-button" onClick={hardRefresh}>Clear cache & reload</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Settings" saving={saving} />

            <div className="w-full px-4 pt-2 pb-20 sm:px-10">
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
                        <div className="theme-panel-muted" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
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
                                    type="button"
                                    role="switch"
                                    aria-checked={hideFemaleData}
                                    aria-label="Hide female tracker data"
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
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>Habits ({habits.length})</h3>
                                    <p style={{ marginTop: '2px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>No habit limit</p>
                                </div>
                            </div>
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
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.35fr)', gap: '10px', marginBottom: '14px' }}>
                            <label style={{ position: 'relative' }}>
                                <span className="sr-only">Search habits</span>
                                <Search size={15} aria-hidden="true" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input value={habitQuery} onChange={event => setHabitQuery(event.target.value)} placeholder="Search habits" style={{ width: '100%', minHeight: '40px', padding: '9px 12px 9px 36px', borderRadius: 'var(--radius-md)' }} />
                            </label>
                            <label>
                                <span className="sr-only">Filter habits by category</span>
                                <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} style={{ width: '100%', minHeight: '40px', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>
                                    <option value="All">All categories</option>
                                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <button type="button" className="theme-neutral-button" style={{ padding: '8px 12px' }} onClick={() => setSelectedHabitIds(selectedHabitIds.length === filteredHabits.length ? [] : filteredHabits.map(habit => habit.id))}>
                                {selectedHabitIds.length === filteredHabits.length && filteredHabits.length ? 'Clear selection' : 'Select visible'}
                            </button>
                            {selectedHabitIds.length > 0 && <>
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{selectedHabitIds.length} selected</span>
                                <select value={bulkCategory} onChange={event => setBulkCategory(event.target.value)} style={{ minHeight: 36, borderRadius: 9, padding: '6px 9px' }}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>
                                <button type="button" className="system-action-button" disabled={saving} onClick={applyBulkCategory}>Apply category</button>
                                <button type="button" className="system-action-button" disabled={saving} onClick={bulkArchive}>Archive selected</button>
                            </>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredHabits.map((habit, idx) => (
                                <div key={habit.id} className="habit-setting-row theme-row" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background 0.2s', contentVisibility: 'auto', containIntrinsicSize: '56px',
                                }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        <input type="checkbox" checked={selectedHabitIds.includes(habit.id)} onChange={event => setSelectedHabitIds(ids => event.target.checked ? [...ids, habit.id] : ids.filter(id => id !== habit.id))} aria-label={`Select ${habit.name}`} />
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', width: '18px', textAlign: 'right' }}>{idx + 1}</span>
                                        <span className="theme-icon-tile" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '18px' }}>{habit.emoji}</span>
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>{habit.name}</h4>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{habit.category} • {habit.goal} days/mo</span>
                                        </div>
                                    </div>
                                    <div className="habit-setting-actions" style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => moveHabit(habit.id, -1)} disabled={idx === 0} aria-label={`Move ${habit.name} up`} className="habit-icon-action"><ArrowUp size={14} /></button>
                                        <button onClick={() => moveHabit(habit.id, 1)} disabled={idx === filteredHabits.length - 1} aria-label={`Move ${habit.name} down`} className="habit-icon-action"><ArrowDown size={14} /></button>
                                        <button onClick={() => duplicateHabit(habit)} aria-label={`Duplicate ${habit.name}`} className="habit-icon-action"><Copy size={14} /></button>
                                        <button
                                            onClick={() => openHabitModal(habit)}
                                            aria-label={`Edit ${habit.name}`}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,140,220,0.3)'; e.currentTarget.style.color = '#a0b8f0'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHabit(habit.id)}
                                            aria-label={`Archive ${habit.name}`}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,60,60,0.3)'; e.currentTarget.style.color = '#f0a0a0'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredHabits.length === 0 && (
                                <p style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No habits match this filter.</p>
                            )}
                        </div>
                    </section>

                    {archivedHabits.length > 0 && (
                        <section className="glass-card animate-fade-up stagger-2" style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(100,110,120,0.35)', color: 'var(--text-muted)', flexShrink: 0 }}>
                                    <ArchiveRestore size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>Archived Habits ({archivedHabits.length})</h3>
                                    <p style={{ marginTop: '2px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>Restore a habit with its original ID and history.</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {archivedHabits.map(habit => (
                                    <div key={habit.id} className="theme-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', contentVisibility: 'auto', containIntrinsicSize: '56px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                            <span className="theme-icon-tile" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '18px', flexShrink: 0 }}>{habit.emoji}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</h4>
                                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)' }}>{habit.category} • History preserved</span>
                                            </div>
                                        </div>
                                        <button type="button" className="system-action-button" disabled={saving} onClick={() => handleRestoreHabit(habit)} aria-label={`Restore ${habit.name}`} style={{ minHeight: '34px', padding: '7px 12px', flexShrink: 0 }}>
                                            <ArchiveRestore size={14} /> Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Connected Sheet */}
                    {spreadsheetId && (
                        <section className="glass-card animate-fade-up stagger-2" style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>Connected Sheet</h3>
                                <button
                                    type="button"
                                    onClick={hardRefresh}
                                    className="system-action-button"
                                    title="Clear local cached sheet data and reload"
                                    style={{ minHeight: '36px', padding: '8px 12px', fontSize: '10px' }}
                                >
                                    <RefreshCw size={14} /> Hard refresh
                                </button>
                            </div>
                            <div className="theme-panel-muted" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                                <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spreadsheetId}</code>
                                <button onClick={copySheetId} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', display: 'flex' }} title="Copy ID"
                                    type="button" aria-label="Copy connected spreadsheet ID"
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

                    <section className="glass-card" style={{ padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-heading)' }}>Product tools</h3><p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Backups, repair, routines, vacation mode, activity history and push reminders.</p></div>
                            <Link to="/tools" className="system-action-button"><Wrench size={14} /> Open tools</Link>
                        </div>
                    </section>

                </div>
            </div>

            {/* Habit Modal */}
            <Modal
                isOpen={isHabitModalOpen}
                onClose={() => setIsHabitModalOpen(false)}
                title={habitModalMode === 'edit' ? 'Edit Habit' : 'New Habit'}
            >
                <form onSubmit={handleSaveHabit} className="space-y-5">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setIsEmojiPickerOpen(true)}
                            aria-label="Choose habit emoji"
                            className="theme-icon-tile w-14 h-14 border rounded-xl flex items-center justify-center text-2xl transition-all shrink-0"
                        >
                            {currentHabit.emoji}
                        </button>
                        <div className="flex-1 space-y-1">
                            <label htmlFor="habit-name" className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Habit Name</label>
                            <input
                                id="habit-name"
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
                            <label htmlFor="habit-category" className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Category</label>
                            <select
                                id="habit-category"
                                value={currentHabit.category}
                                onChange={e => setCurrentHabit({ ...currentHabit, category: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="habit-goal" className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Monthly Goal</label>
                            <input
                                id="habit-goal"
                                type="number"
                                min="1"
                                max="31"
                                value={currentHabit.goal}
                                onChange={e => setCurrentHabit({ ...currentHabit, goal: parseInt(e.target.value) })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="habit-schedule" className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Schedule</label>
                            <select id="habit-schedule" value={currentHabit.scheduleType || 'frequency'} onChange={e => setCurrentHabit({ ...currentHabit, scheduleType: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200">
                                <option value="frequency">Daily / weekly target</option>
                                <option value="weekdays">Selected weekdays</option>
                                <option value="interval">Every N days</option>
                                <option value="monthly">Times per month</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="habit-frequency" className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Weekly target</label>
                            <select id="habit-frequency" value={currentHabit.frequency || 'Daily'} onChange={e => setCurrentHabit({ ...currentHabit, frequency: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-200">
                                <option>Daily</option>{[1,2,3,4,5,6].map(count => <option key={count}>{count}x/week</option>)}
                            </select>
                        </div>
                    </div>

                    {currentHabit.scheduleType === 'weekdays' && <div className="space-y-2"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Active weekdays</span><div className="flex gap-2 flex-wrap">{WEEKDAYS.map(([label, day], index) => <button type="button" key={`${label}-${index}`} onClick={() => setCurrentHabit({ ...currentHabit, scheduleDays: (currentHabit.scheduleDays || []).includes(day) ? currentHabit.scheduleDays.filter(value => value !== day) : [...(currentHabit.scheduleDays || []), day] })} aria-pressed={(currentHabit.scheduleDays || []).includes(day)} className={(currentHabit.scheduleDays || []).includes(day) ? 'system-action-button' : 'glass-button'} style={{ width: 38, padding: 0 }}>{label}</button>)}</div></div>}
                    {currentHabit.scheduleType === 'interval' && <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Repeat every N days</span><input type="number" min="1" max="365" value={currentHabit.intervalDays || 1} onChange={e => setCurrentHabit({ ...currentHabit, intervalDays: Number(e.target.value) })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>}
                    {currentHabit.scheduleType === 'monthly' && <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Times per month</span><input type="number" min="1" max="31" value={currentHabit.timesPerMonth || 1} onChange={e => setCurrentHabit({ ...currentHabit, timesPerMonth: Number(e.target.value) })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Pause from</span><input type="date" value={currentHabit.pausedFrom || ''} onChange={e => setCurrentHabit({ ...currentHabit, pausedFrom: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Pause until</span><input type="date" value={currentHabit.pausedUntil || ''} onChange={e => setCurrentHabit({ ...currentHabit, pausedUntil: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Routine</span><input maxLength="60" value={currentHabit.routine || ''} onChange={e => setCurrentHabit({ ...currentHabit, routine: e.target.value })} placeholder="Morning reset" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Tags</span><input maxLength="180" value={(currentHabit.tags || []).join(', ')} onChange={e => setCurrentHabit({ ...currentHabit, tags: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="home, energy" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" /></label>
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
