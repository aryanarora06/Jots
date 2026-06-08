import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '../utils/motion';

const HelpModal = ({ isOpen, onClose }) => {
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black/40"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-md bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-black dark:text-white">How to use Jots</h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
                                <div>
                                    <h3 className="font-semibold text-black dark:text-white mb-2">Creating Notes</h3>
                                    <p>Click the big '+' button to create a new note. You can add titles, tags, and write your content in rich text or Markdown.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-black dark:text-white mb-2">Linking Notes</h3>
                                    <p>Type <code>[[</code> inside any note to bring up a list of your other notes. Selecting one creates a clickable backlink between them.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-black dark:text-white mb-2">Knowledge Graph</h3>
                                    <p>Click the "Graph" tab to see a visual web of all your notes and how they are connected via links and tags. You can also click on tags in the sidebar to filter the graph and isolate specific topics.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-black dark:text-white mb-2">Sharing & Passwords</h3>
                                    <p>Click the share icon on any note to generate a public link. You can toggle password protection to secure sensitive notes before sharing them. Anyone with the link will be prompted to enter the password before they can view your note.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default HelpModal;
