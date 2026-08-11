import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { installChunkLoadRecovery } from './lib/chunkLoadRecovery.js'
// Self-hosted fonts — offline-capable, no external font requests
import '@fontsource/manrope/300.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import '@fontsource/newsreader/700.css'
import '@fontsource/newsreader/400-italic.css'
import '@fontsource/newsreader/500-italic.css'

import './index.css'

// A newly deployed app may invalidate lazy chunks requested by an older tab.
// Refresh the app shell once while keeping the user on their current route.
installChunkLoadRecovery()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

// Register the service worker (production only) for offline support
// and PWA installability.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
        });
    });
}
