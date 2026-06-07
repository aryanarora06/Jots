import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUpVariants, tapAnimation } from '../utils/motion';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { register, login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password2) {
            return setError('Passwords do not match');
        }

        setIsLoading(true);

        const result = await register(
            formData.username, 
            formData.email, 
            formData.password, 
            formData.password2
        );

        if (result.success) {
            const loginResult = await login(formData.username, formData.password);
            if (loginResult.success) {
                localStorage.setItem('showWelcomePopup', 'true');
                navigate('/');
            } else {
                navigate('/login');
            }
        } else {
            setError(result.message);
            setIsLoading(false);
        }
    };

    const inputClass = "block w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all text-sm";

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
                    <img src="/favicon.svg" alt="" className="h-14 w-auto" aria-hidden="true" />
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
                    Create your account
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300"
                >
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors">
                        Sign in
                    </Link>
                </motion.p>
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl border border-gray-100 dark:border-gray-800">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <AnimatePresence>
                        {error && (
                            <motion.div
                                variants={slideUpVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 rounded-xl"
                            >
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Username
                            </label>
                            <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange} className={inputClass} />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email address
                            </label>
                            <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClass} />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Password
                            </label>
                            <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className={inputClass} />
                        </div>

                        <div>
                            <label htmlFor="password2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Confirm Password
                            </label>
                            <input id="password2" name="password2" type="password" required value={formData.password2} onChange={handleChange} className={inputClass} />
                        </div>

                        <motion.button
                            whileTap={tapAnimation}
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:outline-none transition-all ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Creating account...' : 'Create account'}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
