import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download } from 'lucide-react';
import { selectionBarVariants } from '../utils/motion';

const SelectionBar = ({ count, onDelete, onDownload, isShared }) => {
    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    key="selection-bar"
                    variants={selectionBarVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                >
                    <div className="flex items-center gap-1 pl-5 pr-2 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-300/40 dark:shadow-black/50">
                        <motion.span
                            key={count}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap mr-2"
                        >
                            {count} selected
                        </motion.span>
                        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                        <motion.button
                            onClick={onDownload}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            title="Download selected notes"
                        >
                            <Download className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            onClick={onDelete}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            title={isShared ? 'Remove selected notes' : 'Delete selected notes'}
                        >
                            <Trash2 className="w-5 h-5" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SelectionBar;
