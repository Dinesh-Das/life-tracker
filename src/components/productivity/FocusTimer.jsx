import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Coffee, Brain } from 'lucide-react';

const SESSIONS = {
    WORK: 25 * 60,
    SHORT: 5 * 60,
    LONG: 15 * 60
};

export default function FocusTimer() {
    const [timeLeft, setTimeLeft] = useState(SESSIONS.WORK);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('WORK');
    const [isMuted, setIsMuted] = useState(false);
    
    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            clearInterval(timerRef.current);
            setIsActive(false);
            if (!isMuted) {
                // Play a gentle sound if possible, or just toast
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(() => {});
            }
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft, isMuted]);

    const toggleTimer = () => setIsActive(!isActive);
    
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(SESSIONS[mode]);
    };

    const changeMode = (newMode) => {
        setIsActive(false);
        setMode(newMode);
        setTimeLeft(SESSIONS[newMode]);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (1 - timeLeft / SESSIONS[mode]) * 100;

    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 flex flex-col items-center">
            {/* Mode Switcher */}
            <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
                {Object.keys(SESSIONS).map(m => (
                    <button
                        key={m}
                        onClick={() => changeMode(m)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === m ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {m === 'WORK' ? 'Deep Work' : m === 'SHORT' ? 'Short Break' : 'Long Break'}
                    </button>
                ))}
            </div>

            {/* Timer Display */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-50"
                    />
                    <motion.circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={754} // 2 * PI * r
                        animate={{ strokeDashoffset: 754 - (754 * progress) / 100 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="text-emerald-500"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <motion.span 
                        key={timeLeft}
                        initial={{ opacity: 0.5, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-6xl font-serif font-black text-gray-800"
                    >
                        {formatTime(timeLeft)}
                    </motion.span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
                        {mode === 'WORK' ? 'Focusing' : 'Resting'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <button 
                    onClick={toggleTimer}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    onClick={resetTimer}
                    className="p-3 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Context Message */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500"
                >
                    {mode === 'WORK' ? (
                        <>
                            <Brain size={16} className="text-emerald-500" />
                            <span>Keep your phone away and focus on the task.</span>
                        </>
                    ) : (
                        <>
                            <Coffee size={16} className="text-amber-500" />
                            <span>Take a deep breath and stretch your body.</span>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
