import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { CycleProvider } from './context/CycleContext'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import AppRoutes from './AppRoutes'

/**
 * CycleProvider is mounted once here at the app root (inside AuthProvider)
 * so cycle data is fetched once and shared across Dashboard, FemaleTracker, etc.
 * without re-mounting on every route change.
 */
function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <AppProvider>
                        <CycleProvider>
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    style: {
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                    },
                                }}
                            />
                            <AppRoutes />
                        </CycleProvider>
                    </AppProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    )
}

export default App
