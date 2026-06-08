import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link as LinkIcon, Trash2 } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants, tapAnimation } from '../utils/motion';
import api from '../api';
import { useConfirm } from '../contexts/ConfirmContext';

const ShareDialog = ({ isOpen, onClose, note }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const { confirm } = useConfirm();

    const fetchOrCreateShareLink = useCallback(async () => {
        if (!note) return;

        setIsLoading(true);
        setError('');
        try {
            const response = await api.post(`/api/notes/${note.id}/share/`);
            // response.data.url is e.g. /shared/{token}
            // we want the full absolute URL
            const fullUrl = `${window.location.origin}${response.data.url}`;
            setShareUrl(fullUrl);
        } catch (err) {
            console.error('Failed to get share link:', err);
            setError('Failed to generate share link.');
        } finally {
            setIsLoading(false);
        }
    }, [note]);

    useEffect(() => {
        if (isOpen && note) {
            fetchOrCreateShareLink();
        } else {
            setShareUrl('');
            setCopied(false);
            setError('');
        }
    }, [isOpen, note, fetchOrCreateShareLink]);

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

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const handleRevoke = async () => {
        const isConfirmed = await confirm({
            title: 'Revoke Share Link',
            message: 'Are you sure you want to revoke this share link? Anyone with the link will lose access.',
            confirmText: 'Revoke Link',
            isDestructive: true
        });
        if (!isConfirmed) return;
        
        setIsLoading(true);
        try {
            await api.delete(`/api/notes/${note.id}/share/`);
            onClose();
        } catch (err) {
            console.error('Failed to revoke share link:', err);
            setError('Failed to revoke link.');
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && note && (
        <motion.div 
            key="share-dialog" 
            className="fixed inset-0 z-[100] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
        >
            <motion.div 
                className="fixed inset-0 bg-black/40 dark:bg-black/60"
                variants={modalBackdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <motion.div
                    className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-black shadow-2xl shadow-black/10 dark:shadow-black/60 border border-gray-200 dark:border-gray-800"
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
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
                            <LinkIcon className="h-6 w-6" />
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Share Note
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-5">
                            Anyone with this link will be able to view a read-only version of this note.
                        </p>
                        
                        {error && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-md text-left">
                                {error}
                            </div>
                        )}

                        <div className="relative text-left">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl || 'Generating link...'}
                                onClick={(e) => e.target.select()}
                                className="block w-full pr-12 pl-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-gray-900 dark:text-white sm:text-sm focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                            />
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={handleCopy}
                                disabled={!shareUrl || isLoading}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title="Copy link"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-black dark:text-white animate-pop-in" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </motion.button>
                        </div>
                        
                        <div className="mt-6 flex gap-3">
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={onClose}
                                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={handleRevoke}
                                disabled={isLoading || !shareUrl}
                                className="flex-1 rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Revoke Link
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShareDialog;
