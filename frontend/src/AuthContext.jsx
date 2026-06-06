import React, { createContext, useState, useEffect } from 'react';
import api from './api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access');
        if (token) {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/api/auth/token/', { username, password });
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            setIsAuthenticated(true);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: error.response?.data?.detail || 'Login failed. Please check your credentials.' 
            };
        }
    };

    const register = async (username, email, password, password2) => {
        try {
            await api.post('/api/auth/register/', { username, email, password, password2 });
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            let message = 'Registration failed.';
            if (error.response?.data) {
                // Collect all error messages from the response object
                const errors = Object.values(error.response.data).flat();
                if (errors.length > 0) message = errors[0];
            }
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refresh');
            if (refreshToken) {
                await api.post('/api/auth/token/blacklist/', { refresh: refreshToken });
            }
        } catch (error) {
            // Even if blacklist fails (e.g. token already expired), proceed with local cleanup
            console.warn('Token blacklist failed:', error);
        } finally {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
