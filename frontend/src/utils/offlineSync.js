import { openDB } from 'idb';

const DB_NAME = 'jots-offline-db';
const DB_VERSION = 1;

// Initialize the IndexedDB
export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store for caching GET responses
            if (!db.objectStoreNames.contains('cache')) {
                db.createObjectStore('cache');
            }
            // Store for queuing offline mutations (POST, PUT, DELETE)
            if (!db.objectStoreNames.contains('sync-queue')) {
                db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
};

// ==========================================
// Cache API (Read caching)
// ==========================================

export const setCache = async (key, data) => {
    const db = await initDB();
    await db.put('cache', data, key);
};

export const getCache = async (key) => {
    const db = await initDB();
    return await db.get('cache', key);
};

export const clearCache = async () => {
    const db = await initDB();
    await db.clear('cache');
};

// ==========================================
// Sync Queue API (Write queuing)
// ==========================================

export const enqueueSyncAction = async (action) => {
    // action: { url, method, data, headers }
    const db = await initDB();
    await db.add('sync-queue', {
        ...action,
        timestamp: Date.now(),
    });
};

export const getSyncQueue = async () => {
    const db = await initDB();
    return await db.getAll('sync-queue');
};

export const removeSyncAction = async (id) => {
    const db = await initDB();
    await db.delete('sync-queue', id);
};

export const clearSyncQueue = async () => {
    const db = await initDB();
    await db.clear('sync-queue');
};

// ==========================================
// Background Processing
// ==========================================

export const processSyncQueue = async (apiClient) => {
    if (!navigator.onLine) return false; // Still offline

    const queue = await getSyncQueue();
    if (queue.length === 0) return true; // Nothing to sync

    let allSuccessful = true;
    let idMap = {}; // Maps tempId -> realId

    for (const action of queue) {
        try {
            // Map temp IDs to real IDs in the URL and Payload if needed
            let finalUrl = action.url;
            let finalData = action.data;
            let dataStr = finalData ? JSON.stringify(finalData) : null;
            
            for (const [tempId, realId] of Object.entries(idMap)) {
                if (finalUrl.includes(tempId)) {
                    finalUrl = finalUrl.replace(tempId, realId);
                }
                if (dataStr && dataStr.includes(tempId)) {
                    dataStr = dataStr.replace(new RegExp(tempId, 'g'), realId);
                }
            }
            if (dataStr) finalData = JSON.parse(dataStr);

            const res = await apiClient({
                url: finalUrl,
                method: action.method,
                data: finalData,
                headers: action.headers
            });

            // If this was a POST that generated a temp ID, store the real ID the server returned
            if (action.method === 'post' && action.tempId && res.data && res.data.id) {
                idMap[action.tempId] = res.data.id;
            }

            await removeSyncAction(action.id);
        } catch (error) {
            console.error('Failed to sync offline action:', action, error);
            // If it's a 4xx error (e.g. invalid data or already deleted), drop it to avoid infinite loops
            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                await removeSyncAction(action.id);
            } else {
                allSuccessful = false;
            }
        }
    }
    return allSuccessful;
};
