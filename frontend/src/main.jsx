import './prism-polyfill.js';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// Global tactile feedback (haptics) for interactive elements
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('pointerdown', (e) => {
        const interactive = e.target.closest('button, a, [role="button"], input[type="submit"], input[type="button"], .interactive');
        if (interactive && navigator.vibrate) {
            try {
                // 15ms provides a subtle, crisp "tick" feeling on most mobile devices
                navigator.vibrate(15);
            } catch (err) {
                // Ignore errors (e.g., if blocked by browser policy before first interaction)
            }
        }
    }, { passive: true });
}

createRoot(document.getElementById('root')).render(
    <App />
)
