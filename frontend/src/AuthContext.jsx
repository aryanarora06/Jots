import React, { createContext, useState, useEffect } from 'react';
import api from './api';
import { googleLogout } from '@react-oauth/google';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await api.get('/api/auth/me/');
            setUser(res.data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('access');
        if (token) {
            setIsAuthenticated(true);
            fetchUser();
        }
        setIsLoading(false);
    }, []);

    const login = async (credential) => {
        try {
            const response = await api.post('/api/auth/google/', { credential });
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            setIsAuthenticated(true);
            await fetchUser();
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: error.response?.data?.error || 'Google login failed.' 
            };
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
            googleLogout();
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            setIsAuthenticated(false);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
