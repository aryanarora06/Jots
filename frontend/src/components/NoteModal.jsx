import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Tag as TagIcon, Image as ImageIcon } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants, tapAnimation } from '../utils/motion';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CreateLink,
  linkDialogPlugin,
  linkPlugin,
  ListsToggle,
  imagePlugin
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import WordCount from './WordCount';
import imageCompression from 'browser-image-compression';
import WikilinkAutocomplete from './WikilinkAutocomplete';

const NoteModal = ({ isOpen, onClose, onSave, note, availableTags = [], onCreateTag }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    const [isDark, setIsDark] = useState(false);
    
    const [showNewTagInput, setShowNewTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const formRef = useRef(null);
    const newTagInputRef = useRef(null);

    const toast = useToast();

    
    useEffect(() => {
        if (isOpen) {
            setIsDark(document.documentElement.classList.contains('dark'));
            
            // Prevent background scrolling
            document.documentElement.classList.add('modal-open');
        } else {
            document.documentElement.classList.remove('modal-open');
        }
        
        return () => {
            document.documentElement.classList.remove('modal-open');
        };
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
    const imageUploadHandler = async (image) => {
        try {
            const options = {
                maxSizeMB: 0.1, // 100 KB
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(image, options);
            const formData = new FormData();
            formData.append('image', compressedFile, compressedFile.name);
            
            const response = await api.post('/api/upload-image/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data.url;
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image. Please try again.');
            throw error;
        }
    };

    const handleCustomImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await imageUploadHandler(file);
        if (url && editorRef.current) {
            const currentContent = editorRef.current.getMarkdown();
            const newContent = currentContent.trimEnd() + `\n\n![Image](${url})\n`;
            editorRef.current.setMarkdown(newContent);
            setContent(newContent);
        }
        e.target.value = '';
    };

    const handleWikilinkSelect = (title, query) => {
        if (!editorRef.current) return;
        
        const currentMarkdown = editorRef.current.getMarkdown();
        let searchStr = `[[${query || ''}`;
        let lastIndex = currentMarkdown.lastIndexOf(searchStr);
        
        // MDXEditor sometimes escapes unmatched brackets in getMarkdown() as \[\[
        if (lastIndex === -1) {
            searchStr = `\\[\\[${query || ''}`;
            lastIndex = currentMarkdown.lastIndexOf(searchStr);
        }
        
        if (lastIndex !== -1) {
            const newMarkdown = currentMarkdown.slice(0, lastIndex) + `[[${title}]] ` + currentMarkdown.slice(lastIndex + searchStr.length);
            editorRef.current.setMarkdown(newMarkdown);
            setContent(newMarkdown);
            
            // Refocus the editor so user can continue typing
            setTimeout(() => {
                editorRef.current?.focus();
            }, 50);
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

            <div className="flex min-h-full items-center justify-center p-0 lg:p-4">
                <motion.div
                    className="relative flex h-[100dvh] lg:h-auto lg:max-h-[calc(100vh-2rem)] w-full max-w-2xl transform flex-col overflow-hidden lg:rounded-lg bg-white dark:bg-black lg:shadow-2xl lg:border border-gray-200 dark:border-gray-800"
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
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 lg:px-6">
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
                                            className={`text-xs px-3 h-7 flex items-center transition-all font-medium border ${
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
                                            className="h-7 text-xs px-2 flex items-center text-gray-400 hover:text-black dark:hover:text-white transition-colors focus:outline-none"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add tag
                                        </motion.button>
                                    ) : (
                                        <div className="flex items-center h-7">
                                            <div className="flex h-7 overflow-hidden border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
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

                            <div className="relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-black">
                                <MDXEditor
                                    key={note ? note.id : 'new'}
                                    ref={editorRef}
                                    markdown={note ? (note.content || '') : ''}
                                    onChange={(markdown) => setContent(markdown)}
                                    className={`min-h-[300px] ${isDark ? 'dark-theme dark-editor' : ''}`}
                                    contentEditableClassName="prose dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none"
                                    plugins={[
                                        headingsPlugin(),
                                        listsPlugin(),
                                        quotePlugin(),
                                        thematicBreakPlugin(),
                                        markdownShortcutPlugin(),
                                        linkPlugin(),
                                        linkDialogPlugin(),
                                        imagePlugin({ imageUploadHandler }),
                                        toolbarPlugin({
                                            toolbarContents: () => (
                                                <div className="flex flex-wrap gap-1 items-center p-1 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black w-full">
                                                    <UndoRedo />
                                                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
                                                    <BoldItalicUnderlineToggles />
                                                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
                                                    <CreateLink />
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded transition-colors"
                                                        title="Insert Image"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
                                                    <ListsToggle />
                                                </div>
                                            )
                                        })
                                    ]}
                                />
                                <WikilinkAutocomplete onSelect={handleWikilinkSelect} />
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleCustomImageUpload} 
                            />
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
