import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit2, Lock, Trash2, User, Share2, Files, ClipboardCopy, Check, Star, Download, KeyRound, ShieldOff, FileText, FileCode, FileType } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preprocessContent, createMarkdownComponents } from '../utils/markdownUtils.jsx';
import { exportAsMarkdown, exportAsHtml, exportAsPdf } from '../utils/exportNote.js';
import { dropdownVariants, tapAnimation, microSpring } from '../utils/motion';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import WordCount from './WordCount';

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const NoteCard = ({ note, onEdit, onDelete, onTagClick, onView, isShared, ownerName, onShare, onCopy, onDuplicate, onCopyContent, isSelected, onSelectToggle, hasSelection, onToggleFavourite, onSetPassword, onRemovePassword, onWikilinkClick }) => {
    const isLocked = note.is_password_protected;
    const [isVisible, setIsVisible] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const { confirm } = useConfirm();
    const toast = useToast();
    const cardRef = useRef(null);
    const exportMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
                setShowExportMenu(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showExportMenu) {
                e.stopPropagation();
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [showExportMenu]);

    // Lazy render markdown only when card is visible
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleView = useCallback(() => {
        if (onView) onView(note);
    }, [onView, note]);

    const handleTagClick = useCallback((tagId) => {
        if (onTagClick) onTagClick(tagId);
    }, [onTagClick]);

    const handleEdit = useCallback(() => {
        if (onEdit) onEdit(note);
    }, [onEdit, note]);

    const handleDelete = useCallback(async () => {
        const isConfirmed = await confirm({
            title: isShared ? 'Remove Shared Note' : 'Delete Note',
            message: isShared ? 'Remove this shared note from your view?' : 'Are you sure you want to delete this note?',
            confirmText: isShared ? 'Remove' : 'Delete',
            isDestructive: true
        });
        if (isConfirmed) {
            onDelete(note.id);
        }
    }, [isShared, onDelete, note.id, confirm]);

    const handleCopy = useCallback(() => {
        if (onCopy) onCopy(note);
    }, [onCopy, note]);

    const handleDuplicate = useCallback(() => {
        if (onDuplicate) onDuplicate(note);
    }, [onDuplicate, note]);

    const handleCopyContent = useCallback(() => {
        if (onCopyContent) onCopyContent(note);
    }, [onCopyContent, note]);

    const handleShare = useCallback(() => {
        if (onShare) onShare(note);
    }, [onShare, note]);

    const handleSelectToggle = useCallback((e) => {
        e.stopPropagation();
        if (onSelectToggle) onSelectToggle(note.id);
    }, [onSelectToggle, note.id]);

    return (
        <motion.div 
            ref={cardRef}
            onClick={handleView}
            whileHover={{ y: -2 }}
            whileTap={tapAnimation}
            className={`group relative bg-white dark:bg-black rounded-lg border overflow-hidden transition-colors flex flex-col h-[280px] cursor-pointer ${
                isSelected
                    ? 'border-black dark:border-white ring-1 ring-black dark:ring-white'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
        >
            {onSelectToggle && (
                <motion.button
                    onClick={handleSelectToggle}
                    whileTap={tapAnimation}
                    className={`absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200 ${
                        isSelected
                            ? 'border-black bg-black text-white dark:bg-white dark:border-white dark:text-black'
                            : `border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-transparent hover:border-gray-500 dark:hover:border-gray-400 ${
                                hasSelection ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                            }`
                    } ${isSelected ? 'opacity-100' : ''}`}
                    title={isSelected ? 'Deselect note' : 'Select note'}
                    aria-pressed={isSelected}
                >
                    <AnimatePresence mode="wait">
                        {isSelected && (
                            <motion.span
                                key="check"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={microSpring}
                            >
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            )}
            <div className="p-5 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex justify-between items-start mb-1 pr-7">
                    <div className="flex items-center flex-1 min-w-0">
                        {!isShared && (
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleFavourite) onToggleFavourite(note);
                                }}
                                className="p-1.5 -ml-1.5 mr-0.5 rounded-full focus:outline-none transition-transform active:scale-95 shrink-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                title={note.is_favourite ? "Remove from favourites" : "Add to favourites"}
                                aria-label="Toggle favourite"
                            >
                                <Star 
                                    className={`h-[18px] w-[18px] transition-colors ${
                                        note.is_favourite 
                                            ? 'fill-black text-black dark:fill-white dark:text-white' 
                                            : 'text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                                    }`} 
                                />
                            </motion.button>
                        )}
                        <h3 className="text-base font-semibold text-black dark:text-white line-clamp-1 tracking-tight">{note.title}</h3>
                    </div>
                </div>
                
                {isShared && ownerName && (
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                        <User className="w-3.5 h-3.5 mr-1" />
                        Shared by <span className="ml-1 text-gray-700 dark:text-gray-300">{ownerName}</span>
                    </div>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 -mx-1 px-1 py-1">
                        {note.tags.map(tag => (
                            <button 
                                key={tag.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTagClick(tag.id);
                                }}
                                className="text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent"
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                )}

                {isLocked ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <Lock className="h-4 w-4" />
                        Password protected
                    </div>
                ) : (
                    <div 
                        className="min-h-[5.75rem] text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none line-clamp-4 leading-relaxed"
                        onClick={(e) => {
                            if (e.target.tagName === 'A' || e.target.closest('a')) {
                                e.stopPropagation();
                            }
                        }}
                    >
                        {isVisible ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={createMarkdownComponents(onWikilinkClick)}>
                                {preprocessContent(note.content)}
                            </ReactMarkdown>
                        ) : null}
                    </div>
                )}
            </div>
            
            <div className="px-4 lg:px-5 py-3 lg:py-3.5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-2 gap-x-3 mt-auto overflow-visible">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {formatDate(note.updated_at)}
                    </div>
                    <span className="text-xs text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
                    <WordCount note={note} className="whitespace-nowrap" />
                </div>
                <div className="flex flex-wrap lg:flex-nowrap gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 w-full lg:w-auto justify-start lg:justify-end -ml-1.5 lg:ml-0">
                    {onCopyContent && !note.is_password_protected && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); handleCopyContent(); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Copy content to clipboard"
                        >
                            <ClipboardCopy className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {isShared && onCopy && !note.is_password_protected && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Copy to my notes"
                        >
                            <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {!isShared && onDuplicate && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Duplicate note"
                        >
                            <Files className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {!isShared && onShare && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Share note"
                        >
                            <Share2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {!isShared && onSetPassword && !note.is_password_protected && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); onSetPassword(note); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Add password protection"
                        >
                            <KeyRound className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {!isShared && onRemovePassword && note.is_password_protected && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); onRemovePassword(note); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Remove password protection"
                        >
                            <ShieldOff className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    {!isLocked && (
                        <div className="relative" ref={exportMenuRef}>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={(e) => { e.stopPropagation(); setShowExportMenu(prev => !prev); }}
                                className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                title="Export note"
                            >
                                <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                            </motion.button>
                            <AnimatePresence mode="wait">
                            {showExportMenu && (
                                <motion.div
                                    variants={dropdownVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="absolute right-0 bottom-full mb-1 z-50 w-44 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-lg"
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); exportAsMarkdown(note); setShowExportMenu(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        Markdown
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); exportAsHtml(note); setShowExportMenu(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FileCode className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        HTML
                                    </button>
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            try {
                                                exportAsPdf(note); 
                                            } catch(err) {
                                                toast.error(err.message);
                                            }
                                            setShowExportMenu(false); 
                                        }}
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
                    {!isShared && !isLocked && (
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                            className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Edit note"
                        >
                            <Edit2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={tapAnimation}
                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                        className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title={isShared ? "Remove shared note" : "Delete note"}
                    >
                        <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(NoteCard);
