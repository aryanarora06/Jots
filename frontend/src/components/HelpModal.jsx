import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, FileText, Link, Network, Share2, Search, Download, Smartphone } from 'lucide-react';
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
        <AnimatePresence>
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
                        className="absolute inset-0 bg-black/40 dark:bg-black/60"
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
                        <div className="px-6 pt-6 pb-2 text-center shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-black dark:text-white">
                                <HelpCircle className="h-6 w-6" />
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                How to use Jots
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 pt-2 overflow-y-auto text-left">
                            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        Capture your thoughts
                                    </h3>
                                    <p className="leading-relaxed">Click the <strong>+</strong> button to create a new note. You can write in rich text or Markdown, and add tags to keep your ideas organized.</p>
                                </div>
                                
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Link className="w-4 h-4 text-gray-400" />
                                        Connect your ideas
                                    </h3>
                                    <p className="leading-relaxed">Type <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-200 dark:border-gray-700">[[</code> inside any note to search and link to your other notes. This creates a powerful network of connected thoughts.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Network className="w-4 h-4 text-gray-400" />
                                        Explore the graph
                                    </h3>
                                    <p className="leading-relaxed">Switch to the <strong>Graph</strong> view to see a beautiful visual web of how all your notes are connected. Click on tags in the sidebar to filter the graph by topic.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Share2 className="w-4 h-4 text-gray-400" />
                                        Share securely
                                    </h3>
                                    <p className="leading-relaxed">Need to show someone a note? Click the share icon on any note card to generate a public, read-only link. You can even lock it with a password for extra security.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        Find anything instantly
                                    </h3>
                                    <p className="leading-relaxed">Use the search bar to instantly find notes by title or content. You can also click on tags in the sidebar to filter your view to specific topics.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Download className="w-4 h-4 text-gray-400" />
                                        Export your work
                                    </h3>
                                    <p className="leading-relaxed">Open any note and use the export menu to download your work as a Markdown file or a formatted PDF document.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-2">
                                        <Smartphone className="w-4 h-4 text-gray-400" />
                                        Install the app
                                    </h3>
                                    <p className="leading-relaxed">Jots is a Progressive Web App (PWA). You can install it directly to your home screen or desktop for a native experience and offline access.</p>
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
