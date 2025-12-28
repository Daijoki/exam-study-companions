/**
 * State Manager
 * Handles tracking of viewed/read items and saved items with localStorage persistence
 * Uses APP_CONFIG for storage keys to support multiple app instances
 */

class StateManager {
    constructor() {
        // Get storage keys from config, with fallbacks
        const config = window.APP_CONFIG || {};
        const keys = config.storageKeys || {};
        
        this.STORAGE_KEYS = {
            VIEWED: keys.viewed || 'app_viewed_items',
            SAVED: keys.saved || 'app_saved_items',
            NOTES: keys.notes || 'app_notes',
            QUIZ: keys.quiz || 'app_quiz_status'
        };
        
        this.listeners = [];
        this.storageAvailable = this.checkStorageAvailable();
        this.init();
    }
    
    /**
     * Check if localStorage is available (fails in incognito/private mode)
     */
    checkStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            // Show one-time warning to user
            console.warn('localStorage not available - progress will not be saved');
            return false;
        }
    }
    
    init() {
        // Load from localStorage
        this.viewedItems = this.loadFromStorage(this.STORAGE_KEYS.VIEWED) || {};
        this.savedItems = this.loadFromStorage(this.STORAGE_KEYS.SAVED) || {};
        this.notes = this.loadFromStorage(this.STORAGE_KEYS.NOTES) || {};
        this.quizStatus = this.loadFromStorage(this.STORAGE_KEYS.QUIZ) || {};
    }
    
    loadFromStorage(key) {
        if (!this.storageAvailable) return null;
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }
    
    saveToStorage(key, data) {
        if (!this.storageAvailable) return;
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }
    
    markAsViewed(url, context = {}) {
        this.viewedItems[url] = {
            timestamp: Date.now(),
            ...context
        };
        this.saveToStorage(this.STORAGE_KEYS.VIEWED, this.viewedItems);
        this.notifyListeners('viewed', url, true);
    }
    
    markAsUnread(url) {
        delete this.viewedItems[url];
        this.saveToStorage(this.STORAGE_KEYS.VIEWED, this.viewedItems);
        this.notifyListeners('viewed', url, false);
    }
    
    toggleViewed(url, context = {}) {
        if (this.isViewed(url)) {
            this.markAsUnread(url);
        } else {
            this.markAsViewed(url, context);
        }
    }
    
    isViewed(url) {
        return url in this.viewedItems;
    }
    
    saveItem(itemId, context) {
        this.savedItems[itemId] = {
            timestamp: Date.now(),
            ...context
        };
        this.saveToStorage(this.STORAGE_KEYS.SAVED, this.savedItems);
        this.notifyListeners('saved', itemId, true);
    }
    
    unsaveItem(itemId) {
        delete this.savedItems[itemId];
        this.saveToStorage(this.STORAGE_KEYS.SAVED, this.savedItems);
        this.notifyListeners('saved', itemId, false);
    }
    
    toggleSaved(itemId, context = {}) {
        if (this.isSaved(itemId)) {
            this.unsaveItem(itemId);
        } else {
            this.saveItem(itemId, context);
        }
    }
    
    isSaved(itemId) {
        return itemId in this.savedItems;
    }
    
    getSavedItems() {
        return Object.entries(this.savedItems).map(([itemId, data]) => ({
            itemId,
            ...data
        })).sort((a, b) => b.timestamp - a.timestamp);
    }
    
    getViewedItems() {
        return Object.entries(this.viewedItems).map(([url, data]) => ({
            url,
            ...data
        })).sort((a, b) => b.timestamp - a.timestamp);
    }

    // ===== Notes API =====
    saveNote(itemId, data) {
        if (!itemId) return;
        const existing = (this.notes && this.notes[itemId]) || {};
        this.notes[itemId] = {
            ...existing,
            ...data,
            timestamp: Date.now()
        };
        this.saveToStorage(this.STORAGE_KEYS.NOTES, this.notes);
        this.notifyListeners('note', itemId, true);
    }

    deleteNote(itemId) {
        if (!itemId || !this.notes) return;
        if (this.notes[itemId]) {
            delete this.notes[itemId];
            this.saveToStorage(this.STORAGE_KEYS.NOTES, this.notes);
            this.notifyListeners('note', itemId, false);
        }
    }

    getNote(itemId) {
        return (this.notes && this.notes[itemId]) || null;
    }

    hasNote(itemId) {
        return !!(this.notes && this.notes[itemId]);
    }

    getAllNotes() {
        if (!this.notes) return [];
        return Object.entries(this.notes).map(([id, data]) => ({
            id,
            ...data
        })).sort((a, b) => b.timestamp - a.timestamp);
    }

    getQuizStatus(itemId) {
        if (!this.quizStatus) return null;
        return this.quizStatus[itemId] || null;
    }

    setQuizStatus(itemId, status) {
        if (!itemId) return;
        if (!this.quizStatus) this.quizStatus = {};
        this.quizStatus[itemId] = {
            ...(this.quizStatus[itemId] || {}),
            ...status,
            updatedAt: Date.now()
        };
        this.saveToStorage(this.STORAGE_KEYS.QUIZ, this.quizStatus);
    }

    clearQuizStatus(itemId) {
        if (!this.quizStatus || !itemId) return;
        if (this.quizStatus[itemId]) {
            delete this.quizStatus[itemId];
            this.saveToStorage(this.STORAGE_KEYS.QUIZ, this.quizStatus);
        }
    }

    clearAllQuizStatus() {
        this.quizStatus = {};
        this.saveToStorage(this.STORAGE_KEYS.QUIZ, this.quizStatus);
    }

    // ===== Backup & Export System =====
    
    /**
     * Export all data (read status, stars, notes) as JSON
     * @returns {Object} Complete backup object
     */
    exportData() {
        const config = window.APP_CONFIG || {};
        return {
            version: '1.0',
            appId: config.appId || 'unknown',
            exportDate: new Date().toISOString(),
            data: {
                viewed: this.viewedItems || {},
                saved: this.savedItems || {},
                notes: this.notes || {},
                quiz: this.quizStatus || {}
            },
            stats: {
                viewedCount: Object.keys(this.viewedItems || {}).length,
                savedCount: Object.keys(this.savedItems || {}).length,
                notesCount: Object.keys(this.notes || {}).length,
                quizCount: Object.keys(this.quizStatus || {}).length
            }
        };
    }

    /**
     * Download backup as JSON file
     */
    downloadBackup() {
        const config = window.APP_CONFIG || {};
        const prefix = config.backupPrefix || 'app-backup';
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import/restore data from backup object
     * @param {Object} backupData - The backup object to restore
     * @param {boolean} merge - If true, merge with existing data. If false, replace.
     * @returns {Object} Import results
     */
    importData(backupData, merge = false) {
        try {
            if (!backupData || !backupData.data) {
                throw new Error('Invalid backup format');
            }

            const imported = {
                viewed: 0,
                saved: 0,
                notes: 0,
                quiz: 0,
                errors: []
            };

            // Import viewed items
            if (backupData.data.viewed) {
                if (merge) {
                    this.viewedItems = { ...this.viewedItems, ...backupData.data.viewed };
                } else {
                    this.viewedItems = backupData.data.viewed;
                }
                imported.viewed = Object.keys(backupData.data.viewed).length;
                this.saveToStorage(this.STORAGE_KEYS.VIEWED, this.viewedItems);
            }

            // Import saved items
            if (backupData.data.saved) {
                if (merge) {
                    this.savedItems = { ...this.savedItems, ...backupData.data.saved };
                } else {
                    this.savedItems = backupData.data.saved;
                }
                imported.saved = Object.keys(backupData.data.saved).length;
                this.saveToStorage(this.STORAGE_KEYS.SAVED, this.savedItems);
            }

            // Import notes
            if (backupData.data.notes) {
                if (merge) {
                    this.notes = { ...this.notes, ...backupData.data.notes };
                } else {
                    this.notes = backupData.data.notes;
                }
                imported.notes = Object.keys(backupData.data.notes).length;
                this.saveToStorage(this.STORAGE_KEYS.NOTES, this.notes);
            }

            // Import quiz status
            if (backupData.data.quiz) {
                if (merge) {
                    this.quizStatus = { ...this.quizStatus, ...backupData.data.quiz };
                } else {
                    this.quizStatus = backupData.data.quiz;
                }
                imported.quiz = Object.keys(backupData.data.quiz).length;
                this.saveToStorage(this.STORAGE_KEYS.QUIZ, this.quizStatus);
            }

            // Notify all listeners to update UI
            this.notifyListeners('import', 'all', true);

            return {
                success: true,
                imported
            };

        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Restore from uploaded JSON file
     * @param {File} file - The backup file
     * @param {boolean} merge - If true, merge with existing data
     */
    async restoreFromFile(file, merge = false) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    const result = this.importData(backupData, merge);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data (read status, stars, notes, and quiz status)? This cannot be undone.')) {
            this.viewedItems = {};
            this.savedItems = {};
            this.notes = {};
            this.quizStatus = {};
            this.saveToStorage(this.STORAGE_KEYS.VIEWED, this.viewedItems);
            this.saveToStorage(this.STORAGE_KEYS.SAVED, this.savedItems);
            this.saveToStorage(this.STORAGE_KEYS.NOTES, this.notes);
            this.saveToStorage(this.STORAGE_KEYS.QUIZ, this.quizStatus);
            this.notifyListeners('clear', 'all', false);
            return true;
        }
        return false;
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }
    
    notifyListeners(type, url, status) {
        this.listeners.forEach(callback => {
            try {
                callback(type, url, status);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }
    
    /**
     * Check if storage is available (for UI to show warnings)
     */
    isStorageAvailable() {
        return this.storageAvailable;
    }
}

// Initialize global state manager
window.stateManager = new StateManager();
