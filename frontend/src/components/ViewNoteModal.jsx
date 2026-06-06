import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Edit2, KeyRound, Lock, ShieldOff, Trash2, User, Share2, Download, FileText, FileCode, FileType, ClipboardCopy } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants, dropdownVariants } from '../utils/motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preprocessLinks, markdownLinkComponents } from '../utils/markdownUtils.jsx';
import { exportAsMarkdown, exportAsHtml, exportAsPdf } from '../utils/exportNote.js';
import WordCount from './WordCount';

const ViewNoteModal = ({ isOpen, onClose, note, onTagClick, onEdit, onDelete, onRemoveShared, onShare, onCopy, onUnlock, onSetPassword, onRemovePassword, onCopyContent }) => {
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [unlockedNote, setUnlockedNote] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Close export menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setPassword('');
        setPasswordError('');
        setIsSubmittingPassword(false);
        setUnlockedNote(null);
        setShowExportMenu(false);
    }, [note?.id, isOpen]);

    const isLocked = note?.is_password_protected && !unlockedNote;
    const displayNote = unlockedNote || note;

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password.trim() || !onUnlock) return;

        setIsSubmittingPassword(true);
        setPasswordError('');
        try {
            const unlocked = await onUnlock(note, password);
            setUnlockedNote(unlocked);
            setPassword('');
        } catch (err) {
            setPasswordError(err?.response?.data?.detail || 'Incorrect password.');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <AnimatePresence>
            {isOpen && note && (
        <motion.div
            key="view-note-modal"
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={false}
        >
            <motion.div 
                className="fixed inset-0 bg-black/40"
                variants={modalBackdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <motion.div
                    className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl shadow-gray-900/20 dark:shadow-black/40 border border-gray-200 dark:border-gray-800"
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5 gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words tracking-tight">
                                {note.title}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <span>Last updated: {formatDate(note.updated_at)}</span>
                                <span className="text-gray-300 dark:text-gray-600 dark:text-gray-400" aria-hidden="true">|</span>
                                <WordCount note={displayNote} className="text-sm" />
                            </div>
                            
                            {note.isShared && note.ownerName && (
                                <div className="mt-2 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                    <User className="w-4 h-4 mr-1.5" />
                                    Shared by <span className="ml-1 text-gray-700 dark:text-gray-300">{note.ownerName}</span>
                                </div>
                            )}
                            
                            {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {note.tags.map(tag => (
                                        <button 
                                            key={tag.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                                if(onTagClick) onTagClick(tag.id);
                                            }}
                                            className={`text-sm px-3 py-1 rounded-full font-medium transition-[box-shadow,filter] hover:brightness-95 dark:hover:brightness-110 hover:shadow-sm ${tag.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                                        >                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 absolute sm:relative right-4 top-4 sm:right-auto sm:top-auto shrink-0">
                            {onCopyContent && !note.is_password_protected && (
                                <button
                                    onClick={() => onCopyContent(displayNote)}
                                    className="rounded-full p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                    title="Copy content to clipboard"
                                >
                                    <ClipboardCopy className="w-5 h-5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300" />
                                </button>
                            )}
                            {note.isShared && onCopy && !note.is_password_protected && (
                                <button
                                    onClick={() => onCopy(note)}
                                    className="rounded-full p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                    title="Copy to my notes"
                                >
                                    <Copy className="w-5 h-5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300" />
                                </button>
                            )}
                            {!note.isShared && onSetPassword && !note.is_password_protected && (
                                <button
                                    onClick={() => onSetPassword(note)}
                                    className="rounded-full p-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Add password protection"
                                >
                                    <KeyRound className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                                </button>
                            )}
                            {!note.isShared && onRemovePassword && note.is_password_protected && (
                                <button
                                    onClick={() => onRemovePassword(note)}
                                    className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Remove password protection"
                                >
                                    <ShieldOff className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                                </button>
                            )}
                            {!note.isShared && onShare && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onShare(note);
                                    }}
                                    className="rounded-full p-2 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                    title="Share note"
                                >
                                    <Share2 className="w-5 h-5 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300" />
                                </button>
                            )}
                            {!isLocked && (
                                <div className="relative" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setShowExportMenu(prev => !prev)}
                                        className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        title="Export note"
                                    >
                                        <Download className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                                    </button>
                                    <AnimatePresence>
                                    {showExportMenu && (
                                        <motion.div
                                            variants={dropdownVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="absolute right-0 top-full mt-1 z-50 w-44 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-black/30"
                                        >
                                            <button
                                                onClick={() => { exportAsMarkdown(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                Markdown
                                            </button>
                                            <button
                                                onClick={() => { exportAsHtml(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileCode className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                HTML
                                            </button>
                                            <button
                                                onClick={() => { exportAsPdf(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileType className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                PDF
                                            </button>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            )}
                            {!note.isShared && !isLocked && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onEdit) onEdit(displayNote);
                                    }}
                                    className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Edit note"
                                >
                                    <Edit2 className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (window.confirm(note.isShared ? 'Remove this shared note from your view?' : 'Are you sure you want to delete this note?')) {
                                        if (note.isShared && onRemoveShared) onRemoveShared();
                                        else if (onDelete) {
                                            onClose();
                                            onDelete(note.id);
                                        }
                                    }
                                }}
                                className="rounded-full p-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title={note.isShared ? "Remove shared note" : "Delete note"}
                            >
                                <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" />
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-8 sm:px-10 overflow-y-auto max-h-[60vh] sm:max-h-[70vh]">
                        {isLocked ? (
                            <form onSubmit={handleUnlock} className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-gray-50 dark:bg-gray-800/50 p-5 text-center">
                                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 shadow-sm">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Password protected</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Enter the note password to view its contents.
                                </p>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-4 w-full rounded-none border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    placeholder="Password"
                                    autoFocus
                                />
                                {passwordError && (
                                    <p className="mt-2 text-sm font-medium text-red-600">{passwordError}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={!password.trim() || isSubmittingPassword}
                                    className="mt-4 w-full rounded-none bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingPassword ? 'Unlocking...' : 'Unlock note'}
                                </button>
                            </form>
                        ) : (
                            <div className="prose prose-lg max-w-none text-gray-900 dark:text-gray-100 dark:prose-invert prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-500 dark:hover:prose-a:text-red-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownLinkComponents}>
                                    {preprocessLinks(displayNote.content)}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ViewNoteModal;
