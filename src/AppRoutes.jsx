import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Login from './pages/Login'
import ZenHub from './pages/ZenHub'
import DailyCheckin from './pages/DailyCheckin'
import Planner from './pages/Planner'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import FemaleTracker from './pages/FemaleTracker'
import Journal from './pages/Journal'
import Focus from './pages/Focus'
import GenderPicker from './components/ui/GenderPicker'

const AuthenticatedLayout = ({ children }) => {
    const { userGender } = useAuth();
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-background-subtle overflow-hidden">
            <Sidebar aria-label="Sidebar Navigation" />
            <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 h-screen overflow-y-auto">
                {userGender === 'needs_selection' && <GenderPicker />}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex-1 flex flex-col"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
            <MobileNav aria-label="Mobile Navigation" />
        </div>
    );
};

function AppRoutes() {
    const { user, loading, userGender } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
                <div className="animate-pulse text-2xl font-serif">Loading LifeTracker...</div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/hub" />} />

            {/* Protected Routes */}
            <Route path="/hub" element={user ? <AuthenticatedLayout><ZenHub /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/daily" element={user ? <AuthenticatedLayout><DailyCheckin /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/planner" element={user ? <AuthenticatedLayout><Planner /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/journal" element={user ? <AuthenticatedLayout><Journal /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/focus" element={user ? <AuthenticatedLayout><Focus /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={user ? <AuthenticatedLayout><Dashboard /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/female" element={
                user
                    ? (userGender === 'female'
                        ? <AuthenticatedLayout><FemaleTracker /></AuthenticatedLayout>
                        : <Navigate to="/hub" />
                    )
                    : <Navigate to="/login" />
            } />
            <Route path="/settings" element={user ? <AuthenticatedLayout><Settings /></AuthenticatedLayout> : <Navigate to="/login" />} />

            <Route path="/" element={<Navigate to="/hub" />} />
            <Route path="*" element={<Navigate to="/hub" />} />
        </Routes>
    );
}

export default AppRoutes
