/**
 * Application Configuration
 * Centralizes all app-specific settings for easy maintenance
 */

const APP_CONFIG = {
    // App identity
    appId: 'cpia',
    appName: 'CPIA® Exam Study Companion',
    appTitle: 'CPIA® Exam Prep',
    
    // Cache busting version - increment when data files change
    dataVersion: 'v1',
    
    // Storage keys (prefixed to avoid conflicts)
    storageKeys: {
        viewed: 'cpia_viewed_items',
        saved: 'cpia_saved_items',
        notes: 'cpia_notes',
        quiz: 'cpia_quiz_status'
    },
    
    // Backup file naming
    backupPrefix: 'cpia-backup',
    
    // Feature flags
    features: {
        documentModal: false,
        darkModeIframeSync: false
    }
};

// Freeze config to prevent accidental modification
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.storageKeys);
Object.freeze(APP_CONFIG.features);

window.APP_CONFIG = APP_CONFIG;
