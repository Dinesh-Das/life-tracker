import { format, subDays, addDays, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../hooks/useJournal';
import Header from '../components/layout/Header';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Sun, Moon, Target, Sparkles, Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

function Journal() {
    const { spreadsheetId } = useAuth();
    const { journal, loading, saving, saveJournal, selectedDate, setSelectedDate } = useJournal(spreadsheetId);

    const isToday = isSameDay(selectedDate, new Date());

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Reflections" />
                <LoadingSkeleton type="page" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-background-subtle min-h-screen">
            <Header title="Reflections" />
            
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8 pb-32"
            >
                {/* Date Navigation */}
                <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <button 
                        onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                        className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-emerald-600"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-0.5">
                            <Calendar size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                            </span>
                        </div>
                        <h2 className="text-lg font-serif font-bold text-gray-900">
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </h2>
                    </div>

                    <button 
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        className={`p-2 rounded-xl transition-colors ${isToday ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-400 hover:text-emerald-600'}`}
                        disabled={isToday}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Header Info */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-gray-900">Reflections</h2>
                        <p className="text-sm text-gray-500">
                            {isToday ? "Capture your thoughts and set your intentions." : "Viewing your past entries."}
                        </p>
                    </div>
                    {saving && (
                        <div className="flex items-center gap-2 text-emerald-600 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-wider">Saving...</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Primary Focus */}
                    <JournalSection 
                        title="Primary Focus"
                        subtitle="What is the one thing you want to accomplish today?"
                        icon={Target}
                        value={journal.focus}
                        onChange={(val) => saveJournal('focus', val)}
                        placeholder="Write your main focus here..."
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />

                    {/* Morning Gratitude */}
                    <JournalSection 
                        title="Morning Gratitude"
                        subtitle="What are three things you are grateful for right now?"
                        icon={Sun}
                        value={journal.gratitude}
                        onChange={(val) => saveJournal('gratitude', val)}
                        placeholder="I am grateful for..."
                        color="text-amber-600"
                        bg="bg-amber-50"
                        isLarge
                    />

                    {/* Evening Review */}
                    <JournalSection 
                        title="Evening Review"
                        subtitle="What went well today? What did you learn?"
                        icon={Moon}
                        value={journal.review}
                        onChange={(val) => saveJournal('review', val)}
                        placeholder="Today was..."
                        color="text-rose-600"
                        bg="bg-rose-50"
                        isLarge
                    />
                </div>
            </motion.div>
        </div>
    );
}

function JournalSection({ title, subtitle, icon: Icon, value, onChange, placeholder, color, bg, isLarge }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${bg} ${color}`}>
                    <Icon size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-serif font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
            </div>
            
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full p-4 rounded-2xl border border-gray-100 focus:border-emerald-200 focus:ring-0 focus:outline-none transition-all resize-none text-gray-700 leading-relaxed font-sans ${isLarge ? 'h-40' : 'h-24'}`}
            />
        </div>
    );
}

export default Journal;
