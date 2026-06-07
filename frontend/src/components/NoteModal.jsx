import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants, tapAnimation } from '../utils/motion';
import api from '../api';
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

    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const [cursorPos, setCursorPos] = useState(0);
    
    useEffect(() => {
        if (isOpen) {
            setIsDark(document.documentElement.classList.contains('dark'));
            setShowAutocomplete(false);
            setAutocompleteQuery('');
            
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!showAutocomplete) {
            setAutocompleteResults([]);
            return;
        }
        const fetchTitles = async () => {
            try {
                const res = await api.get(`/api/notes/titles/?q=${encodeURIComponent(autocompleteQuery)}`);
                setAutocompleteResults(res.data);
            } catch (err) {
                console.error('Failed to fetch note titles for autocomplete', err);
            }
        };
        const debounce = setTimeout(fetchTitles, 150);
        return () => clearTimeout(debounce);
    }, [showAutocomplete, autocompleteQuery]);

    const checkAutocomplete = (text, pos) => {
        const textUpToCursor = text.substring(0, pos);
        const match = textUpToCursor.match(/\[\[([^\]]*)$/);
        if (match) {
            setShowAutocomplete(true);
            setAutocompleteQuery(match[1]);
        } else {
            setShowAutocomplete(false);
        }
    };

    const handleContentChange = (val) => {
        const newVal = val ?? '';
        setContent(newVal);
        
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'TEXTAREA') {
            const pos = activeEl.selectionStart;
            setCursorPos(pos);
            checkAutocomplete(newVal, pos);
        }
    };

    const handleAutocompleteSelect = (selectedTitle) => {
        const textUpToCursor = content.substring(0, cursorPos);
        const textAfterCursor = content.substring(cursorPos);
        
        const match = textUpToCursor.match(/\[\[([^\]]*)$/);
        if (match) {
            const newTextUpToCursor = textUpToCursor.substring(0, match.index) + `[[${selectedTitle}]]`;
            setContent(newTextUpToCursor + textAfterCursor);
            setShowAutocomplete(false);
        }
    };

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
        <motion.div 
            key="note-modal" 
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

            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                <motion.div
                    className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl transform flex-col overflow-hidden rounded-lg bg-white dark:bg-black shadow-2xl border border-gray-200 dark:border-gray-800"
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            {note ? 'Edit Note' : 'Create New Note'}
                        </h3>
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={onClose}
                            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </motion.button>
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
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all text-sm font-semibold"
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
                                            className={`text-xs px-3 py-1 rounded-md transition-all font-medium border ${
                                                selectedTagIds.includes(tag.id) 
                                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white opacity-100' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-black dark:text-gray-400 dark:border-gray-800 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                    
                                    {!showNewTagInput ? (
                                        <motion.button
                                            whileTap={tapAnimation}
                                            type="button"
                                            onClick={() => setShowNewTagInput(true)}
                                            className="text-xs px-2 py-1 flex items-center text-gray-400 hover:text-black dark:hover:text-white transition-colors focus:outline-none"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add tag
                                        </motion.button>
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
                                            <motion.button
                                                whileTap={tapAnimation}
                                                type="button"
                                                onClick={handleCreateTag}
                                                className="h-full border-l border-gray-300 dark:border-gray-700 bg-black px-3 text-xs font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:outline-none"
                                            >
                                                Add
                                            </motion.button>
                                            </div>
                                            <motion.button
                                                whileTap={tapAnimation}
                                                type="button"
                                                onClick={() => { setShowNewTagInput(false); setNewTagName(''); }}
                                                className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <X className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden" data-color-mode={isDark ? 'dark' : 'light'}>
                                <MDEditor
                                    value={content}
                                    onChange={handleContentChange}
                                    textareaProps={{
                                        onKeyUp: (e) => {
                                            const pos = e.target.selectionStart;
                                            setCursorPos(pos);
                                            checkAutocomplete(content, pos);
                                        },
                                        onClick: (e) => {
                                            const pos = e.target.selectionStart;
                                            setCursorPos(pos);
                                            checkAutocomplete(content, pos);
                                        }
                                    }}
                                    height={300}
                                    preview="live"
                                    hideToolbar={false}
                                    previewOptions={{ remarkPlugins: [remarkGfm, remarkBreaks] }}
                                    visibleDragBar={true}
                                />
                                
                                <AnimatePresence>
                                    {showAutocomplete && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute z-50 left-4 right-4 bottom-8 max-h-48 overflow-y-auto bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md shadow-xl"
                                        >
                                            {autocompleteResults.length > 0 ? (
                                                <div className="p-1.5 flex flex-col gap-1">
                                                    {autocompleteResults.map(res => (
                                                        <motion.button
                                                            whileTap={tapAnimation}
                                                            key={res.id}
                                                            type="button"
                                                            onClick={() => handleAutocompleteSelect(res.title)}
                                                            className="text-left px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors flex items-center"
                                                        >
                                                            <span className="text-gray-400 dark:text-gray-500 mr-1 font-mono">[[</span>
                                                            {res.title}
                                                            <span className="text-gray-400 dark:text-gray-500 ml-1 font-mono">]]</span>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
                                                    No matching notes found. Keep typing to create a new link.
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="shrink-0 bg-gray-50 dark:bg-black px-5 py-3 sm:px-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                            <WordCount content={content} />
                            <div className="flex space-x-3">
                                <motion.button
                                    whileTap={tapAnimation}
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-md transition-colors"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileTap={tapAnimation}
                                    type="submit"
                                    className="group relative px-4 py-1.5 text-sm font-medium text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    {note ? 'Save Changes' : 'Create Note'}
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white dark:bg-white dark:text-black text-[10px] px-2 py-1 rounded-sm pointer-events-none whitespace-nowrap">
                                        Ctrl+S
                                    </span>
                                </motion.button>
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
