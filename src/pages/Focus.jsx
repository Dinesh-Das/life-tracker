import { motion } from 'framer-motion';
import FocusTimer from '../components/productivity/FocusTimer';
import Header from '../components/layout/Header';

function FocusPage() {
    return (
        <div className="flex-1 flex flex-col bg-background-subtle min-h-screen">
            <Header title="Focus Mode" />
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-6 pb-32"
            >
                <div className="max-w-md w-full space-y-10">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-serif font-bold text-gray-900">Deep Work Session</h2>
                        <p className="text-sm text-gray-500">Eliminate distractions and find your flow.</p>
                    </div>
                    <FocusTimer />
                </div>
            </motion.div>
        </div>
    );
}

export default FocusPage;
