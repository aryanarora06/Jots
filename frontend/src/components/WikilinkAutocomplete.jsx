import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

export default function WikilinkAutocomplete({ onSelect }) {
    const [query, setQuery] = useState(null);
    const [matchStr, setMatchStr] = useState(null);
    const [pos, setPos] = useState(null);
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || !selection.focusNode) {
                setQuery(null);
                setMatchStr(null);
                return;
            }
            
            // Ensure we are inside the editor
            if (!selection.focusNode.parentElement?.closest('.prose')) {
                setQuery(null);
                setMatchStr(null);
                return;
            }
            
            if (selection.focusNode.nodeType === Node.TEXT_NODE) {
                const text = selection.focusNode.textContent;
                const offset = selection.focusOffset;
                const before = text.slice(0, offset);
                
                // Match [[ followed by anything except ]]
                const matchNormal = before.match(/\[\[([^\]]*)$/);
                const matchEscaped = before.match(/\\\[\\\[([^\]]*)$/);
                const match = matchNormal || matchEscaped;
                
                if (match) {
                    setQuery(match[1]);
                    setMatchStr(match[0]);
                    try {
                        const range = selection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        setPos({ top: rect.bottom, left: rect.left });
                    } catch (e) {
                        setQuery(null);
                        setMatchStr(null);
                    }
                } else {
                    setQuery(null);
                    setMatchStr(null);
                }
            }
        };
        
        document.addEventListener('selectionchange', handleSelection);
        return () => document.removeEventListener('selectionchange', handleSelection);
    }, []);

    useEffect(() => {
        if (query === null) return;
        const fetchTitles = async () => {
            try {
                const res = await api.get(`/api/notes/titles/?q=${encodeURIComponent(query)}`);
                setResults(res.data.slice(0, 5));
                setSelectedIndex(0);
            } catch (err) { }
        };
        const timer = setTimeout(fetchTitles, 150);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (query === null) return;
        
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(s => (s + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(s => (s - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
                if (results.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (results[selectedIndex]) {
                        onSelect(results[selectedIndex].title, query, matchStr);
                        setQuery(null);
                        setMatchStr(null);
                    }
                }
            } else if (e.key === 'Escape') {
                setQuery(null);
                setMatchStr(null);
            }
        };
        
        // Capture phase to intercept MDXEditor's own enter key handling
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [query, results, selectedIndex, onSelect, matchStr]);

    return (
        <AnimatePresence mode="wait">
            {query !== null && pos && results.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
                    exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
                    style={{ top: pos.top + 8, left: pos.left }}
                    className="fixed z-[9999] w-64 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden rounded-none"
                >
                    {results.map((r, i) => (
                        <div 
                            key={r.id}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent focus loss!
                                onSelect(r.title, query, matchStr); 
                                setQuery(null);
                                setMatchStr(null);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${i === selectedIndex ? 'bg-black text-white dark:bg-white dark:text-black font-medium' : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            {r.title}
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
