import { format, subDays, addDays, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../hooks/useJournal';
import Header from '../components/layout/Header';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Sun, Moon, Target, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const EMPTY_JOURNAL = { gratitude: '', review: '', focus: '' };

function Journal() {
    const { spreadsheetId } = useAuth();
    const { journal, loading, saving, saveJournal, selectedDate, setSelectedDate } = useJournal(spreadsheetId);

    // Local buffer — decouples typing from hook state so no re-renders on every keystroke
    const [localJournal, setLocalJournal] = useState(EMPTY_JOURNAL);

    // Sync from sheet whenever loading finishes (initial load) or selected date changes
    useEffect(() => {
        if (!loading) {
            setLocalJournal({ ...EMPTY_JOURNAL, ...journal });
        }
    }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // Also reset local state immediately when the date changes (before load completes)
    useEffect(() => {
        setLocalJournal(EMPTY_JOURNAL);
    }, [selectedDate]);

    const handleJournalChange = useCallback((field, text) => {
        setLocalJournal(prev => ({ ...prev, [field]: text }));
        saveJournal(field, text);
    }, [saveJournal]);

    const isToday = isSameDay(selectedDate, new Date());

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Reflections" />
                <div className="px-4 py-6 sm:px-10">
                    <LoadingSkeleton type="page" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <Header title="Reflections" subtitle={isToday ? "Capture your thoughts and set your intentions." : "Viewing your past entries."} saving={saving} />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full px-4 pt-4 pb-20 sm:px-10"
            >
                {/* Date Navigation */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', marginBottom: '24px' }}>
                    <button
                        id="journal-prev-day"
                        onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '2px' }}>
                            <Calendar size={12} style={{ color: '#4a7a62' }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                            </span>
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)' }}>
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </h2>
                    </div>

                    <button
                        id="journal-next-day"
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        disabled={isToday}
                        style={{
                            background: 'none', border: 'none', cursor: isToday ? 'not-allowed' : 'pointer',
                            color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', opacity: isToday ? 0.25 : 1,
                            display: 'flex', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                        <ChevronRight size={22} />
                    </button>
                </div>

                {/* Journal sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <JournalSection
                        title="Primary Focus"
                        subtitle="What is the one thing you want to accomplish today?"
                        icon={Target}
                        iconColor="#a090f8"
                        value={localJournal.focus}
                        onChange={(val) => handleJournalChange('focus', val)}
                        placeholder="Write your main focus here..."
                    />
                    <JournalSection
                        title="Morning Gratitude"
                        subtitle="What are three things you are grateful for right now?"
                        icon={Sun}
                        iconColor="#f0c060"
                        value={localJournal.gratitude}
                        onChange={(val) => handleJournalChange('gratitude', val)}
                        placeholder="I am grateful for..."
                        isLarge
                    />
                    <JournalSection
                        title="Evening Review"
                        subtitle="What went well today? What did you learn?"
                        icon={Moon}
                        iconColor="#f090a8"
                        value={localJournal.review}
                        onChange={(val) => handleJournalChange('review', val)}
                        placeholder="Today was..."
                        isLarge
                    />
                </div>
            </motion.div>
        </div>
    );
}

function JournalSection({ title, subtitle, icon: Icon, iconColor, value, onChange, placeholder, isLarge }) {
    return (
        <div className="glass-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: iconColor || 'var(--text-heading)',
                }}>
                    <Icon size={20} />
                </div>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '3px' }}>{title}</h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</p>
                </div>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(8px)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--text-body)',
                    lineHeight: 1.6,
                    resize: 'none',
                    outline: 'none',
                    height: isLarge ? '140px' : '90px',
                    transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
            />
        </div>
    );
}

export default Journal;
