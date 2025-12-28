/**
 * Application Configuration
 * Centralizes all app-specific settings for easy maintenance
 */

const APP_CONFIG = {
    // App identity
    appId: 'cip',
    appName: 'CIP® Exam Study Companion',
    appTitle: 'CIP® Exam Prep',
    
    // Cache busting version - increment when data files change
    dataVersion: 'v1',
    
    // Storage keys (prefixed to avoid conflicts)
    storageKeys: {
        viewed: 'cip_viewed_items',
        saved: 'cip_saved_items',
        notes: 'cip_notes',
        quiz: 'cip_quiz_status'
    },
    
    // Backup file naming
    backupPrefix: 'cip-backup',
    
    // Feature flags
    features: {
        documentModal: true,
        darkModeIframeSync: true
    }
};

// Freeze config to prevent accidental modification
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.storageKeys);
Object.freeze(APP_CONFIG.features);

window.APP_CONFIG = APP_CONFIG;
