import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus } from 'lucide-react';

const WelcomeModal = ({ isOpen, onClose, onAction }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                        {/* Header Image/Pattern area */}
                        <div className="h-32 bg-gradient-to-br from-red-500 to-rose-600 relative overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                            <Sparkles className="h-16 w-16 text-white" strokeWidth={1.5} />
                        </div>

                        {/* Content */}
                        <div className="px-8 pt-8 pb-10 text-center">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Welcome to Jots! 🎉
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-8 leading-relaxed">
                                We're so excited to have you here. Your new workspace is ready. Start by creating your very first note, or close this to explore the dashboard.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        onAction();
                                    }}
                                    className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-500 focus:outline-none transition-all active:scale-95 shadow-lg shadow-red-500/30"
                                >
                                    <Plus className="w-5 h-5 mr-2 -ml-1" />
                                    Create a Note
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none transition-all active:scale-95"
                                >
                                    Explore First
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
