/**
 * Utility Functions
 * Common helpers used across the application
 */

const Utils = {
    /**
     * Debounce function to limit how often a function is called
     * @param {Function} func - The function to debounce
     * @param {number} wait - The delay in milliseconds
     * @returns {Function} - The debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Create a loading spinner element
     * @returns {string} - HTML for loading spinner
     */
    createLoadingHTML() {
        return `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="inline-block w-12 h-12 border-4 spinner-brand rounded-full animate-spin"></div>
                    <p class="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        `;
    },

    /**
     * Create an error message element
     * @param {string} message - The error message to display
     * @returns {string} - HTML for error message
     */
    createErrorHTML(message) {
        return `
            <div class="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md" role="alert">
            <div class="flex items-start">
                    <div class="flex-shrink-0 text-red-600">
                        <!-- Use custom error icon if available, otherwise fall back to original SVG -->
                        ${(window.ICONS && window.ICONS.error) || '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>'}
                    </div>
                    <div class="ml-3 flex-1">
                        <h3 class="text-lg font-semibold text-red-800">Unable to Load Content</h3>
                        <p class="mt-2 text-red-700">${message}</p>
                        <button onclick="location.reload()" 
                                class="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, (char) => {
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[char];
        });
    }
};

// Make Utils available globally
window.Utils = Utils;
