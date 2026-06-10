import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import api from '../api';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import ViewNoteModal from '../components/ViewNoteModal';
import ShareDialog from '../components/ShareDialog';
import SelectionBar from '../components/SelectionBar';
import WelcomeModal from '../components/WelcomeModal';
import HelpModal from '../components/HelpModal';
import PasswordPromptModal from '../components/PasswordPromptModal';
import GraphView from '../components/GraphView';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { exportAsMarkdown, exportAllAsZip } from '../utils/exportNote';
import { LogOut, Plus, Search, Book, Moon, Sun, Filter, X, ArrowUpDown, ChevronDown, Download, HelpCircle, CalendarDays, User, Cloud, CloudOff, CloudLightning } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants, tabContentVariants, dropdownVariants, tapAnimation } from '../utils/motion';
import { processSyncQueue } from '../utils/offlineSync';

const SORT_OPTIONS = [
    { value: 'recent', label: 'Most recent', shortLabel: 'Recent' },
    { value: 'oldest', label: 'Oldest', shortLabel: 'Oldest' },
    { value: 'alphabetical', label: 'A-Z', shortLabel: 'A-Z' },
];

const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
};

const TAB_ORDER = { 'my-notes': 0, 'shared-with-me': 1, 'graph': 2 };
const REFLOW_FADE_MS = 120;
const MAX_STAGGER = 12;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Dashboard = () => {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();
    const { confirm } = useConfirm();
    const { showToast } = useToast();

    // ────────────────────────────────────────────────────────
    // State: Offline / Sync
    // ────────────────────────────────────────────────────────
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            setIsSyncing(true);
            const success = await processSyncQueue(api);
            setIsSyncing(false);
            if (success) {
                showToast("Back online! Offline changes synced.", "success");
                // Trigger a full refresh of notes to ensure we're completely up to date
                setRefreshKey(prev => prev + 1);
                fetchTags();
            } else {
                showToast("Back online, but some offline changes failed to sync.", "error");
            }
        };
        const handleOffline = () => {
            setIsOnline(false);
            showToast("You are offline. Changes will be saved locally and synced later.", "info");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Process queue on initial mount if online
        if (navigator.onLine) {
            handleOnline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    // Theme state
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || 
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Welcome Popup state
    const [showWelcome, setShowWelcome] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('showWelcomePopup') === 'true') {
            setShowWelcome(true);
            localStorage.removeItem('showWelcomePopup');
        }
        if (localStorage.getItem('showHelpPopup') === 'true') {
            setShowHelp(true);
            localStorage.removeItem('showHelpPopup');
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
    
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);

    // General state
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentNote, setCurrentNote] = useState(null);
    const [viewNote, setViewNote] = useState(null);
    const [shareNoteInfo, setShareNoteInfo] = useState(null);
    const [passwordPrompt, setPasswordPrompt] = useState({ isOpen: false, mode: 'add', note: null, error: '' });

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

    const activeNoteIds = useMemo(() => {
        return new Set([...notes.map(n => n.id), ...sharedNotes.map(sn => sn.note.id)]);
    }, [notes, sharedNotes]);

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
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSortMenuOpen(false);
                setProfileMenuOpen(false);
                setSelectedNotes(new Set());
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Debounce search
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (debouncedSearchQuery !== searchQuery) {
                const currentNotes = activeTab === 'shared-with-me' ? sharedNotes.map(sn => sn.note) : notes;
                if (currentNotes.length > 0) {
                    lockTabAreaHeight();
                    const staggerMap = new Set();
                    currentNotes.forEach(note => staggerMap.add(note.id));
                    setReflowingNoteIds(staggerMap);
                    
                    setTimeout(() => {
                        setDebouncedSearchQuery(searchQuery);
                        setUnstaggeredNoteIds(staggerMap);
                        
                        setTimeout(() => {
                            setReflowingNoteIds(new Set());
                            setUnstaggeredNoteIds(new Set());
                        }, 50);
                    }, REFLOW_FADE_MS);
                } else {
                    setDebouncedSearchQuery(searchQuery);
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, notes, sharedNotes, activeTab]);


    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isModifier = e.metaKey || e.ctrlKey;
            
            if (isModifier && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.altKey && e.key === 'n') {
                e.preventDefault();
                if (!isModalOpen && !viewNote && !shareNoteInfo && !passwordPrompt.isOpen) {
                    openCreateModal();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, viewNote, shareNoteInfo, passwordPrompt.isOpen]);

    // Prevent body scroll when any modal is open
    const anyModalOpen = isModalOpen || !!viewNote || !!shareNoteInfo || passwordPrompt.isOpen || showWelcome || showHelp;
    useEffect(() => {
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [anyModalOpen]);

    // Fetch notes function
    const fetchNotes = useCallback(async () => {
        try {
            if (notes.length === 0 && !debouncedSearchQuery && selectedTagFilters.length === 0) {
                setIsLoading(true);
            }
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
    }, [selectedTagFilters, debouncedSearchQuery, sortOrder, notes.length]);

    // Fetch shared notes function
    const fetchSharedNotes = useCallback(async () => {
        try {
            if (sharedNotes.length === 0 && !debouncedSearchQuery) {
                setIsLoadingShared(true);
            }
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
    }, [debouncedSearchQuery, sharedNotes.length]);

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

    // Fetch shared notes on filter change or initial load, same as regular notes
    useEffect(() => {
        fetchSharedNotes();
    }, [fetchSharedNotes]);

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

    const sortNoteList = useCallback((noteList) => {
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
    }, [sortOrder]);

    const filteredNotes = useMemo(() => sortNoteList(notes), [notes, sortNoteList]);
    const filteredSharedNotes = useMemo(() => {
        const sorted = [...sharedNotes].sort((a, b) => {
            const noteA = a.note;
            const noteB = b.note;
            if (sortOrder === 'oldest') return new Date(noteA.created_at) - new Date(noteB.created_at);
            if (sortOrder === 'alphabetical') return noteA.title.localeCompare(noteB.title, undefined, { sensitivity: 'base' });
            return new Date(noteB.updated_at) - new Date(noteA.updated_at);
        });
        return selectedTagFilters.length > 0
            ? sorted.filter(sn => selectedTagFilters.every(tagId => sn.note.tags?.some(tag => tag.id === tagId)))
            : sorted;
    }, [sharedNotes, sortOrder, selectedTagFilters]);

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

    const getMovedNoteIds = (oldNotes, newNotes) => {
        const movedIds = [];
        for (let i = 0; i < oldNotes.length; i++) {
            const oldId = oldNotes[i].id;
            const newIndex = newNotes.findIndex(n => n.id === oldId);
            if (newIndex !== -1 && newIndex !== i) {
                movedIds.push(oldId);
            }
        }
        return movedIds;
    };

    const handleWikilinkClick = useCallback(async (title, noteId = null) => {
        if (noteId) {
            const note = notes.find(n => n.id === noteId);
            if (note) {
                setViewNote(note);
                return;
            }
            try {
                const res = await api.get(`/api/notes/${noteId}/`);
                setViewNote(res.data);
            } catch (err) {
                console.error("Could not fetch note", err);
            }
            return;
        }

        const existingNote = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
        if (existingNote) {
            setViewNote(existingNote);
        } else {
            setViewNote(null);
            setCurrentNote({ title, content: '' });
            setIsModalOpen(true);
        }
    }, [notes]);

    const handleDailyNote = useCallback(() => {
        const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const title = `${today}`;
        const existingNote = notes.find(n => n.title === title);
        
        if (existingNote) {
            setViewNote(existingNote);
        } else {
            setCurrentNote({ title, content: '' });
            setIsModalOpen(true);
        }
    }, [notes]);

    const handleSortChange = async (newSortOrder) => {
        if (sortOrder === newSortOrder) return;
        
        const isShared = activeTab === 'shared-with-me';
        const sourceList = isShared ? filteredSharedNotes.map(sn => sn.note) : filteredNotes;
        
        const fadingIds = sourceList.map(n => n.id);
        setReflowingNoteIds(new Set(fadingIds));
        await wait(REFLOW_FADE_MS);
        
        setSortOrder(newSortOrder);
        setRefreshKey(prev => prev + 1);
        
        setTimeout(() => {
            setReflowingNoteIds(new Set());
            // Clear unstaggered so they stagger fade in naturally like on load
            setUnstaggeredNoteIds(new Set());
        }, 50);
    };

    const handleBulkDelete = async () => {
        const count = selectedNoteIds.size;
        if (count === 0) return;

        const ids = [...selectedNoteIds];
        const isShared = activeTab === 'shared-with-me';
        const sourceList = isShared ? filteredSharedNotes.map(sn => sn.note) : filteredNotes;
        
        let firstDeletedIndex = -1;
        for (let i = 0; i < sourceList.length; i++) {
            if (selectedNoteIds.has(sourceList[i].id)) {
                firstDeletedIndex = i;
                break;
            }
        }

        try {
            if (firstDeletedIndex >= 0) {
                const fadingIds = sourceList.slice(firstDeletedIndex).map(n => n.id);
                setReflowingNoteIds(new Set(fadingIds));
                await wait(REFLOW_FADE_MS);
            }

            if (isShared) {
                await Promise.all(ids.map(id => api.delete(`/api/notes/shared-with-me/${id}/`)));
                setSharedNotes(sharedNotes.filter(sn => !selectedNoteIds.has(sn.note.id)));
            } else {
                await Promise.all(ids.map(id => api.delete(`/api/notes/${id}/`)));
                setNotes(notes.filter(n => !selectedNoteIds.has(n.id)));
            }
            
            setRefreshKey(prev => prev + 1);
            
            if (firstDeletedIndex >= 0) {
                const affectedIds = sourceList.slice(firstDeletedIndex).filter(n => !selectedNoteIds.has(n.id)).map(n => n.id);
                if (affectedIds.length > 0) {
                    setUnstaggeredNoteIds(new Set(affectedIds));
                    setTimeout(() => {
                        setReflowingNoteIds(new Set());
                        setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                    }, REFLOW_FADE_MS);
                } else {
                    setReflowingNoteIds(new Set());
                    setUnstaggeredNoteIds(new Set());
                }
            } else {
                setReflowingNoteIds(new Set());
                setUnstaggeredNoteIds(new Set());
            }

            setSelectedNoteIds(new Set());
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to delete notes:', err);
            toast.error('Failed to delete some notes.');
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
            toast.info(`${skipped} password-protected note${skipped > 1 ? 's were' : ' was'} skipped.`);
        }
    };

    // CRUD Handlers
    const handleCreateEditNote = async (noteData) => {
        try {
            if (currentNote) {
                const response = await api.patch(`/api/notes/${currentNote.id}/`, noteData);
                const updatedNote = response.data;
                
                const newFilteredNotes = filteredNotes.map(n => n.id === currentNote.id ? updatedNote : n).sort((a, b) => {
                    if (sortOrder === 'alphabetical') return a.title.localeCompare(b.title);
                    if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                    return new Date(b.updated_at) - new Date(a.updated_at);
                });
                const affectedIds = getMovedNoteIds(filteredNotes, newFilteredNotes);
                
                if (affectedIds.length > 0) {
                    setReflowingNoteIds(new Set(affectedIds));
                    await wait(REFLOW_FADE_MS);
                }
                
                setNotes(notes.map(n => n.id === currentNote.id ? updatedNote : n));
                setRefreshKey(prev => prev + 1);
                setIsModalOpen(false);
                setCurrentNote(null);
                
                if (affectedIds.length > 0) {
                    setUnstaggeredNoteIds(new Set(affectedIds));
                    setTimeout(() => {
                        setReflowingNoteIds(new Set());
                        setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                    }, REFLOW_FADE_MS);
                }
            } else {
                const response = await api.post('/api/notes/', noteData);
                const newNote = response.data;
                
                const newFilteredNotes = [...filteredNotes, newNote].sort((a, b) => {
                    if (sortOrder === 'alphabetical') return a.title.localeCompare(b.title);
                    if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                    return new Date(b.updated_at) - new Date(a.updated_at);
                });
                const affectedIds = getMovedNoteIds(filteredNotes, newFilteredNotes);
                
                if (affectedIds.length > 0) {
                    setReflowingNoteIds(new Set(affectedIds));
                    await wait(REFLOW_FADE_MS);
                }
                
                setNotes([newNote, ...notes]);
                setRefreshKey(prev => prev + 1);
                setIsModalOpen(false);
                setCurrentNote(null);
                
                if (affectedIds.length > 0) {
                    setUnstaggeredNoteIds(new Set(affectedIds));
                    setTimeout(() => {
                        setReflowingNoteIds(new Set());
                        setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                    }, REFLOW_FADE_MS);
                }
            }
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to save note:', err);
            toast.error('Failed to save note. Please check your inputs.');
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
            toast.error('Failed to delete note.');
        }
    };

    const handleDuplicateNote = async (note) => {
        try {
            const response = await api.post(`/api/notes/${note.id}/duplicate/`);
            const newNote = response.data;
            
            // Simulate the new sorted order for visible notes
            const newFilteredNotes = [...filteredNotes, newNote].sort((a, b) => {
                if (sortOrder === 'alphabetical') return a.title.localeCompare(b.title);
                if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                return new Date(b.updated_at) - new Date(a.updated_at);
            });
            
            const affectedIds = getMovedNoteIds(filteredNotes, newFilteredNotes);
            
            if (affectedIds.length > 0) {
                setReflowingNoteIds(new Set(affectedIds));
                await wait(REFLOW_FADE_MS);
            }
            
            setNotes(prev => [newNote, ...prev]);
            setRefreshKey(prev => prev + 1);
            
            if (affectedIds.length > 0) {
                setUnstaggeredNoteIds(new Set(affectedIds));
                setTimeout(() => {
                    setReflowingNoteIds(new Set());
                    setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                }, REFLOW_FADE_MS);
            }
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to duplicate note:', err);
            toast.error('Failed to duplicate note.');
        }
    };

    const handleCopyContent = async (note) => {
        try {
            await navigator.clipboard.writeText(note.content);
            toast.success('Content copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy content:', err);
            toast.error('Failed to copy content to clipboard.');
        }
    };

    const handleToggleFavourite = async (note) => {
        try {
            const currentList = [...filteredNotes];
            const oldIndex = currentList.findIndex(n => n.id === note.id);
            
            const fakeUpdatedNotes = notes.map(n => n.id === note.id ? { ...n, is_favourite: !n.is_favourite, updated_at: new Date().toISOString() } : n);
            const newList = sortNoteList(fakeUpdatedNotes);
            const newIndex = newList.findIndex(n => n.id === note.id);
            
            const fadingIds = [];
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const minIdx = Math.min(oldIndex, newIndex);
                const maxIdx = Math.max(oldIndex, newIndex);
                for (let i = minIdx; i <= maxIdx; i++) {
                    fadingIds.push(currentList[i].id);
                }
            }

            if (fadingIds.length > 0) {
                setReflowingNoteIds(new Set(fadingIds));
                await wait(REFLOW_FADE_MS);
            }

            const response = await api.patch(`/api/notes/${note.id}/`, {
                is_favourite: !note.is_favourite
            });
            updateOwnedNote(response.data);
            
            if (fadingIds.length > 0) {
                setUnstaggeredNoteIds(new Set(fadingIds));
                setTimeout(() => {
                    setReflowingNoteIds(new Set());
                    setTimeout(() => setUnstaggeredNoteIds(new Set()), 180);
                }, REFLOW_FADE_MS);
            }
            
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            setReflowingNoteIds(new Set());
            setUnstaggeredNoteIds(new Set());
            console.error('Failed to toggle favourite:', err);
            toast.error('Failed to update favourite status.');
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
            toast.error('Failed to remove note.');
        }
    };

    const handleCopySharedNote = async (note) => {
        if (note.is_password_protected) {
            toast.error('Password protected notes cannot be copied.');
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
            toast.error('Failed to copy note.');
        }
    };

    const handleUnlockNote = async (note, password) => {
        const endpoint = note.isShared
            ? `/api/notes/shared-with-me/${note.id}/unlock/`
            : `/api/notes/${note.id}/unlock/`;
        const response = await api.post(endpoint, { password });
        return response.data;
    };

    const handleSetNotePassword = (note) => {
        setPasswordPrompt({ isOpen: true, mode: 'add', note, error: '' });
    };

    const handleRemoveNotePassword = (note) => {
        setPasswordPrompt({ isOpen: true, mode: 'remove', note, error: '' });
    };

    const handlePasswordSubmit = async (password) => {
        const { mode, note } = passwordPrompt;
        if (!note) return;

        if (mode === 'add') {
            if (password.trim().length < 4) {
                setPasswordPrompt(prev => ({ ...prev, error: 'Password must be at least 4 characters.' }));
                return;
            }
            try {
                const response = await api.post(`/api/notes/${note.id}/password/`, { password });
                updateOwnedNote(response.data);
                setPasswordPrompt({ isOpen: false, mode: 'add', note: null, error: '' });
            } catch (err) {
                console.error('Failed to add password protection:', err);
                setPasswordPrompt(prev => ({ ...prev, error: err.response?.data?.detail || 'Failed to add password protection.' }));
            }
        } else if (mode === 'remove') {
            try {
                const response = await api.delete(`/api/notes/${note.id}/password/`, { data: { password } });
                updateOwnedNote(response.data);
                setPasswordPrompt({ isOpen: false, mode: 'remove', note: null, error: '' });
            } catch (err) {
                console.error('Failed to remove password protection:', err);
                setPasswordPrompt(prev => ({ ...prev, error: err.response?.data?.detail || 'Failed to remove password protection.' }));
            }
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
                toast.error('Tags from shared notes cannot be deleted.');
                return;
            }

            // If no shared notes have this tag, remove it from sharedTags
            setSharedTags(prev => prev.filter(tag => tag.id !== id));
            setSelectedTagFilters(prev => prev.filter(tid => tid !== id));
            return;
        }

        // Normal tag deletion for my notes
        const isConfirmed = await confirm({
            title: 'Delete Tag',
            message: 'Are you sure you want to delete this tag? It will be removed from all your notes.',
            confirmText: 'Delete Tag',
            isDestructive: true
        });
        if (!isConfirmed) return;

        try {
            await api.delete(`/api/tags/${id}/`);
            setTags(tags.filter(t => t.id !== id));
            setSelectedTagFilters(prev => prev.filter(tid => tid !== id));
            fetchNotes();
        } catch (err) {
            console.error('Failed to delete tag:', err);
            toast.error('Failed to delete tag.');
        }
    };

    const toggleTagFilter = (tagId) => {
        const currentNotes = activeTab === 'shared-with-me' ? sharedNotes.map(sn => sn.note) : notes;
        if (currentNotes.length > 0) {
            lockTabAreaHeight();
            const staggerMap = new Set();
            currentNotes.forEach(note => staggerMap.add(note.id));
            setReflowingNoteIds(staggerMap);
            
            setTimeout(() => {
                setSelectedTagFilters(prev => {
                    if (prev.includes(tagId)) return prev.filter(t => t !== tagId);
                    return [...prev, tagId];
                });
                setUnstaggeredNoteIds(staggerMap);
                
                setTimeout(() => {
                    setReflowingNoteIds(new Set());
                    setUnstaggeredNoteIds(new Set());
                }, 50);
            }, REFLOW_FADE_MS);
        } else {
            setSelectedTagFilters(prev => {
                if (prev.includes(tagId)) return prev.filter(t => t !== tagId);
                return [...prev, tagId];
            });
        }
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
                toast.error(err.response.data.non_field_errors[0]); // e.g. duplicate tag
            } else {
                toast.error('Failed to create tag.');
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

    const actionsRef = useRef({});
    actionsRef.current = {
        openEditModal, handleDeleteNote, toggleTagFilter, setViewNote,
        setShareNoteInfo, handleDuplicateNote, handleCopyContent,
        handleToggleFavourite, handleSetNotePassword, handleRemoveNotePassword,
        toggleNoteSelection, handleWikilinkClick,
        handleRemoveSharedNote, handleCopySharedNote
    };

    const proxies = useMemo(() => ({
        onEdit: (n) => actionsRef.current.openEditModal(n),
        onDelete: (id) => actionsRef.current.handleDeleteNote(id),
        onTagClick: (t) => actionsRef.current.toggleTagFilter(t),
        onView: (n) => actionsRef.current.setViewNote(n),
        onShare: (n) => actionsRef.current.setShareNoteInfo(n),
        onDuplicate: (n) => actionsRef.current.handleDuplicateNote(n),
        onCopyContent: (n) => actionsRef.current.handleCopyContent(n),
        onToggleFavourite: (n) => actionsRef.current.handleToggleFavourite(n),
        onSetPassword: (n) => actionsRef.current.handleSetNotePassword(n),
        onRemovePassword: (n) => actionsRef.current.handleRemoveNotePassword(n),
        onSelectToggle: (id, e) => actionsRef.current.toggleNoteSelection(id, e),
        onWikilinkClick: (t, id) => actionsRef.current.handleWikilinkClick(t, id),
        onDeleteShared: (id) => actionsRef.current.handleRemoveSharedNote(id),
        onCopyShared: (n) => actionsRef.current.handleCopySharedNote(n),
    }), []);

    return (
        <div className="min-h-[100dvh] overflow-x-hidden bg-white dark:bg-black transition-colors duration-200 flex flex-col font-sans">
            {/* Navbar */}
            <header className="bg-white dark:bg-black sticky top-0 z-[60] border-b border-gray-200 dark:border-gray-800 transition-colors duration-200 py-0">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className="flex items-center gap-2 lg:gap-3 h-16">
                        <div className="flex items-center">
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedTagFilters([]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="shrink-0 flex items-center hover:opacity-80 transition-opacity focus:outline-none"
                            >
                                <motion.span 
                                    whileTap={tapAnimation}
                                    className="text-xl lg:text-2xl font-semibold text-black dark:text-white tracking-tight"
                                >
                                    ▲ Jots
                                </motion.span>
                            </button>
                        </div>
                        
                        <div className="min-w-0 flex-1 px-4 lg:px-8 max-w-2xl flex items-center gap-1 lg:gap-2">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    spellCheck="false"
                                    className="block w-full pl-9 pr-3 lg:pr-12 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none hidden lg:flex">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">Ctrl K</span>
                                </div>
                            </div>
                            <motion.button 
                                whileTap={tapAnimation}
                                onClick={() => setShowHelp(true)}
                                className="hidden lg:flex shrink-0 p-2.5 lg:p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus:outline-none"
                                title="How to use Jots"
                            >
                                <HelpCircle className="h-5 w-5 lg:h-4 lg:w-4" />
                            </motion.button>
                        </div>

                        <div className="shrink-0 flex items-center space-x-1 lg:space-x-2 ml-auto">
                            {/* Offline Sync Status */}
                            <div className="flex items-center gap-2 mr-2">
                                {isSyncing ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                        <CloudLightning className="w-4 h-4 animate-pulse" />
                                        <span className="text-xs font-medium hidden sm:inline">Syncing...</span>
                                    </div>
                                ) : !isOnline ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800" title="Offline mode">
                                        <CloudOff className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden sm:inline">Offline</span>
                                    </div>
                                ) : null}
                            </div>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={() => exportAllAsZip(notes, sharedNotes)}
                                className="p-2.5 lg:p-2 rounded-md text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                                title="Download all notes as ZIP"
                            >
                                <Download className="h-5 w-5 lg:h-4 lg:w-4" />
                            </motion.button>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2.5 lg:p-2 rounded-md text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                            >
                                {darkMode ? <Sun className="h-5 w-5 lg:h-4 lg:w-4" /> : <Moon className="h-5 w-5 lg:h-4 lg:w-4" />}
                            </motion.button>
                            <div className="relative" ref={profileMenuRef}>
                                <motion.button
                                    whileTap={tapAnimation}
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    className="p-2.5 lg:p-2 rounded-md text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors lg:flex lg:items-center lg:px-3"
                                >
                                    <span className="hidden lg:inline text-sm font-medium">
                                        {user?.first_name || user?.username || 'Profile'}
                                    </span>
                                    <ChevronDown className="hidden lg:block h-4 w-4 ml-1" />
                                    <User className="lg:hidden h-5 w-5" />
                                </motion.button>

                                <AnimatePresence mode="wait">
                                    {profileMenuOpen && (
                                        <motion.div
                                            variants={dropdownVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
                                        >
                                            <div className="p-1">
                                                <button
                                                    onClick={() => {
                                                        setProfileMenuOpen(false);
                                                        logout();
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors flex items-center"
                                                >
                                                    <LogOut className="h-4 w-4 mr-2" />
                                                    Sign out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full pb-8 flex flex-col">
                
            {/* Tabs & Filters Bar - Now sticky to move with header */}
            <div className="sticky top-16 z-[55] w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-3 overflow-visible px-4 py-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-4 lg:px-8">
                    <div className="flex shrink-0 items-center space-x-6 h-8">
                        <button
                            onClick={() => switchTab('my-notes')}
                            className={`whitespace-nowrap text-sm font-medium tracking-tight transition-colors h-full flex items-center relative ${activeTab === 'my-notes' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            My Notes
                            {activeTab === 'my-notes' && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute bottom-0 lg:bottom-[-12px] left-0 right-0 h-[2px] bg-black dark:bg-white" />
                            )}
                        </button>
                        <button
                            onClick={() => switchTab('shared-with-me')}
                            className={`whitespace-nowrap text-sm font-medium tracking-tight transition-colors h-full flex items-center relative ${activeTab === 'shared-with-me' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            Shared with me
                            {activeTab === 'shared-with-me' && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute bottom-0 lg:bottom-[-12px] left-0 right-0 h-[2px] bg-black dark:bg-white" />
                            )}
                        </button>
                        <button
                            onClick={() => switchTab('graph')}
                            className={`whitespace-nowrap text-sm font-medium tracking-tight transition-colors h-full flex items-center relative ${activeTab === 'graph' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            Graph
                            {activeTab === 'graph' && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute bottom-0 lg:bottom-[-12px] left-0 right-0 h-[2px] bg-black dark:bg-white" />
                            )}
                        </button>
                    </div>

                    <div className="hidden lg:block w-px self-stretch shrink-0 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />

                    <AnimatePresence mode="wait">
                        <motion.div
                                key={activeTab}
                                initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex min-w-0 w-full flex-nowrap items-center gap-2 lg:h-10 lg:flex-1"
                        >
                    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar self-center">
                        <div className="flex h-10 flex-nowrap items-center space-x-2 pl-0.5 lg:pl-4">
                            <Filter className="w-4 h-4 shrink-0 text-gray-400" />
                            <button
                                onClick={() => {
                                    setSelectedTagFilters([]);
                                    setRefreshKey(prev => prev + 1);
                                }}
                                className={`text-xs font-medium whitespace-nowrap px-3 py-1 rounded-md transition-colors border ${
                                    selectedTagFilters.length === 0
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-black dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700'
                                }`}
                            >
                                All
                            </button>
                            {(activeTab === 'shared-with-me' ? sharedTags : tags).map(tag => (
                                <div key={tag.id} className="relative group inline-flex h-10 shrink-0 items-center">
                                    <button
                                        onClick={() => toggleTagFilter(tag.id)}
                                        className={`text-xs font-medium whitespace-nowrap pl-3 pr-7 py-1 rounded-md transition-colors border ${
                                            selectedTagFilters.includes(tag.id)
                                            ? 'bg-gray-100 text-black border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-black dark:text-gray-400 dark:border-gray-800 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTag(tag.id, e)}
                                        className="absolute right-1.5 w-4 h-4 rounded-sm flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/20"
                                        title="Delete tag"
                                    >
                                        <X className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hidden lg:block w-px self-stretch shrink-0 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />

                    {activeTab !== 'graph' && (
                        <div className={`relative shrink-0 self-center ${activeTab === 'shared-with-me' ? 'ml-auto' : ''}`} ref={sortMenuRef}>
                        <button
                            type="button"
                            onClick={() => setSortMenuOpen((open) => !open)}
                            className="h-10 lg:h-8 w-[7rem] overflow-hidden rounded-md border border-gray-200 bg-white pl-8 pr-7 text-center text-sm lg:text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus:border-black focus:ring-1 focus:ring-black focus:outline-none dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900 dark:focus:border-white dark:focus:ring-white lg:w-[9.75rem] lg:pr-8"
                            aria-label="Sort notes"
                            aria-expanded={sortMenuOpen}
                            aria-haspopup="listbox"
                        >
                            <span className="block truncate">
                                <span className="flex items-center">
                                    <span className="hidden lg:inline text-gray-500 mr-1.5">Sort by:</span>
                                    <span className="lg:hidden font-semibold text-gray-900 dark:text-gray-100">
                                        {SORT_OPTIONS.find((o) => o.value === sortOrder)?.shortLabel}
                                    </span>
                                    <span className="hidden lg:inline font-semibold text-gray-900 dark:text-gray-100">
                                        {SORT_OPTIONS.find((o) => o.value === sortOrder)?.label}
                                    </span>
                                </span>
                            </span>
                        </button>
                        <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 -translate-y-1/2 text-gray-400" />
                        <ChevronDown className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 -translate-y-1/2 text-gray-400 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
                        <AnimatePresence mode="wait">
                        {sortMenuOpen && (
                            <motion.div
                                variants={dropdownVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                style={{ originY: 0 }}
                                className="absolute right-0 top-[calc(100%+0.25rem)] z-40 w-[9.75rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black"
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
                                            handleSortChange(option.value);
                                            setSortMenuOpen(false);
                                        }}
                                        className={`block w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                                            sortOrder === option.value
                                                ? 'bg-gray-100 text-black dark:bg-gray-800 dark:text-white'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                    )}

                    {activeTab !== 'shared-with-me' && activeTab !== 'graph' && (
                        <div className={`hidden lg:flex shrink-0 self-center items-center gap-2 ${activeTab === 'graph' ? 'ml-auto' : ''}`}>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={handleDailyNote}
                                className="inline-flex h-8 items-center px-3 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-black dark:text-gray-300 dark:bg-black dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:text-white focus:outline-none transition-all group relative"
                            >
                                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                                Daily Note
                            </motion.button>
                            <motion.button
                                whileTap={tapAnimation}
                                onClick={openCreateModal}
                                className="inline-flex h-8 items-center px-3 text-xs font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none transition-all dark:bg-white dark:text-black dark:hover:bg-gray-200 sm:px-4 group relative"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                New Note
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black dark:bg-white dark:text-black text-white text-[10px] px-2 py-1 rounded-sm pointer-events-none whitespace-nowrap">
                                    Alt+N
                                </div>
                            </motion.button>
                        </div>
                    )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="w-full">
                {error && (
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
                        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 mt-6 rounded-r-md animate-fade-in-up">
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    </div>
                )}

                <div ref={tabAreaRef} className="relative overflow-hidden">
                <AnimatePresence initial={false} mode="wait" custom={tabDirection}>
                    {activeTab === 'my-notes' && (
                        <motion.div
                            key="my-notes"
                            custom={tabDirection}
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onAnimationComplete={(definition) => {
                                if (definition === 'animate') unlockTabAreaHeight();
                            }}
                            className="max-w-7xl mx-auto px-4 lg:px-8 pt-6"
                        >
                            <AnimatePresence mode="wait" initial={true}>
                            {isLoading ? (
                                <motion.div key="loading" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex justify-center items-center h-64">
                                </motion.div>
                            ) : filteredNotes.length > 0 ? (
                                <motion.div key={`content-${debouncedSearchQuery}-${sortOrder}-${selectedTagFilters.join(',')}`} variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                                    <motion.div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1 relative">
                                        <AnimatePresence>
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
                                                    custom={unstaggeredNoteIds.has(note.id) ? { delay: false } : Math.min(idx, MAX_STAGGER)}
                                                >
                                                    <NoteCard 
                                                        note={note} 
                                                        onEdit={proxies.onEdit}
                                                        onDelete={proxies.onDelete}
                                                        onTagClick={proxies.onTagClick}
                                                        onView={proxies.onView}
                                                        onShare={proxies.onShare}
                                                        onDuplicate={proxies.onDuplicate}
                                                        onCopyContent={proxies.onCopyContent}
                                                        onToggleFavourite={proxies.onToggleFavourite}
                                                        onSetPassword={proxies.onSetPassword}
                                                        onRemovePassword={proxies.onRemovePassword}
                                                        isSelected={selectedNoteIds.has(note.id)}
                                                        onSelectToggle={proxies.onSelectToggle}
                                                        hasSelection={selectedNoteIds.size > 0}
                                                        onWikilinkClick={proxies.onWikilinkClick}
                                                    />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </motion.div>
                                    
                                    {nextPage && (
                                        <div ref={loadMoreRef} className="flex justify-center mt-12 py-4">
                                            {isFetchingNextPage ? (
                                                <div className="col-span-full flex justify-center py-8">
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">Scroll for more...</span>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="text-center py-24 px-6"
                                >
                                    <Book className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No notes found</h3>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                                        {(searchQuery || selectedTagFilters.length > 0) ? "We couldn't find anything matching your filters." : "Get started by creating your first note."}
                                    </p>
                                    {!(searchQuery || selectedTagFilters.length > 0) && (
                                        <div className="mt-8">
                                            <motion.button
                                                whileTap={tapAnimation}
                                                onClick={openCreateModal}
                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-black hover:bg-gray-800 dark:text-black dark:bg-white dark:hover:bg-gray-200 focus:outline-none transition-all"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                New Note
                                            </motion.button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeTab === 'shared-with-me' && (
                        <motion.div
                            key="shared-with-me"
                            custom={tabDirection}
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onAnimationComplete={(definition) => {
                                if (definition === 'animate') unlockTabAreaHeight();
                            }}
                            className="max-w-7xl mx-auto px-4 lg:px-8 pt-6"
                        >
                            <AnimatePresence mode="wait" initial={true}>
                            {isLoadingShared ? (
                                <motion.div key="loading" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex justify-center items-center h-64">
                                </motion.div>
                            ) : filteredSharedNotes.length > 0 ? (
                                <motion.div key={`content-shared-${debouncedSearchQuery}-${sortOrder}-${selectedTagFilters.join(',')}`} variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1">
                                    <AnimatePresence>
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
                                                custom={unstaggeredNoteIds.has(sn.note.id) ? { delay: false } : Math.min(idx, MAX_STAGGER)}
                                            >
                                                <NoteCard 
                                                    note={sn.note} 
                                                    isShared={true}
                                                    ownerName={sn.owner_username}
                                                    onTagClick={proxies.onTagClick}
                                                    onView={proxies.onView}
                                                    onDelete={proxies.onDeleteShared}
                                                    onCopy={proxies.onCopyShared}
                                                    onWikilinkClick={proxies.onWikilinkClick}
                                                    isSelected={selectedNoteIds.has(sn.note.id)}
                                                    onSelectToggle={proxies.onSelectToggle}
                                                    hasSelection={selectedNoteIds.size > 0}
                                                    onWikilinkClick={handleWikilinkClick}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
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
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeTab === 'graph' && (
                        <motion.div
                            key="graph"
                            custom={tabDirection}
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onAnimationComplete={(definition) => {
                                if (definition === 'animate') unlockTabAreaHeight();
                            }}
                            className="mx-auto w-full px-4 lg:px-16 pt-4"
                        >
                            <AnimatePresence mode="wait" initial={true}>
                                <motion.div key="graph-view" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                                    <GraphView 
                                        darkMode={darkMode} 
                                        onNoteClick={(id) => handleWikilinkClick(null, id)}
                                        selectedTagFilters={selectedTagFilters}
                                        activeNoteIds={activeNoteIds}
                                        refreshKey={refreshKey}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
            </div>
            </main>
            {/* Mobile FAB */}
            <div className="lg:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3">
                <motion.button
                    whileTap={tapAnimation}
                    onClick={() => setShowHelp(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none transition-transform hover:scale-105 active:scale-95"
                    aria-label="Help"
                >
                    <HelpCircle className="h-5 w-5" />
                </motion.button>
                {activeTab !== 'shared-with-me' && activeTab !== 'graph' && (
                    <>
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={handleDailyNote}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none transition-transform hover:scale-105 active:scale-95"
                            aria-label="Daily Note"
                        >
                            <CalendarDays className="h-5 w-5" />
                        </motion.button>
                        <motion.button
                            whileTap={tapAnimation}
                            onClick={openCreateModal}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg focus:outline-none transition-transform hover:scale-105 active:scale-95"
                            aria-label="New Note"
                        >
                            <Plus className="h-5 w-5" />
                        </motion.button>
                    </>
                )}
            </div>

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
                onWikilinkClick={handleWikilinkClick}
            />

            <ShareDialog
                isOpen={!!shareNoteInfo}
                onClose={() => setShareNoteInfo(null)}
                note={shareNoteInfo}
            />

            <PasswordPromptModal
                isOpen={passwordPrompt.isOpen}
                onClose={() => setPasswordPrompt(prev => ({ ...prev, isOpen: false }))}
                onSubmit={handlePasswordSubmit}
                mode={passwordPrompt.mode}
                error={passwordPrompt.error}
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

            <HelpModal 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
            />
        </div>
    );
};


export default Dashboard;
