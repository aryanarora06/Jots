import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Edit2, KeyRound, Lock, ShieldOff, Trash2, User, Share2, Download, FileText, FileCode, FileType, ClipboardCopy } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants, dropdownVariants, tapAnimation } from '../utils/motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preprocessContent, createMarkdownComponents } from '../utils/markdownUtils.jsx';
import { exportAsMarkdown, exportAsHtml, exportAsPdf } from '../utils/exportNote.js';
import WordCount from './WordCount';
import BacklinksPanel from './BacklinksPanel';

const ViewNoteModal = ({ isOpen, onClose, note, onTagClick, onEdit, onDelete, onRemoveShared, onShare, onCopy, onUnlock, onSetPassword, onRemovePassword, onCopyContent, onWikilinkClick }) => {
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
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
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
            className="fixed inset-0 z-[100] overflow-y-scroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
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
                <AnimatePresence mode="wait">
                    <motion.div
                        key={note.id}
                        className="relative w-full max-w-4xl transform overflow-hidden rounded-lg bg-white dark:bg-black shadow-2xl shadow-black/10 dark:shadow-black/60 border border-gray-200 dark:border-gray-800"
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
                                        <motion.button 
                                            whileTap={tapAnimation}
                                            key={tag.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                                if(onTagClick) onTagClick(tag.id);
                                            }}
                                            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent`}
                                        >
                                            {tag.name}
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                            {onCopyContent && !note.is_password_protected && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => onCopyContent(displayNote)}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Copy content to clipboard"
                                >
                                    <ClipboardCopy className="w-4 h-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" />
                                </motion.button>
                            )}
                            {note.isShared && onCopy && !note.is_password_protected && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => onCopy(note)}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Copy to my notes"
                                >
                                    <Copy className="w-4 h-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" />
                                </motion.button>
                            )}
                            {!note.isShared && onSetPassword && !note.is_password_protected && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => onSetPassword(note)}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Add password protection"
                                >
                                    <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" />
                                </motion.button>
                            )}
                            {!note.isShared && onRemovePassword && note.is_password_protected && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => onRemovePassword(note)}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Remove password protection"
                                >
                                    <ShieldOff className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" />
                                </motion.button>
                            )}
                            {!note.isShared && onShare && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => {
                                        onClose();
                                        onShare(note);
                                    }}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Share note"
                                >
                                    <Share2 className="w-4 h-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" />
                                </motion.button>
                            )}
                            {!isLocked && (
                                <div className="relative" ref={exportMenuRef}>
                                    <motion.button
                                        whileTap={tapAnimation}
                                        onClick={() => setShowExportMenu(prev => !prev)}
                                        className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        title="Export note"
                                    >
                                        <Download className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                                    </motion.button>
                                    <AnimatePresence>
                                    {showExportMenu && (
                                        <motion.div
                                            variants={dropdownVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="absolute right-0 top-full mt-1 z-50 w-44 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-lg"
                                        >
                                            <motion.button
                                                whileTap={tapAnimation}
                                                onClick={() => { exportAsMarkdown(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                Markdown
                                            </motion.button>
                                            <motion.button
                                                whileTap={tapAnimation}
                                                onClick={() => { exportAsHtml(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileCode className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                HTML
                                            </motion.button>
                                            <motion.button
                                                whileTap={tapAnimation}
                                                onClick={() => { exportAsPdf(displayNote); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <FileType className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                PDF
                                            </motion.button>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            )}
                            {!note.isShared && !isLocked && (
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => {
                                        onClose();
                                        if (onEdit) onEdit(displayNote);
                                    }}
                                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Edit note"
                                >
                                    <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" />
                                </motion.button>
                            )}
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={() => {
                                    if (window.confirm(note.isShared ? 'Remove this shared note from your view?' : 'Are you sure you want to delete this note?')) {
                                        if (note.isShared && onRemoveShared) onRemoveShared();
                                        else if (onDelete) {
                                            onClose();
                                            onDelete(note.id);
                                        }
                                    }
                                }}
                                className="rounded-md p-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title={note.isShared ? "Remove shared note" : "Delete note"}
                            >
                                <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                            </motion.button>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={onClose}
                                className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" />
                            </motion.button>
                        </div>
                    </div>

                    <div className="px-6 py-8 sm:px-10 overflow-y-auto max-h-[60vh] sm:max-h-[70vh]">
                        {isLocked ? (
                            <form onSubmit={handleUnlock} className="mx-auto max-w-md rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black p-5 text-center">
                                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-800">
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
                                    className="mt-4 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:focus:border-white"
                                    placeholder="Password"
                                    autoFocus
                                />
                                {passwordError && (
                                    <p className="mt-2 text-sm font-medium text-red-600">{passwordError}</p>
                                )}
                                <motion.button
                                    whileTap={tapAnimation}
                                    type="submit"
                                    disabled={!password.trim() || isSubmittingPassword}
                                    className="mt-4 w-full rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingPassword ? 'Unlocking...' : 'Unlock note'}
                                </motion.button>
                            </form>
                        ) : (
                            <>
                                <div className="prose prose-lg max-w-none text-gray-900 dark:text-gray-100 dark:prose-invert prose-a:text-black dark:prose-a:text-white hover:prose-a:text-gray-700 dark:hover:prose-a:text-gray-300">
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={createMarkdownComponents(onWikilinkClick)}>
                                        {preprocessContent(displayNote.content)}
                                    </ReactMarkdown>
                                </div>
                                
                                {/* Backlinks Panel */}
                                {!note.isShared && (
                                    <BacklinksPanel 
                                        noteId={note.id} 
                                        onNoteClick={(backlinkNoteId) => {
                                            if (onWikilinkClick) onWikilinkClick(null, backlinkNoteId);
                                        }} 
                                    />
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ViewNoteModal;
