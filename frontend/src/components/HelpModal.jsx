import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, FileText, Link, Network, Share2, Search, Download, Smartphone, Lock, WifiOff } from 'lucide-react';
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
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
                        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        variants={modalPanelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative w-full max-w-3xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-blue-500" />
                                Welcome to Jots
                            </h2>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                Jots is a fast, offline-first knowledge management tool designed to help you connect your thoughts. Here is a detailed guide on how to get the most out of every feature.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Feature 1 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        Capture & Organize
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Click the <strong>+</strong> button to create a new note. You can format your text using the rich text editor, drag-and-drop images directly into the content, and categorize your notes by creating and assigning multiple custom tags.
                                    </p>
                                </div>
                                
                                {/* Feature 2 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                                            <Link className="w-5 h-5" />
                                        </div>
                                        Wikilinks
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Type <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-200 dark:border-gray-700 text-purple-600 dark:text-purple-400">[[</code> while typing a note to open the link suggestion menu. Select another note to create a two-way connection. This is the foundation of building your interconnected personal wiki.
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                                            <Network className="w-5 h-5" />
                                        </div>
                                        Knowledge Graph
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Navigate to the <strong>Graph</strong> view to see a visual map of your thoughts. Every note is a node, and wikilinks are the lines connecting them. You can click nodes to navigate, and customize the visual layout physics using the settings icon.
                                    </p>
                                </div>

                                {/* Feature 4 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                                            <Share2 className="w-5 h-5" />
                                        </div>
                                        Secure Sharing
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Click the share icon on any note to generate a public link. Anyone with the link can view it in read-only mode, and even duplicate it into their own Jots account. You can revoke access at any time by un-sharing the note.
                                    </p>
                                </div>

                                {/* Feature 5 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        Password Protection
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Protect sensitive information by adding a 4-digit PIN to any note. Locked notes hide their content and cannot be searched, exported, or viewed until unlocked. This protection is enforced on both the frontend and backend.
                                    </p>
                                </div>

                                {/* Feature 6 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        Search & Filters
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Instantly find what you need using the global search bar (press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-xs">⌘/Ctrl + K</kbd>). You can combine text search with tag filters to drill down into specific contexts quickly.
                                    </p>
                                </div>

                                {/* Feature 7 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                                            <WifiOff className="w-5 h-5" />
                                        </div>
                                        Offline & PWA
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Jots works seamlessly without an internet connection! Changes are saved locally and synced automatically when you're back online. Click the <strong>Install App</strong> button in your browser to get a native desktop or mobile experience.
                                    </p>
                                </div>

                                {/* Feature 8 */}
                                <div className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <Download className="w-5 h-5" />
                                        </div>
                                        Export Options
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        You own your data. Use the bulk selection tool to download multiple notes at once, or export individual notes. You can export as raw Markdown files or beautifully formatted PDFs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HelpModal;
