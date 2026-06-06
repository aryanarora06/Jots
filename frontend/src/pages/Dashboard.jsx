import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import api from '../api';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import ViewNoteModal from '../components/ViewNoteModal';
import ShareDialog from '../components/ShareDialog';
import SelectionBar from '../components/SelectionBar';
import WelcomeModal from '../components/WelcomeModal';
import { exportAsMarkdown, exportAllAsZip } from '../utils/exportNote';
import { LogOut, Plus, Search, Book, Moon, Sun, Filter, X, ArrowUpDown, ChevronDown, Download } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants, tabContentVariants } from '../utils/motion';

const SORT_OPTIONS = [
    { value: 'recent', label: 'Most recent', shortLabel: 'Recent' },
    { value: 'oldest', label: 'Oldest', shortLabel: 'Oldest' },
    { value: 'alphabetical', label: 'Alphabetical', shortLabel: 'A-Z' },
];

const TAB_ORDER = { 'my-notes': 0, 'shared-with-me': 1 };
const REFLOW_FADE_MS = 120;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Dashboard = () => {
    const { logout } = useContext(AuthContext);
    const location = useLocation();
    
    // Theme state
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || 
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Welcome Popup state
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('showWelcomePopup') === 'true') {
            setShowWelcome(true);
            localStorage.removeItem('showWelcomePopup');
        }
    }, []);

    // Notes and Pagination state
    const [notes, setNotes] = useState([]);
    const [nextPage, setNextPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    
    // Tags state
    const [tags, setTags] = useState([]);
    const [sharedTags, setSharedTags] = useState([]);
    const [selectedTagFilters, setSelectedTagFilters] = useState([]);
    const [sortOrder, setSortOrder] = useState('recent');
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const sortMenuRef = useRef(null);
    const searchInputRef = useRef(null);

    // General state
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentNote, setCurrentNote] = useState(null);
    const [viewNote, setViewNote] = useState(null);
    const [shareNoteInfo, setShareNoteInfo] = useState(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('my-notes');
    const [tabDirection, setTabDirection] = useState(0);
    const [animateCardEntrance, setAnimateCardEntrance] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const tabAreaRef = useRef(null);
    const [sharedNotes, setSharedNotes] = useState([]);
    const [isLoadingShared, setIsLoadingShared] = useState(false);

    // Multi-select state
    const [selectedNoteIds, setSelectedNoteIds] = useState(() => new Set());
    const [reflowingNoteIds, setReflowingNoteIds] = useState(() => new Set());
    const [unstaggeredNoteIds, setUnstaggeredNoteIds] = useState(() => new Set());

    // Infinite scroll observer
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0,
    });

    // Handle initial tab routing from shared acceptance page
    useEffect(() => {
        if (location.state?.showShared) {
            setTabDirection(1);
            setAnimateCardEntrance(false);
            setActiveTab('shared-with-me');
            setSelectedNoteIds(new Set());
            // Clear state so a refresh doesn't force tab to shared
            window.history.replaceState({}, document.title)
        }
    }, [location]);

    // Handle Theme toggle
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
                setSortMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce search query
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);


    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isModifier = e.metaKey || e.ctrlKey;
            
            if (isModifier && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.altKey && e.key === 'n') {
                e.preventDefault();
                if (!isModalOpen && !viewNote && !shareNoteInfo) {
                    openCreateModal();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, viewNote, shareNoteInfo]);

    // Fetch notes function
    const fetchNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            selectedTagFilters.forEach(tagId => params.append('tag', tagId));
            if (debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery.trim());
            const ordering = sortOrder === 'oldest' ? 'created_at' : sortOrder === 'alphabetical' ? 'title' : '-updated_at';
            params.append('ordering', ordering);
            
            const response = await api.get(`/api/notes/?${params.toString()}`);
            if (response.data.results) {
                setNotes(response.data.results);
                setNextPage(response.data.next);
            } else {
                setNotes(response.data);
                setNextPage(null);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
            setError('Failed to load notes. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTagFilters, debouncedSearchQuery, sortOrder]);

    // Fetch shared notes function
    const fetchSharedNotes = useCallback(async () => {
        try {
            setIsLoadingShared(true);
            const params = new URLSearchParams();
            if (debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery.trim());
            const query = params.toString();
            const response = await api.get(`/api/notes/shared-with-me/${query ? `?${query}` : ''}`);
            const sharedNotesData = response.data.results || response.data;
            setSharedNotes(sharedNotesData);

            // Extract tags from shared notes
            const allSharedTags = new Map();
            sharedNotesData.forEach(sharedNote => {
                const note = sharedNote.note;
                if (note.tags && note.tags.length > 0) {
                    note.tags.forEach(tag => {
                        if (!allSharedTags.has(tag.id)) {
                            allSharedTags.set(tag.id, tag);
                        }
                    });
                }
            });
            setSharedTags(Array.from(allSharedTags.values()));

            setError(null);
        } catch (err) {
            console.error('Failed to fetch shared notes:', err);
            setError('Failed to load shared notes.');
        } finally {
            setIsLoadingShared(false);
        }
    }, [debouncedSearchQuery]);

    // Initial tags fetch
    const fetchTags = useCallback(async () => {
        try {
            const tagsRes = await api.get('/api/tags/');
            setTags(tagsRes.data.results || tagsRes.data);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    }, []);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    // Fetch notes on filter change or initial load
    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Fetch shared notes when tab changes
    useEffect(() => {
        if (activeTab === 'shared-with-me') {
            fetchSharedNotes();
        }
    }, [activeTab, fetchSharedNotes]);

    useEffect(() => {
        setSelectedTagFilters([]);
    }, [activeTab]);

    // Fetch next page on scroll
    const fetchNextPage = useCallback(async () => {
        if (!nextPage || isFetchingNextPage || activeTab !== 'my-notes') return;
        
        try {
            setIsFetchingNextPage(true);
            const response = await api.get(nextPage);
            setNotes(prev => [...prev, ...response.data.results]);
            setNextPage(response.data.next);
        } catch (err) {
            console.error('Failed to fetch next page:', err);
        } finally {
            setIsFetchingNextPage(false);
        }
    }, [nextPage, isFetchingNextPage, activeTab]);

    useEffect(() => {
        if (inView) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage]);

    const sortNoteList = (noteList) => {
        return [...noteList].sort((a, b) => {
            if (a.is_favourite && !b.is_favourite) return -1;
            if (!a.is_favourite && b.is_favourite) return 1;

            if (sortOrder === 'oldest') {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            if (sortOrder === 'alphabetical') {
                return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            }
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
    };

    const filteredNotes = sortNoteList(notes);
    const sortedSharedNotes = [...sharedNotes].sort((a, b) => {
        const noteA = a.note;
        const noteB = b.note;

        if (sortOrder === 'oldest') {
            return new Date(noteA.created_at) - new Date(noteB.created_at);
        }
        if (sortOrder === 'alphabetical') {
            return noteA.title.localeCompare(noteB.title, undefined, { sensitivity: 'base' });
        }
        return new Date(noteB.updated_at) - new Date(noteA.updated_at);
    });
    const filteredSharedNotes = selectedTagFilters.length > 0
        ? sortedSharedNotes.filter(sharedNote => (
            selectedTagFilters.every(tagId => (
                sharedNote.note.tags?.some(tag => tag.id === tagId)
            ))
        ))
        : sortedSharedNotes;

    const updateOwnedNote = (updatedNote) => {
        setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
        setViewNote(prev => prev && prev.id === updatedNote.id ? updatedNote : prev);
    };

    const lockTabAreaHeight = () => {
        if (tabAreaRef.current) {
            tabAreaRef.current.style.minHeight = `${tabAreaRef.current.offsetHeight}px`;
        }
    };

    const unlockTabAreaHeight = () => {
        if (tabAreaRef.current) {
            tabAreaRef.current.style.minHeight = '';
        }
    };

    const switchTab = (tab) => {
        if (tab === activeTab) return;
        lockTabAreaHeight();
        setTabDirection(TAB_ORDER[tab] > TAB_ORDER[activeTab] ? 1 : -1);
        setAnimateCardEntrance(false);
        setActiveTab(tab);
        setSelectedNoteIds(new Set());
    };

    const toggleNoteSelection = useCallback((id) => {
        setSelectedNoteIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const getIdsAfterDeletedNote = (noteList, deletedId, getId = note => note.id) => {
        const deletedIndex = noteList.findIndex(note => getId(note) === deletedId);
        if (deletedIndex < 0) return [];
        return noteList.slice(deletedIndex + 1).map(getId);
    };

    const handleBulkDelete = async () => {
        const count = selectedNoteIds.size;
        if (count === 0) return;

        const isShared = activeTab === 'shared-with-me';
        const message = isShared
            ? `Remove ${count} shared note${count > 1 ? 's' : ''} from your view?`
            : `Are you sure you want to delete ${count} note${count > 1 ? 's' : ''}?`;
        if (!window.confirm(message)) return;

        const ids = [...selectedNoteIds];
        try {
            if (isShared) {
                await Promise.all(ids.map(id => api.delete(`/api/notes/shared-with-me/${id}/`)));
                setSharedNotes(prev => prev.filter(sn => !ids.includes(sn.note.id)));
            } else {
                await Promise.all(ids.map(id => api.delete(`/api/notes/${id}/`)));
                setNotes(prev => prev.filter(n => !ids.includes(n.id)));
            }
            setSelectedNoteIds(new Set());
        } catch (err) {
            console.error('Failed to delete notes:', err);
            alert('Failed to delete some notes.');
        }
    };

    const handleBulkDownload = () => {
        const isShared = activeTab === 'shared-with-me';
        const notesToExport = isShared
            ? filteredSharedNotes.filter(sn => selectedNoteIds.has(sn.note.id)).map(sn => sn.note)
            : filteredNotes.filter(n => selectedNoteIds.has(n.id));

        const exportable = notesToExport.filter(n => !n.is_password_protected);
        const skipped = notesToExport.length - exportable.length;

        exportable.forEach((note, i) => {
            setTimeout(() => exportAsMarkdown(note), i * 200);
        });

        if (skipped > 0) {
            alert(`${skipped} password-protected note${skipped > 1 ? 's were' : ' was'} skipped.`);
        }
    };

    // CRUD Handlers
    const handleCreateEditNote = async (noteData) => {
        try {
            if (currentNote) {
                const response = await api.patch(`/api/notes/${currentNote.id}/`, noteData);
                setNotes(notes.map(n => n.id === currentNote.id ? response.data : n));
            } else {
                const response = await api.post('/api/notes/', noteData);
                setNotes([response.data, ...notes]);
            }
            setIsModalOpen(false);
            setCurrentNote(null);
        } catch (err) {
            console.error('Failed to save note:', err);
            alert('Failed to save note. Please check your inputs.');
        }
    };

    const handleDeleteNote = async (id) => {
        const affectedIds = getIdsAfterDeletedNote(filteredNotes, id);
        const fadingIds = [id, ...affectedIds];
        try {
            if (fadingIds.length > 0) {
                setReflowingNoteIds(new Set(fadingIds));
                await wait(REFLOW_FADE_MS);
            }
            await api.delete(`/api/notes/${id}/`);
            setNotes(notes.filter(n => n.id !== id));
            if (affectedIds.length > 0) {
                setUnstaggeredNoteIds(new Set(affectedIds));
                setTimeout(() => {
                    setReflowingNoteIds(new Set());
                    setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                }, REFLOW_FADE_MS);
            }
            setSelectedNoteIds(prev => {
                if (!prev.has(id)) return prev;
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to delete note:', err);
            alert('Failed to delete note.');
        }
    };

    const handleDuplicateNote = async (note) => {
        try {
            const response = await api.post('/api/notes/', {
                title: `${note.title} (copy)`,
                content: note.content,
                tag_ids: note.tags ? note.tags.map(t => t.id) : []
            });
            setNotes(prev => [response.data, ...prev]);
        } catch (err) {
            console.error('Failed to duplicate note:', err);
            alert('Failed to duplicate note.');
        }
    };

    const handleCopyContent = async (note) => {
        try {
            await navigator.clipboard.writeText(note.content);
            alert('Content copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy content:', err);
            alert('Failed to copy content to clipboard.');
        }
    };

    const handleToggleFavourite = async (note) => {
        try {
            const response = await api.patch(`/api/notes/${note.id}/`, {
                is_favourite: !note.is_favourite
            });
            updateOwnedNote(response.data);
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Failed to toggle favourite:', err);
            alert('Failed to update favourite status.');
        }
    };

    const handleRemoveSharedNote = async (id) => {
        const affectedIds = getIdsAfterDeletedNote(filteredSharedNotes, id, sharedNote => sharedNote.note.id);
        const fadingIds = [id, ...affectedIds];
        try {
            if (fadingIds.length > 0) {
                setReflowingNoteIds(new Set(fadingIds));
                await wait(REFLOW_FADE_MS);
            }
            await api.delete(`/api/notes/shared-with-me/${id}/`);
            setSharedNotes(sharedNotes.filter(sn => sn.note.id !== id));
            if (affectedIds.length > 0) {
                setUnstaggeredNoteIds(new Set(affectedIds));
                setTimeout(() => {
                    setReflowingNoteIds(new Set());
                    setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                }, REFLOW_FADE_MS);
            }
            setSelectedNoteIds(prev => {
                if (!prev.has(id)) return prev;
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to remove shared note:', err);
            alert('Failed to remove note.');
        }
    };

    const handleCopySharedNote = async (note) => {
        if (note.is_password_protected) {
            alert('Password protected notes cannot be copied.');
            return;
        }

        try {
            const response = await api.post(`/api/notes/shared-with-me/${note.id}/copy/`);
            setNotes(prev => [response.data, ...prev.filter(n => n.id !== response.data.id)]);

            // Merge tags from the copied note into user's personal tags
            if (note.tags && note.tags.length > 0) {
                setTags(prevTags => {
                    const newTags = note.tags.filter(noteTag =>
                        !prevTags.some(existingTag => existingTag.id === noteTag.id)
                    );
                    return [...prevTags, ...newTags];
                });
            }

            await fetchTags();
            setViewNote(null);
            setActiveTab('my-notes');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Failed to copy shared note:', err);
            alert('Failed to copy note.');
        }
    };

    const handleUnlockNote = async (note, password) => {
        const endpoint = note.isShared
            ? `/api/notes/shared-with-me/${note.id}/unlock/`
            : `/api/notes/${note.id}/unlock/`;
        const response = await api.post(endpoint, { password });
        return response.data;
    };

    const handleSetNotePassword = async (note) => {
        const password = window.prompt('Enter a password for this note:');
        if (password === null) return;
        if (password.trim().length < 4) {
            alert('Password must be at least 4 characters.');
            return;
        }

        try {
            const response = await api.post(`/api/notes/${note.id}/password/`, { password });
            updateOwnedNote(response.data);
        } catch (err) {
            console.error('Failed to add password protection:', err);
            alert(err.response?.data?.detail || 'Failed to add password protection.');
        }
    };

    const handleRemoveNotePassword = async (note) => {
        const password = window.prompt('Enter the note password to remove protection:');
        if (password === null) return;

        try {
            const response = await api.delete(`/api/notes/${note.id}/password/`, { data: { password } });
            updateOwnedNote(response.data);
        } catch (err) {
            console.error('Failed to remove password protection:', err);
            alert(err.response?.data?.detail || 'Failed to remove password protection.');
        }
    };

    const handleDeleteTag = async (id, event) => {
        event.stopPropagation();

        // Check if this is a shared tag (in shared-with-me tab)
        if (activeTab === 'shared-with-me') {
            // Check if any shared note has this tag
            const hasSharedNoteWithTag = sharedNotes.some(sharedNote => {
                const note = sharedNote.note;
                return note.tags && note.tags.some(tag => tag.id === id);
            });

            if (hasSharedNoteWithTag) {
                alert('Tags from shared notes cannot be deleted.');
                return;
            }

            // If no shared notes have this tag, remove it from sharedTags
            setSharedTags(prev => prev.filter(tag => tag.id !== id));
            setSelectedTagFilters(prev => prev.filter(tid => tid !== id));
            return;
        }

        // Normal tag deletion for my notes
        if (!window.confirm('Are you sure you want to delete this tag? It will be removed from all your notes.')) return;

        try {
            await api.delete(`/api/tags/${id}/`);
            setTags(tags.filter(t => t.id !== id));
            setSelectedTagFilters(prev => prev.filter(tid => tid !== id));
            fetchNotes();
        } catch (err) {
            console.error('Failed to delete tag:', err);
            alert('Failed to delete tag.');
        }
    };

    const toggleTagFilter = (tagId) => {
        setSelectedTagFilters(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
        setRefreshKey(prev => prev + 1);
    };

    const handleCreateTag = async (tagName) => {
        try {
            const availableColors = [
                'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
                'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200',
                'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200',
                'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-200',
                'bg-stone-100 text-stone-800 dark:bg-stone-900/50 dark:text-stone-200',
                'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
                'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
                'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
                'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200',
                'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
                'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
                'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
                'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
                'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
                'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
                'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
                'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200',
                'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
                'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
            ];
            
            const usedColors = new Set(tags.map(t => t.color));
            const unusedColors = availableColors.filter(c => !usedColors.has(c));
            
            const colorToUse = unusedColors.length > 0 
                ? unusedColors[Math.floor(Math.random() * unusedColors.length)]
                : availableColors[Math.floor(Math.random() * availableColors.length)];
                
            const response = await api.post('/api/tags/', {
                name: tagName,
                color: colorToUse
            });
            setTags([...tags, response.data]);
            return response.data;
        } catch (err) {
            console.error('Failed to create tag:', err);
            if (err.response?.data?.non_field_errors) {
                alert(err.response.data.non_field_errors[0]); // e.g. duplicate tag
            } else {
                alert('Failed to create tag.');
            }
            return null;
        }
    };

    function openCreateModal() {
        setCurrentNote(null);
        setIsModalOpen(true);
    };

    const openEditModal = (note) => {
        setCurrentNote(note);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-200 flex flex-col font-sans">
            {/* Navbar */}
            <header className="bg-gray-50 dark:bg-black sticky top-0 z-[60] transition-colors duration-200 py-3 animate-fade-in-up" style={{animationDelay: '100ms'}}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 sm:gap-3 h-14 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 px-3 sm:px-4">
                        <button 
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedTagFilters([]);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="shrink-0 flex items-center hover:opacity-80 transition-opacity focus:outline-none active:scale-95 transition-transform"
                        >
                            <span 
                                className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-500 tracking-tighter"
                            >
                                Jots
                            </span>
                        </button>
                        
                        <div className="min-w-0 flex-1 px-2 sm:px-4">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-5 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    spellCheck="false"
                                    className="block w-full pl-9 sm:pl-11 pr-12 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-colors sm:text-sm"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none hidden sm:flex">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">Ctrl K</span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center space-x-0.5 sm:space-x-3">
                            <button
                                onClick={() => exportAllAsZip(notes, sharedNotes)}
                                className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors active:scale-95"
                                title="Download all notes as ZIP"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors active:scale-95"
                            >
                                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={logout}
                                className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors sm:flex sm:items-center sm:px-3 active:scale-95"
                            >
                                <LogOut className="h-5 w-5 sm:mr-2" />
                                <span className="hidden sm:inline text-sm font-medium">Sign out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-28">
                
                <div className="fixed left-0 right-0 top-[4.75rem] z-50 mx-auto flex min-h-[6rem] max-w-7xl min-w-0 flex-col gap-1 overflow-visible bg-gray-50/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 dark:bg-black/95 dark:supports-[backdrop-filter]:bg-black/80 sm:h-14 sm:min-h-14 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-3 sm:px-6 lg:px-8">
                    <div className="flex shrink-0 items-center space-x-5 border-b border-gray-200 dark:border-gray-800 pb-1 sm:border-b-0 sm:pb-0 sm:self-center">
                        <button
                            onClick={() => switchTab('my-notes')}
                            className={`whitespace-nowrap text-base sm:text-lg font-bold tracking-tight transition-colors ${activeTab === 'my-notes' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        >
                            My Notes
                        </button>
                        <button
                            onClick={() => switchTab('shared-with-me')}
                            className={`whitespace-nowrap text-base sm:text-lg font-bold tracking-tight transition-colors ${activeTab === 'shared-with-me' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        >
                            Shared with me
                        </button>
                    </div>

                    <div className="hidden sm:block w-px self-stretch shrink-0 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex min-w-0 w-full flex-nowrap items-center gap-2 sm:h-10 sm:gap-3 sm:flex-1"
                        >
                    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar self-center">
                        <div className="flex h-10 flex-nowrap items-center space-x-2 pl-0.5">
                            <Filter className="w-4 h-4 shrink-0 text-gray-400" />
                            <button
                                onClick={() => {
                                    setSelectedTagFilters([]);
                                    setRefreshKey(prev => prev + 1);
                                }}
                                className={`text-sm font-medium whitespace-nowrap px-3.5 py-1.5 rounded-full transition-colors border-2 ${
                                    selectedTagFilters.length === 0
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white'
                                    : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                            >
                                All
                            </button>
                            {(activeTab === 'my-notes' ? tags : sharedTags).map(tag => (
                                <div key={tag.id} className="relative group inline-flex h-10 shrink-0 items-center">
                                    <button
                                        onClick={() => toggleTagFilter(tag.id)}
                                        className={`text-sm font-medium whitespace-nowrap pl-3.5 pr-8 py-1.5 rounded-full transition-colors border-2 ${
                                            tag.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        } ${
                                                selectedTagFilters.includes(tag.id)
                                                ? 'border-current opacity-100'
                                                : 'border-transparent opacity-80 hover:opacity-100'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTag(tag.id, e)}
                                        className="absolute right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors bg-black/5 dark:bg-white/10 group-hover:bg-black/10 dark:group-hover:bg-white/20"
                                        title="Delete tag"
                                    >
                                        <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-current" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-px self-stretch shrink-0 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />

                    <div className={`relative shrink-0 self-center ${activeTab === 'shared-with-me' ? 'ml-auto' : ''}`} ref={sortMenuRef}>
                        <button
                            type="button"
                            onClick={() => setSortMenuOpen((open) => !open)}
                            className="h-9 w-[6.25rem] overflow-hidden rounded-[1.125rem] border border-gray-200 bg-white pl-9 pr-7 text-center text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus:border-red-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-800 sm:w-[9.75rem] sm:pr-8"
                            aria-label="Sort notes"
                            aria-expanded={sortMenuOpen}
                            aria-haspopup="listbox"
                        >
                            <span className="block truncate">
                                <span className="sm:hidden">
                                    {SORT_OPTIONS.find((o) => o.value === sortOrder)?.shortLabel}
                                </span>
                                <span className="hidden sm:inline">
                                    {SORT_OPTIONS.find((o) => o.value === sortOrder)?.label}
                                </span>
                            </span>
                        </button>
                        <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500 dark:text-red-400" />
                        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
                        {sortMenuOpen && (
                            <div
                                className="absolute right-0 top-[calc(100%+0.25rem)] z-40 w-[9.75rem] overflow-hidden rounded-[1.125rem] border border-gray-200 bg-white shadow-sm shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20"
                                role="listbox"
                                aria-label="Sort options"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={sortOrder === option.value}
                                        onClick={() => {
                                            if (sortOrder !== option.value) {
                                                setSortOrder(option.value);
                                                setRefreshKey(prev => prev + 1);
                                            }
                                            setSortMenuOpen(false);
                                        }}
                                        className={`block w-full px-3 py-2 text-center text-sm font-medium transition-colors ${
                                            sortOrder === option.value
                                                ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeTab === 'my-notes' && (
                        <button
                            onClick={openCreateModal}
                            className="shrink-0 self-center inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-500 focus:outline-none transition-all active:scale-95 sm:px-4 group relative"
                        >
                            <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                            New Note
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                                Alt+N
                            </div>
                        </button>
                    )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl animate-fade-in-up">
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                <div ref={tabAreaRef} className="relative overflow-x-hidden">
                <AnimatePresence initial={false} mode="wait" custom={tabDirection}>
                    {activeTab === 'my-notes' && (
                        <motion.div
                            key={`my-notes-${refreshKey}`}
                            custom={tabDirection}
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onAnimationComplete={(definition) => {
                                if (definition === 'animate') unlockTabAreaHeight();
                            }}
                        >
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 dark:border-red-500"></div>
                                </div>
                            ) : filteredNotes.length > 0 ? (
                                <>
                                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
                                        <AnimatePresence mode="popLayout">
                                            {filteredNotes.map((note, idx) => (
                                                <motion.div
                                                    key={note.id}
                                                    variants={cardVariants}
                                                    initial={animateCardEntrance ? 'initial' : false}
                                                    animate={
                                                        reflowingNoteIds.has(note.id)
                                                            ? { opacity: 0, transition: { duration: REFLOW_FADE_MS / 1000, ease: 'easeIn' } }
                                                            : 'animate'
                                                    }
                                                    exit="exit"
                                                    custom={unstaggeredNoteIds.has(note.id) ? { delay: false } : idx}
                                                >
                                                    <NoteCard 
                                                        note={note} 
                                                        onEdit={openEditModal}
                                                        onDelete={handleDeleteNote}
                                                        onTagClick={toggleTagFilter}
                                                        onView={(note) => setViewNote(note)}
                                                        onShare={(note) => setShareNoteInfo(note)}
                                                        onDuplicate={handleDuplicateNote}
                                                        onCopyContent={handleCopyContent}
                                                        onToggleFavourite={handleToggleFavourite}
                                                        isSelected={selectedNoteIds.has(note.id)}
                                                        onSelectToggle={toggleNoteSelection}
                                                        hasSelection={selectedNoteIds.size > 0}
                                                    />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </motion.div>
                                    
                                    {nextPage && (
                                        <div ref={loadMoreRef} className="flex justify-center mt-12 py-4">
                                            {isFetchingNextPage ? (
                                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600 dark:border-red-500"></div>
                                            ) : (
                                                <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">Scroll for more...</span>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <motion.div
                                    initial={animateCardEntrance ? { opacity: 0 } : false}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.25 }}
                                    className="text-center py-24 px-6"
                                >
                                    <Book className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No notes found</h3>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                                        {(searchQuery || selectedTagFilters.length > 0) ? "We couldn't find anything matching your filters." : "Get started by creating your first note."}
                                    </p>
                                    {!(searchQuery || selectedTagFilters.length > 0) && (
                                        <div className="mt-8">
                                            <button
                                                onClick={openCreateModal}
                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none transition-all active:scale-95"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                New Note
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'shared-with-me' && (
                        <motion.div
                            key={`shared-with-me-${refreshKey}`}
                            custom={tabDirection}
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onAnimationComplete={(definition) => {
                                if (definition === 'animate') unlockTabAreaHeight();
                            }}
                        >
                            {isLoadingShared ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 dark:border-red-500"></div>
                                </div>
                            ) : filteredSharedNotes.length > 0 ? (
                                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
                                    <AnimatePresence mode="popLayout">
                                        {filteredSharedNotes.map((sn, idx) => (
                                            <motion.div
                                                key={sn.note.id}
                                                variants={cardVariants}
                                                initial={animateCardEntrance ? 'initial' : false}
                                                animate={
                                                    reflowingNoteIds.has(sn.note.id)
                                                        ? { opacity: 0, transition: { duration: REFLOW_FADE_MS / 1000, ease: 'easeIn' } }
                                                        : 'animate'
                                                }
                                                exit="exit"
                                                custom={unstaggeredNoteIds.has(sn.note.id) ? { delay: false } : idx}
                                            >
                                                <NoteCard 
                                                    note={sn.note} 
                                                    isShared={true}
                                                    ownerName={sn.owner_username}
                                                    onDelete={() => handleRemoveSharedNote(sn.note.id)}
                                                    onCopy={handleCopySharedNote}
                                                    onTagClick={toggleTagFilter}
                                                    onView={(note) => setViewNote({...note, isShared: true, ownerName: sn.owner_username})}
                                                    isSelected={selectedNoteIds.has(sn.note.id)}
                                                    onSelectToggle={toggleNoteSelection}
                                                    hasSelection={selectedNoteIds.size > 0}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={animateCardEntrance ? { opacity: 0 } : false}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.25 }}
                                    className="text-center py-24 px-6"
                                >
                                    <Book className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No shared notes</h3>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                                        {(searchQuery.trim() || selectedTagFilters.length > 0)
                                            ? "We couldn't find anything matching your filters."
                                            : 'Notes that others share with you will appear here.'}
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>

            </main>

            <NoteModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateEditNote}
                note={currentNote}
                availableTags={tags}
                onCreateTag={handleCreateTag}
            />

            <ViewNoteModal
                isOpen={!!viewNote}
                onClose={() => setViewNote(null)}
                note={viewNote}
                onTagClick={toggleTagFilter}
                onEdit={openEditModal}
                onDelete={handleDeleteNote}
                onShare={(note) => setShareNoteInfo(note)}
                onCopy={handleCopySharedNote}
                onCopyContent={handleCopyContent}
                onUnlock={handleUnlockNote}
                onSetPassword={handleSetNotePassword}
                onRemovePassword={handleRemoveNotePassword}
                onRemoveShared={() => {
                    handleRemoveSharedNote(viewNote.id);
                    setViewNote(null);
                }}
            />

            <ShareDialog
                isOpen={!!shareNoteInfo}
                onClose={() => setShareNoteInfo(null)}
                note={shareNoteInfo}
            />

            <SelectionBar
                count={selectedNoteIds.size}
                onDelete={handleBulkDelete}
                onDownload={handleBulkDownload}
                isShared={activeTab === 'shared-with-me'}
            />

            <WelcomeModal 
                isOpen={showWelcome} 
                onClose={() => setShowWelcome(false)} 
                onAction={openCreateModal} 
            />
        </div>
    );
};

export default Dashboard;

