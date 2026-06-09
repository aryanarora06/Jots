import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, User, Plus, X } from 'lucide-react';
import api from '../api';
import WordCount from '../components/WordCount';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdropVariants, modalPanelVariants, tapAnimation } from '../utils/motion';

const SharedNotePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [notePreview, setNotePreview] = useState(null);
    const [error, setError] = useState(null);

    const [isVisible, setIsVisible] = useState(true);
    const [navTarget, setNavTarget] = useState(null);

    const handleClose = (target = '/', state = {}) => {
        setNavTarget({ pathname: target, state });
        setIsVisible(false);
    };

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const response = await api.get(`/api/share/${token}/`);
                setNotePreview(response.data);
            } catch (err) {
                console.error('Failed to load shared note:', err);
                if (err.response?.status === 404) {
                    setError("This share link is invalid or has been revoked.");
                } else {
                    setError("Failed to load the shared note. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchPreview();
    }, [token]);

    const handleAccept = async () => {
        setIsAccepting(true);
        setError(null);
        try {
            await api.post(`/api/share/${token}/`);
            // Wait briefly then close with animation
            setTimeout(() => {
                handleClose('/', { showShared: true });
            }, 300);
        } catch (err) {
            console.error('Failed to accept share:', err);
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
                if (err.response.data.detail === "Note already shared with you." || 
                    err.response.data.detail === "You own this note.") {
                    setTimeout(() => {
                        handleClose('/', { showShared: err.response.data.detail !== "You own this note." });
                    }, 2000);
                }
            } else {
                setError("Something went wrong. Please try again.");
            }
            setIsAccepting(false);
        }
    };

    return (
        <AnimatePresence 
            mode="wait" 
            onExitComplete={() => {
                if (navTarget) navigate(navTarget.pathname, { state: navTarget.state });
            }}
        >
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                        variants={modalBackdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onClick={() => handleClose('/')}
                    />

                    <motion.div 
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-md bg-white dark:bg-black rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col"
                    >
                        <div className="px-6 py-6 text-center">
                            <motion.button 
                                whileTap={tapAnimation}
                                onClick={() => handleClose('/')}
                                className="absolute top-4 right-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </motion.button>

                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-black dark:text-white">
                                <Book className="h-6 w-6" />
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Shared Note
                            </h3>

                            <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="py-8">
                                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading note...</h2>
                                </motion.div>
                            ) : error ? (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-md text-center">
                                    {error}
                                </motion.div>
                            ) : notePreview ? (
                                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-4 text-left">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800 mb-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                                            {notePreview.title}
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            <User className="w-3.5 h-3.5 mr-1" />
                                            Shared by <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">{notePreview.owner}</span>
                                        </div>
                                        <WordCount note={notePreview} className="mb-3 block" />
                                        <div className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-3">
                                            "{notePreview.preview}"
                                        </div>
                                    </div>

                                    <motion.button
                                        whileTap={tapAnimation}
                                        onClick={handleAccept}
                                        disabled={isAccepting}
                                        className={`w-full flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none transition-all ${isAccepting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isAccepting ? (
                                            <span className="w-5 h-5 flex items-center justify-center">...</span>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-1.5" />
                                                Add to my notes
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            ) : null}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SharedNotePage;
