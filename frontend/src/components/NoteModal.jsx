import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '../utils/motion';
import MDEditor from '@uiw/react-md-editor';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import WordCount from './WordCount';

const NoteModal = ({ isOpen, onClose, onSave, note, availableTags = [], onCreateTag }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    
    const [isDark, setIsDark] = useState(false);
    
    const [showNewTagInput, setShowNewTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const formRef = useRef(null);
    const newTagInputRef = useRef(null);
    
    useEffect(() => {
        if (isOpen) {
            setIsDark(document.documentElement.classList.contains('dark'));
        }
    }, [isOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            
            const isModifier = e.metaKey || e.ctrlKey;
            if (isModifier && e.key === 's') {
                e.preventDefault();
                if (formRef.current) {
                    if (formRef.current.requestSubmit) {
                        formRef.current.requestSubmit();
                    } else {
                        formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (note) {
            setTitle(note.title || '');
            setContent(note.content || '');
            setSelectedTagIds(note.tags ? note.tags.map(t => t.id) : []);
        } else {
            setTitle('');
            setContent('');
            setSelectedTagIds([]);
        }
        setShowNewTagInput(false);
        setNewTagName('');
    }, [note, isOpen]);

    useEffect(() => {
        if (showNewTagInput) {
            newTagInputRef.current?.focus();
        }
    }, [showNewTagInput]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ 
            title, 
            content,
            tag_ids: selectedTagIds
        });
    };

    const toggleTag = (tagId) => {
        if (selectedTagIds.includes(tagId)) {
            setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
        } else {
            setSelectedTagIds([...selectedTagIds, tagId]);
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        
        const newTag = await onCreateTag(newTagName.trim());
        if (newTag) {
            setSelectedTagIds([...selectedTagIds, newTag.id]);
            setNewTagName('');
            setShowNewTagInput(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
        <motion.div key="note-modal" className="fixed inset-0 z-[100] overflow-y-auto">
            <motion.div 
                className="fixed inset-0 bg-black/40"
                variants={modalBackdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                <motion.div
                    className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl transform flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl shadow-gray-900/20 dark:shadow-black/40 border border-gray-200 dark:border-gray-800"
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            {note ? 'Edit Note' : 'Create New Note'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                            <div>
                                <input
                                    type="text"
                                    id="title"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all text-sm font-semibold"
                                    placeholder="Note title..."
                                    autoFocus
                                />
                            </div>

                            {/* Tags Selection */}
                            <div className="flex flex-col space-y-2.5">
                                <div className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                    <TagIcon className="w-3.5 h-3.5 mr-1.5" /> Tags
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium border-4 ${
                                                selectedTagIds.includes(tag.id) 
                                                ? `${tag.color || 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'} border-current opacity-100` 
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-transparent opacity-80 hover:opacity-100'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                    
                                    {!showNewTagInput ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewTagInput(true)}
                                            className="text-xs px-2 py-1 flex items-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors focus:outline-none"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add tag
                                        </button>
                                    ) : (
                                        <div className="flex items-center">
                                            <div className="flex h-8 overflow-hidden rounded-md border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                            <input
                                                ref={newTagInputRef}
                                                type="text"
                                                value={newTagName}
                                                onChange={(e) => setNewTagName(e.target.value)}
                                                placeholder="Tag name"
                                                className="h-full w-28 border-0 bg-transparent px-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-white"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleCreateTag(e);
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateTag}
                                                className="h-full border-l border-red-500 bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-500 focus:outline-none"
                                            >
                                                Add
                                            </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setShowNewTagInput(false); setNewTagName(''); }}
                                                className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div data-color-mode={isDark ? 'dark' : 'light'} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                <MDEditor
                                    value={content}
                                    onChange={(val) => setContent(val ?? '')}
                                    height={300}
                                    preview="live"
                                    hideToolbar={false}
                                    previewOptions={{ remarkPlugins: [remarkGfm, remarkBreaks] }}
                                    visibleDragBar={true}
                                />
                            </div>
                        </div>

                        <div className="shrink-0 bg-gray-50 dark:bg-black px-5 py-3 sm:px-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                            <WordCount content={content} />
                            <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="group relative px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                            >
                                {note ? 'Save Changes' : 'Create Note'}
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                                    Ctrl+S
                                </span>
                            </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NoteModal;
