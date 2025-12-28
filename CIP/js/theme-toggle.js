// Theme Toggle Functionality
// Respects user preference, system preference, and provides smooth transitions

(function() {
    'use strict';
    
    const STORAGE_KEY = 'primr-theme-preference';
    const DARK_STYLE_KEY = 'primr-dark-style';
    
    const DARK_STYLES = {
        slate: { name: 'Slate', emoji: '🌑' },
        aurora: { name: 'Northern Lights', emoji: '💠' },
        ocean: { name: 'Deep Sea', emoji: '🐚' },
        frost: { name: 'Frost', emoji: '❄️' },
        blacklight: { name: 'Blacklight', emoji: '🌀' },
        matrix: { name: 'Matrix', emoji: '📟' }
    };
    
    // Get theme preference from storage or system
    function getPreferredTheme() {
        try {
            const storedTheme = localStorage.getItem(STORAGE_KEY);
            if (storedTheme) {
                return storedTheme;
            }
        } catch (e) {
            // localStorage not available (incognito mode)
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    function getDarkStyle() {
        try {
            return localStorage.getItem(DARK_STYLE_KEY) || 'slate';
        } catch (e) {
            return 'slate';
        }
    }
    
    function setDarkStyle(style) {
        try {
            localStorage.setItem(DARK_STYLE_KEY, style);
        } catch (e) {
            // localStorage not available (incognito/private mode, quota exceeded, or disabled)
            console.warn('Failed to save dark style preference to localStorage:', e.message);
        }
        applyDarkStyle(style);
    }
    
    function applyDarkStyle(style) {
        if (style && style !== 'slate') {
            document.documentElement.setAttribute('data-dark-style', style);
        } else {
            document.documentElement.removeAttribute('data-dark-style');
        }
    }
    
    // Apply theme to document
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Apply dark style if in dark mode
        if (theme === 'dark') {
            applyDarkStyle(getDarkStyle());
        } else {
            document.documentElement.removeAttribute('data-dark-style');
        }
        
        // Update toggle button icon if it exists
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            updateToggleIcon(theme);
            updateToggleAria(theme);
        }
    }
    
    // Update toggle button icon
    function updateToggleIcon(theme) {
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');
        
        if (sunIcon && moonIcon) {
            if (theme === 'dark') {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            } else {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            }
        }
    }
    
    // Update ARIA attributes
    function updateToggleAria(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            themeToggle.setAttribute('aria-label', `Switch to ${newTheme} mode`);
        }
    }
    
    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch (e) {
            // localStorage not available
        }
        applyTheme(newTheme);
        
        // Announce to screen readers
        announceThemeChange(newTheme);
    }
    
    // Announce theme change to screen readers
    function announceThemeChange(theme) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Switched to ${theme} mode`;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    // Create dark style picker popup
    function showDarkStylePicker(toggleBtn) {
        // Remove existing picker
        const existing = document.getElementById('dark-style-picker');
        if (existing) {
            existing.remove();
            return;
        }
        
        const currentStyle = getDarkStyle();
        const rect = toggleBtn.getBoundingClientRect();
        
        const picker = document.createElement('div');
        picker.id = 'dark-style-picker';
        picker.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 8}px;
            left: ${rect.left}px;
            background: var(--bg-lighter, #1E293B);
            border: 1px solid var(--border-medium, #475569);
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            min-width: 140px;
        `;
        
        picker.innerHTML = `
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; padding: 0 4px;">Dark Mode Style</div>
            ${Object.entries(DARK_STYLES).map(([key, {name, emoji}]) => `
                <button data-style="${key}" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 6px 8px;
                    border: none;
                    background: ${key === currentStyle ? 'var(--primr-teal)' : 'transparent'};
                    color: ${key === currentStyle ? 'white' : 'var(--text-primary)'};
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    text-align: left;
                ">${emoji} ${name}</button>
            `).join('')}
        `;
        
        document.body.appendChild(picker);
        
        // Handle clicks
        picker.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-style]');
            if (btn) {
                setDarkStyle(btn.dataset.style);
                picker.remove();
            }
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closePickerHandler(e) {
                if (!picker.contains(e.target) && e.target !== toggleBtn) {
                    picker.remove();
                    document.removeEventListener('click', closePickerHandler);
                }
            });
        }, 0);
    }
    
    // Apply theme immediately (before page renders)
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);
    
    // Setup toggle button after DOM loads
    document.addEventListener('DOMContentLoaded', function() {
        const themeToggle = document.getElementById('theme-toggle');
        
        if (themeToggle) {
            // Set initial state
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            updateToggleIcon(currentTheme);
            updateToggleAria(currentTheme);
            
            // Add click listener
            themeToggle.addEventListener('click', toggleTheme);
            
            // Add keyboard support
            themeToggle.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleTheme();
                }
            });
            
            // Right-click or long-press shows dark style picker (only in dark mode)
            themeToggle.addEventListener('contextmenu', function(e) {
                if (document.documentElement.getAttribute('data-theme') === 'dark') {
                    e.preventDefault();
                    showDarkStylePicker(themeToggle);
                }
            });
            
            // Add hint tooltip
            themeToggle.title = 'Click to toggle • Right-click for dark styles';
        }
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', function(e) {
                // Only auto-switch if user hasn't set a preference
                let hasStoredPref = false;
                try {
                    hasStoredPref = !!localStorage.getItem(STORAGE_KEY);
                } catch (err) {
                    // localStorage not available
                }
                if (!hasStoredPref) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    });
    
    // Expose functions globally
    window.toggleTheme = toggleTheme;
    window.setDarkStyle = setDarkStyle;
})();
