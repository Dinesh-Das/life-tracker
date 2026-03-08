import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Login from './pages/Login'
import DailyCheckin from './pages/DailyCheckin'
import Planner from './pages/Planner'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import FemaleTracker from './pages/FemaleTracker'
import GenderPicker from './components/ui/GenderPicker'

/**
 * CycleProvider is mounted at App.jsx root — NOT here.
 * This keeps the cycle data fetch stable across route changes.
 */
const AuthenticatedLayout = ({ children }) => {
    const { userGender } = useAuth();

    return (
        <div className="flex min-h-screen bg-background-subtle">
            <Sidebar aria-label="Sidebar Navigation" />
            <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
                {userGender === 'needs_selection' && <GenderPicker />}
                {children}
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
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/daily" />} />

            {/* Protected Routes */}
            <Route path="/daily" element={user ? <AuthenticatedLayout><DailyCheckin /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/planner" element={user ? <AuthenticatedLayout><Planner /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={user ? <AuthenticatedLayout><Dashboard /></AuthenticatedLayout> : <Navigate to="/login" />} />
            <Route path="/female" element={
                user
                    ? (userGender === 'female'
                        ? <AuthenticatedLayout><FemaleTracker /></AuthenticatedLayout>
                        : <Navigate to="/daily" />
                    )
                    : <Navigate to="/login" />
            } />
            <Route path="/settings" element={user ? <AuthenticatedLayout><Settings /></AuthenticatedLayout> : <Navigate to="/login" />} />

            <Route path="/" element={<Navigate to="/daily" />} />
            <Route path="*" element={<Navigate to="/daily" />} />
        </Routes>
    );
}

export default AppRoutes
