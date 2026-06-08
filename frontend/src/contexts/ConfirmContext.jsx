import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDestructive: false,
        resolve: null,
    });

    const confirm = useCallback(({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false }) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                isDestructive,
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, [confirmState]);

    // Prevent body scroll when confirm is open (re-uses our global modal pattern)
    useEffect(() => {
        if (confirmState.isOpen) {
            document.documentElement.classList.add('modal-open');
        } else {
            document.documentElement.classList.remove('modal-open');
        }
        return () => {
            document.documentElement.classList.remove('modal-open');
        };
    }, [confirmState.isOpen]);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {confirmState.isOpen && (
                    <motion.div 
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/40 dark:bg-black/60"
                            onClick={handleCancel}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-full max-w-sm bg-white dark:bg-black rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800"
                        >
                            <div className="px-6 py-6 text-center">
                                <motion.button
                                    onClick={handleCancel}
                                    className="absolute top-4 right-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>

                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-black dark:text-white">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {confirmState.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {confirmState.message}
                                </p>

                                <div className="mt-6 flex gap-3">
                                    <motion.button
                                        onClick={handleCancel}
                                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        {confirmState.cancelText}
                                    </motion.button>
                                    <motion.button
                                        onClick={handleConfirm}
                                        className="flex-1 rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                                    >
                                        {confirmState.confirmText}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                        </motion.div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};
