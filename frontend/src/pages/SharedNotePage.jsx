import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, User, Plus, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../api';
import WordCount from '../components/WordCount';

const SharedNotePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [notePreview, setNotePreview] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const response = await api.get(`/api/share/${token}/`);
                setNotePreview(response.data);
            } catch (err) {
                console.error('Failed to load shared note:', err);
                if (err.response?.status === 404) {
                    setError("This share link is invalid or has been revoked.");
                } else {
                    setError("Failed to load the shared note. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchPreview();
    }, [token]);

    const handleAccept = async () => {
        setIsAccepting(true);
        setError(null);
        try {
            await api.post(`/api/share/${token}/`);
            // Add a small delay for the animation
            setTimeout(() => {
                navigate('/', { state: { showShared: true } });
            }, 300);
        } catch (err) {
            console.error('Failed to accept share:', err);
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
                if (err.response.data.detail === "Note already shared with you." || 
                    err.response.data.detail === "You own this note.") {
                    setTimeout(() => {
                        if (err.response.data.detail === "You own this note.") {
                            navigate('/');
                        } else {
                            navigate('/', { state: { showShared: true } });
                        }
                    }, 2000);
                }
            } else {
                setError("Something went wrong. Please try again.");
            }
            setIsAccepting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
                
                <button 
                    onClick={() => navigate('/')}
                    className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" />
                    Back to dashboard
                </button>

                <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                            <Book className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    
                    <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                        Shared Note
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                        </div>
                    ) : error ? (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-800 text-center">
                            <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400 mx-auto mb-2" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    ) : notePreview ? (
                        <div className="mt-6 space-y-6 animate-fade-in">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                                    {notePreview.title}
                                </h3>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    <User className="w-3.5 h-3.5 mr-1" />
                                    Shared by <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">{notePreview.owner}</span>
                                </div>
                                <WordCount note={notePreview} className="mb-3 block" />
                                <div className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-3">
                                    "{notePreview.preview}"
                                </div>
                            </div>

                            <button
                                onClick={handleAccept}
                                disabled={isAccepting}
                                className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 focus:outline-none transition-all active:scale-95 ${isAccepting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isAccepting ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add to my notes
                                    </>
                                )}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default SharedNotePage;
