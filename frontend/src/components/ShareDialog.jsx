import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link as LinkIcon, Trash2 } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '../utils/motion';
import api from '../api';

const ShareDialog = ({ isOpen, onClose, note }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

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
        if (!window.confirm('Are you sure you want to revoke this share link? Anyone with the link will lose access.')) return;
        
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
        <motion.div key="share-dialog" className="fixed inset-0 z-50 overflow-y-auto">
            <motion.div 
                className="fixed inset-0 bg-black/40"
                variants={modalBackdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <motion.div
                    className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800"
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                                <LinkIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Note</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="px-6 py-6 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Anyone with this link will be able to view a read-only version of this note.
                        </p>
                        
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl || 'Generating link...'}
                                onClick={(e) => e.target.select()}
                                className="block w-full pr-12 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500 focus:outline-none transition-colors"
                            />
                            <button
                                onClick={handleCopy}
                                disabled={!shareUrl || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors active:scale-95"
                                title="Copy link"
                            >
                                {copied ? (
                                    <Check className="w-5 h-5 text-green-500 animate-pop-in" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        
                        <div className="pt-2">
                            <button
                                onClick={handleRevoke}
                                disabled={isLoading || !shareUrl}
                                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-100 dark:border-red-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Revoke Link
                            </button>
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
