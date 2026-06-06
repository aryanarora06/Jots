import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit2, Lock, Trash2, User, Share2, Files, ClipboardCopy, Check, Star, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preprocessLinks, markdownLinkComponents } from '../utils/markdownUtils.jsx';
import WordCount from './WordCount';

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const NoteCard = ({ note, onEdit, onDelete, onTagClick, onView, isShared, ownerName, onShare, onCopy, onDuplicate, onCopyContent, isSelected, onSelectToggle, hasSelection, onToggleFavourite, onDownload }) => {
    const isLocked = note.is_password_protected;
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);

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

    const handleDelete = useCallback(() => {
        if (window.confirm(isShared ? 'Remove this shared note from your view?' : 'Are you sure you want to delete this note?')) {
            onDelete(note.id);
        }
    }, [isShared, onDelete, note.id]);

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
            whileHover={{ y: -3, transition: { duration: 0.22, ease: 'easeOut' } }}
            className={`group relative bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 flex flex-col h-[280px] cursor-pointer ${
                isSelected
                    ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/30'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
        >
            {onSelectToggle && (
                <motion.button
                    onClick={handleSelectToggle}
                    whileTap={{ scale: 0.85 }}
                    className={`absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                        isSelected
                            ? 'border-red-600 bg-white text-black dark:bg-red-600 dark:text-white'
                            : `border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/90 text-transparent hover:border-red-400 dark:hover:border-red-500 ${
                                hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`
                    } ${isSelected ? 'opacity-100' : ''}`}
                    title={isSelected ? 'Deselect note' : 'Select note'}
                    aria-pressed={isSelected}
                >
                    <AnimatePresence mode="wait">
                        {isSelected && (
                            <motion.span
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
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
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleFavourite) onToggleFavourite(note);
                                }}
                                className="mr-2 focus:outline-none transition-transform active:scale-95 shrink-0"
                                title={note.is_favourite ? "Remove from favourites" : "Add to favourites"}
                            >
                                <Star 
                                    className={`h-4 w-4 transition-colors ${
                                        note.is_favourite 
                                            ? 'fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500' 
                                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 dark:hover:text-yellow-500'
                                    }`} 
                                />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1 tracking-tight">{note.title}</h3>
                    </div>
                    {note.is_password_protected && (
                        <Lock className="ml-2 mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    )}
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
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-[box-shadow,filter] hover:brightness-95 dark:hover:brightness-110 hover:shadow-sm ${tag.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                            >                                {tag.name}
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
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownLinkComponents}>
                                {preprocessLinks(note.content)}
                            </ReactMarkdown>
                        ) : (
                            <div className="text-gray-400 dark:text-gray-500">Loading preview...</div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {formatDate(note.updated_at)}
                    </div>
                    <span className="text-xs text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
                    <WordCount note={note} />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isShared && onCopy && !note.is_password_protected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy();
                            }}
                            className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Copy to my notes"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {!isShared && onDuplicate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate();
                            }}
                            className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Duplicate note"
                        >
                            <Files className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onCopyContent && !note.is_password_protected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopyContent();
                            }}
                            className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Copy content to clipboard"
                        >
                            <ClipboardCopy className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {!isShared && onShare && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShare();
                            }}
                            className="p-1.5 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-colors"
                            title="Share note"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDownload && !note.is_password_protected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload();
                            }}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            title="Download markdown"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {!isShared && !isLocked && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                            }}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            title="Edit note"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title={isShared ? "Remove shared note" : "Delete note"}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(NoteCard);
