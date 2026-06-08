import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus } from 'lucide-react';
import { tapAnimation, modalBackdropVariants, modalPanelVariants } from '../utils/motion';

const WelcomeModal = ({ isOpen, onClose, onAction }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.documentElement.classList.add('modal-open');
        } else {
            document.documentElement.classList.remove('modal-open');
        }
        return () => {
            document.documentElement.classList.remove('modal-open');
        };
    }, [isOpen]);

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="absolute inset-0 bg-black/40 dark:bg-black/60"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-sm bg-white dark:bg-black rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
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
                                <Sparkles className="h-6 w-6" />
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Welcome to Jots! 🎉
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Your new workspace is ready. Start by creating your very first note, or close this to explore.
                            </p>

                            <div className="mt-6 flex gap-3">
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={onClose}
                                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Explore
                                </motion.button>
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => {
                                        onClose();
                                        onAction();
                                    }}
                                    className="flex-1 rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                                >
                                    Create Note
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
