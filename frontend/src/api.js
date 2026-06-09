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

// Response Interceptor: Handle caching, offline queueing, and 401s
api.interceptors.response.use(
    async (response) => {
        // Cache successful GET requests for offline read
        if (response.config.method === 'get') {
            const { setCache } = await import('./utils/offlineSync.js');
            // use the full URL with params as cache key
            const url = api.getUri(response.config);
            await setCache(url, response.data);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Check if error is a network error (no response)
        if (!error.response && error.code === 'ERR_NETWORK') {
            const { getCache, enqueueSyncAction } = await import('./utils/offlineSync.js');
            const url = api.getUri(originalRequest);
            
            if (originalRequest.method === 'get') {
                // Try to serve GET from offline cache
                const cachedData = await getCache(url);
                if (cachedData) {
                    return Promise.resolve({ 
                        data: cachedData, 
                        status: 200, 
                        statusText: 'OK (Offline Cache)', 
                        headers: {}, 
                        config: originalRequest 
                    });
                }
            } else if (['post', 'put', 'patch', 'delete'].includes(originalRequest.method)) {
                // Queue write operations for background sync when online
                // Avoid queueing authentication attempts!
                if (!originalRequest.url.includes('/api/auth/')) {
                    let parsedData = null;
                    if (originalRequest.data) {
                        try {
                            parsedData = typeof originalRequest.data === 'string' 
                                ? JSON.parse(originalRequest.data) 
                                : originalRequest.data;
                        } catch (e) {
                            parsedData = originalRequest.data;
                        }
                    }

                    const responseData = parsedData ? { ...parsedData } : {};
                    let tempId = responseData.id;
                    if (!tempId && originalRequest.method === 'post') {
                        tempId = 'temp_' + Date.now();
                        responseData.id = tempId;
                        responseData.is_temp = true;
                    }

                    await enqueueSyncAction({
                        url: originalRequest.url, // save original url without getUri to keep params clean
                        method: originalRequest.method,
                        data: parsedData,
                        headers: originalRequest.headers,
                        tempId: originalRequest.method === 'post' ? tempId : null
                    });
                    
                    return Promise.resolve({
                        data: responseData,
                        status: 202,
                        statusText: 'Accepted (Offline Queued)',
                        headers: {},
                        config: originalRequest
                    });
                }
            }
        }

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

                if (res.data.refresh) {
                    localStorage.setItem('refresh', res.data.refresh);
                }

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {
                console.error('Session expired. Please login again.');
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
