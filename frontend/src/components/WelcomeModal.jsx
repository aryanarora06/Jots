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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="absolute inset-0 bg-black/40"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-md bg-white dark:bg-black rounded-lg shadow-2xl shadow-black/10 dark:shadow-black/60 border border-gray-200 dark:border-gray-800 overflow-hidden"
                    >
                        {/* Content */}
                        <div className="px-8 pt-10 pb-8 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6">
                                <Sparkles className="h-8 w-8 text-black dark:text-white" strokeWidth={1.5} />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Welcome to Jots! 🎉
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                                We're so excited to have you here. Your new workspace is ready. Start by creating your very first note, or close this to explore the dashboard.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => {
                                        onClose();
                                        onAction();
                                    }}
                                    className="flex-1 inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-md text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:outline-none transition-all"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create a Note
                                </motion.button>
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={onClose}
                                    className="flex-1 inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-md text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:bg-black dark:border-gray-800 dark:hover:bg-gray-900 focus:outline-none transition-all"
                                >
                                    Explore First
                                </motion.button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
