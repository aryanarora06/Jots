import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download } from 'lucide-react';
import { slideUpVariants, tapAnimation, microSpring } from '../utils/motion';

import { useConfirm } from '../contexts/ConfirmContext';

const SelectionBar = ({ count, onDelete, onDownload, isShared }) => {
    const { confirm } = useConfirm();

    return (
        <AnimatePresence mode="wait">
            {count > 0 && (
                <motion.div
                    key="selection-bar"
                    variants={slideUpVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                >
                    <div className="flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-md bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-2xl shadow-black/10 dark:shadow-black/60">
                        <motion.span
                            key={count}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap mr-2"
                        >
                            {count} selected
                        </motion.span>
                        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                        <motion.button
                            onClick={onDownload}
                            whileTap={tapAnimation}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Download selected notes"
                        >
                            <Download className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={async () => {
                                const message = isShared
                                    ? `Remove ${count} shared note${count > 1 ? 's' : ''} from your view?`
                                    : `Are you sure you want to delete ${count} note${count > 1 ? 's' : ''}?`;
                                const isConfirmed = await confirm({
                                    title: isShared ? 'Remove Shared Notes' : 'Delete Selected Notes',
                                    message,
                                    confirmText: isShared ? 'Remove' : 'Delete',
                                    isDestructive: true
                                });
                                if (isConfirmed) {
                                    onDelete();
                                }
                            }}
                            whileTap={tapAnimation}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            title={isShared ? 'Remove selected notes' : 'Delete selected notes'}
                        >
                            <Trash2 className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SelectionBar;
