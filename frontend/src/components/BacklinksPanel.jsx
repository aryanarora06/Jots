import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tapAnimation } from '../utils/motion';
import api from '../api';

const BacklinksPanel = ({ noteId, onNoteClick }) => {
    const [backlinks, setBacklinks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (!noteId) return;

        const fetchBacklinks = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/api/notes/${noteId}/backlinks/`);
                setBacklinks(response.data);
            } catch (err) {
                console.error('Failed to fetch backlinks:', err);
                setBacklinks([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBacklinks();
    }, [noteId]);

    if (isLoading) {
        return null;
    }

    if (backlinks.length === 0) return null;

    return (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <motion.button 
                whileTap={tapAnimation}
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
            >
                <Link2 className="w-4 h-4 text-black dark:text-white" />
                <span>{backlinks.length} backlink{backlinks.length !== 1 ? 's' : ''}</span>
                <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </motion.button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 space-y-2">
                            {backlinks.map(bl => (
                                <motion.button
                                    whileTap={tapAnimation}
                                    key={bl.id}
                                    onClick={() => onNoteClick && onNoteClick(bl.id)}
                                    className="group w-full text-left p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {bl.title}
                                        </span>
                                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0 ml-2" />
                                    </div>
                                    {bl.preview && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {bl.preview}
                                        </p>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BacklinksPanel;
