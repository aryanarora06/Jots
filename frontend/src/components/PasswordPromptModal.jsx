import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ShieldOff, KeyRound } from 'lucide-react';

import { modalBackdropVariants, modalPanelVariants } from '../utils/motion';

const tapAnimation = { scale: 0.96 };

const PasswordPromptModal = ({ isOpen, onClose, onSubmit, mode, error }) => {
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown, true);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(password);
    };

    const isAdd = mode === 'add';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/40 dark:bg-black/60">
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="absolute inset-0"
                        onClick={onClose}
                    />
                    <motion.div
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-sm bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-6 text-center">
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={onClose}
                                className="absolute top-4 right-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                            
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-black dark:text-white">
                                {isAdd ? <KeyRound className="h-6 w-6" /> : <ShieldOff className="h-6 w-6" />}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {isAdd ? 'Add Password Protection' : 'Remove Password'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {isAdd ? 'Enter a password to protect this note.' : 'Enter the note password to remove protection.'}
                            </p>
                            
                            <form onSubmit={handleSubmit} className="mt-5">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:focus:border-white dark:focus:ring-white transition-colors"
                                    placeholder="Password"
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 text-left">{error}</p>
                                )}
                                <div className="mt-6 flex gap-3">
                                    <motion.button
                                        type="button"
                                        whileTap={tapAnimation}
                                        onClick={onClose}
                                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        whileTap={tapAnimation}
                                        disabled={password.trim().length === 0}
                                        className="flex-1 rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAdd ? 'Protect' : 'Remove'}
                                    </motion.button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default React.memo(PasswordPromptModal);
