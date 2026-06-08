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

                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                How to use Jots
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 pt-2 overflow-y-auto text-left">
                            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        Capture your thoughts
                                    </h3>
                                    <p>Click <strong>+</strong> to write notes and add tags.</p>
                                </div>
                                
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Link className="w-4 h-4 text-gray-400" />
                                        Connect your ideas
                                    </h3>
                                    <p>Type <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-xs border border-gray-200 dark:border-gray-700">[[</code> to link to other notes.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Network className="w-4 h-4 text-gray-400" />
                                        Explore the graph
                                    </h3>
                                    <p>Use <strong>Graph</strong> view to visualize your note network.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Share2 className="w-4 h-4 text-gray-400" />
                                        Share securely
                                    </h3>
                                    <p>Generate public links, optionally locked with a password.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        Find instantly
                                    </h3>
                                    <p>Search titles and content or click tags to filter.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Download className="w-4 h-4 text-gray-400" />
                                        Export your work
                                    </h3>
                                    <p>Download any note as Markdown or PDF.</p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-black dark:text-white mb-0.5">
                                        <Smartphone className="w-4 h-4 text-gray-400" />
                                        Install the app
                                    </h3>
                                    <p>Install Jots for a native app experience.</p>
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
