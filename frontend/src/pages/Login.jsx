import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUpVariants } from '../utils/motion';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setIsLoading(true);

        const result = await login(credentialResponse.credential);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Google Sign-In failed. Please try again.');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors relative">
            <ThemeToggle />
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="flex flex-col items-center"
                >
                    <svg viewBox="0 0 24 24" className="h-14 w-14 text-black dark:text-white fill-current" aria-hidden="true">
                        <path d="M12 2L22 20H2Z" />
                    </svg>
                    <span className="mt-3 text-3xl font-black tracking-tighter text-black dark:text-white">
                        Jots
                    </span>
                </motion.div>
                <motion.h2 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
                >
                    Welcome
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300"
                >
                    Sign in or create an account with Google
                </motion.p>
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex flex-col items-center justify-center space-y-4">
                        <AnimatePresence>
                        {error && (
                            <motion.div
                                variants={slideUpVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="w-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 rounded-xl mb-4"
                            >
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        {isLoading ? (
                            <div className="w-full py-2.5 px-4 rounded-full text-sm font-semibold text-white bg-black dark:bg-white dark:text-black opacity-60 text-center cursor-wait">
                                Signing in...
                            </div>
                        ) : (
                            <div className="w-full flex justify-center google-btn-wrapper">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    useOneTap
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    theme="filled_black"
                                />
                            </div>
                        )}
                    </div>
            </motion.div>
        </div>
    );
};

export default Login;
