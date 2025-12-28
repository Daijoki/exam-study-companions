/**
 * DataLoader - Centralized data fetching and caching
 * Handles loading all JSON files from the /data directory
 * Uses APP_CONFIG.dataVersion for cache busting
 */

const DataLoader = {
    cache: {},
    
    /**
     * Get cache-busting query string from config
     */
    getCacheBuster() {
        const version = window.APP_CONFIG?.dataVersion;
        return version ? `?${version}` : '';
    },
    
    /**
     * Generic data loader with caching
     */
    async load(filename) {
        if (this.cache[filename]) {
            return this.cache[filename];
        }
        
        try {
            const cacheBuster = this.getCacheBuster();
            const response = await fetch(`data/${filename}${cacheBuster}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.cache[filename] = data;
            return data;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            throw new Error(`Failed to load ${filename}. ${error.message}`);
        }
    },
    
    /**
     * Load all data files
     */
    async loadAll() {
        const files = [
            'glossary.json',
            'documents.json',
            'quiz.json'
        ];
        
        const results = await Promise.all(
            files.map(file => this.load(file))
        );
        
        return {
            glossary: results[0],
            documents: results[1],
            quiz: results[2]
        };
    },
    
    /**
     * Specific data loaders
     */
    async getGlossary() { return this.load('glossary.json'); },
    async getDocuments() { return this.load('documents.json'); },
    async getQuiz() { return this.load('quiz.json'); },
    async getHistoricalFoundations() { return this.load('historical-foundations.json'); },
    async getHistoricalFoundationsUrls() { return this.load('historical-foundations-urls.json'); }
};

// Make DataLoader available globally
window.DataLoader = DataLoader;
