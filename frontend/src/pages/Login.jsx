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
        <div className="min-h-[100dvh] bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors relative">
            <ThemeToggle />
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="bg-white py-12 px-8 shadow-xl shadow-gray-200/50 dark:shadow-none rounded-none flex flex-col items-center mx-4 sm:mx-0">
                    
                    <svg viewBox="0 0 24 24" className="h-14 w-14 text-black fill-current" aria-hidden="true">
                        <path d="M12 2L22 20H2Z" />
                    </svg>
                    <span className="mt-4 text-3xl font-black tracking-tighter text-black">
                        Jots
                    </span>
                    <p className="mt-4 text-center text-sm sm:text-base text-gray-600 px-2 max-w-sm leading-relaxed">
                        Your personal networked notebook. Capture thoughts, connect ideas with wikilinks, and explore them through an interactive visual graph.
                    </p>

                    <div className="mt-10 w-full flex flex-col items-center">
                        <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                variants={slideUpVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="w-full bg-red-50 border border-red-200 p-3 rounded-xl mb-6 text-center"
                            >
                                <p className="text-sm text-red-600">{error}</p>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        {isLoading ? (
                            <div className="w-full max-w-[280px] py-2.5 px-4 rounded-full text-sm font-semibold text-white bg-black opacity-60 text-center cursor-wait">
                                Signing in...
                            </div>
                        ) : (
                            <div className="flex justify-center w-full">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    useOneTap
                                />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
