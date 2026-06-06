import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : 'http://127.0.0.1:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and refresh token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Avoid looping on auth endpoints (login and refresh)
            if (originalRequest.url.includes('/api/auth/token/')) {
                if (originalRequest.url.includes('/refresh/')) {
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                const refreshToken = localStorage.getItem('refresh');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Attempt to refresh the token
                const res = await axios.post(`${api.defaults.baseURL}/api/auth/token/refresh/`, {
                    refresh: refreshToken,
                });

                const newAccessToken = res.data.access;
                localStorage.setItem('access', newAccessToken);

                // SimpleJWT rotates refresh tokens: the old one is blacklisted,
                // so we MUST save the new one or the next refresh will fail.
                if (res.data.refresh) {
                    localStorage.setItem('refresh', res.data.refresh);
                }

                // Update the header and retry the original request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {
                console.error('Session expired. Please login again.');
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                // Force redirect to login
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
