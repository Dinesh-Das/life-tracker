import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import GenderPicker from './components/ui/GenderPicker'
import Login from './pages/Login'
import Landing from './pages/Landing'

// Route-level code splitting: heavy pages (recharts, cycle tracker, etc.)
// are fetched on demand so the initial mobile bundle stays small.
// Login and Landing stay eager — they are the app entry points.
const ZenHub = lazy(() => import('./pages/ZenHub'))
const DailyCheckin = lazy(() => import('./pages/DailyCheckin'))
const Planner = lazy(() => import('./pages/Planner'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const FemaleTracker = lazy(() => import('./pages/FemaleTracker'))
const Journal = lazy(() => import('./pages/Journal'))
const Focus = lazy(() => import('./pages/Focus'))
const Wrapped = lazy(() => import('./pages/Wrapped'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))

const PageFallback = () => (
    <div className="flex-1 flex items-center justify-center" style={{ minHeight: '40vh' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>Loading…</p>
    </div>
);

const AuthenticatedLayout = ({ children }) => {
    const { userGender } = useAuth();
    const location = useLocation();

    return (
        <div className="app-shell">
            <Sidebar aria-label="Sidebar Navigation" />
            {/* Main canvas — the minty green gradient from stitch design */}
            <main
                className="app-main flex-1 min-w-0 pb-20 lg:pb-0 overflow-y-auto relative"
                style={{
                    background: 'var(--main-bg)',
                }}
            >
                {/* Radial overlay blobs */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                        background: 'var(--main-overlay-1), var(--main-overlay-2)',
                    }}
                />
                <div className="relative z-10 flex flex-col min-h-full">
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
                            <Suspense fallback={<PageFallback />}>
                                {children}
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                {/* Legal Footer for Compliance */}
                <footer className="mt-auto py-6 text-center text-[10px] uppercase tracking-widest font-bold text-gray-500/50 relative z-10">
                    <Link to="/privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</Link>
                    <span className="mx-3 opacity-30">•</span>
                    <Link to="/terms" className="hover:text-gray-800 transition-colors">Terms of Service</Link>
                </footer>
            </main>
            <MobileNav aria-label="Mobile Navigation" />
        </div>
    );
};

function AppRoutes() {
    const { user, loading, userGender } = useAuth();
    const location = useLocation();

    
    // Prefetch the most likely next pages while the browser is idle,
    // so navigation from the Hub feels instant.
    useEffect(() => {
        if (!user) return;
        const prefetch = () => {
            import('./pages/DailyCheckin');
            import('./pages/Dashboard');
            import('./pages/Planner');
        };
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(prefetch, { timeout: 3000 });
            return () => window.cancelIdleCallback(id);
        }
        const t = setTimeout(prefetch, 2000);
        return () => clearTimeout(t);
    }, [user]);

    // NEVER block public routes with a loading screen.
    // Google's bot needs to see the Landing page immediately to pass verification.
    const isPublicRoute = ['/', '/privacy', '/terms'].includes(location.pathname);

    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
                <div className="animate-pulse text-2xl font-serif">Loading LifeTracker...</div>
            </div>
        );
    }

     // Shared guard: authenticated users get the app shell, others go to login
    const protect = (page) => (user
        ? <AuthenticatedLayout>{page}</AuthenticatedLayout>
        : <Navigate to="/login" />
    );

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/hub" />} />

            {/* Protected Routes */}
            <Route path="/hub" element={protect(<ZenHub />)} />
            <Route path="/daily" element={protect(<DailyCheckin />)} />
            <Route path="/planner" element={protect(<Planner />)} />
            <Route path="/journal" element={protect(<Journal />)} />
            <Route path="/focus" element={protect(<Focus />)} />
            <Route path="/dashboard" element={protect(<Dashboard />)} /><Route path="/female" element={
                user
                    ? (userGender === 'female'
                        ? <AuthenticatedLayout><FemaleTracker /></AuthenticatedLayout>
                        : <Navigate to="/hub" />
                    )
                    : <Navigate to="/login" />
            } />
            <Route path="/wrapped" element={protect(<Wrapped />)} />
            <Route path="/settings" element={protect(<Settings />)} />
            {/* Public Legal Routes */}
            <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><PrivacyPolicy /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<PageFallback />}><TermsOfService /></Suspense>} />

            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default AppRoutes
