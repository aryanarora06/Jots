import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Prism from 'prismjs';

// Polyfill Prism globally for MDXEditor code block plugin in Vite production builds
window.Prism = Prism;

createRoot(document.getElementById('root')).render(
    <App />
)
