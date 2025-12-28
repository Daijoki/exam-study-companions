/**
 * Saved Drawer
 * Shows all starred/saved items grouped by type
 */

class SavedDrawer {
    static STAR_OUTLINE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    static STAR_FILLED_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    static __instance = null;
    constructor() {
        SavedDrawer.__instance = this;
        this.stateManager = window.stateManager;
        this.isOpen = false;
        this.currentView = 'category'; // 'category' or 'all'
        
        this.createDrawerHTML();
        this.setupEventListeners();
        
        if (this.stateManager) {
            this.stateManager.addListener(() => {
                if (this.isOpen) this.render();
                this.updateBadge();
            });
        }
        
        this.updateBadge();
        
        // =================================================================
        // FIXED: Make the drawer non-focusable by default on page load.
        // =================================================================
        this.updateFocusability(false);
    }
    
    // =================================================================
    // FIXED: New helper function to control focus of drawer contents.
    // =================================================================
    updateFocusability(isFocusable) {
        if (!this.drawer) return;
        
        const focusableElements = this.drawer.querySelectorAll(
            'a[href], button:not([disabled])'
        );
        
        if (isFocusable) {
            // Allow elements to be focused
            focusableElements.forEach(el => el.removeAttribute('tabindex'));
        } else {
            // Prevent elements from being focused
            focusableElements.forEach(el => el.setAttribute('tabindex', '-1'));
        }
    }
    
    createDrawerHTML() {
        const html = `
            <button id="saved-drawer-toggle" 
                    class="fixed right-4 top-24 z-40 fab-brand text-white p-3 rounded-full"
                    aria-label="Open saved items"
                    title="View your saved items"
                    aria-expanded="false">
                <span class="text-xl">${SavedDrawer.STAR_OUTLINE_SVG}</span>
                <span id="saved-count-badge" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center hidden">0</span>
            </button>
            
            <div id="saved-drawer-overlay" 
                 class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity"></div>
            
            <aside id="saved-drawer" 
                   class="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform translate-x-full transition-transform duration-300" role="dialog" aria-modal="true" aria-labelledby="saved-drawer-title" data-testid="saved-drawer">
                <div class="flex flex-col h-full">
                    <div class="drawer-header">
                        <div class="flex items-center justify-between p-4 border-b border-white/20">
                            <h2 id="saved-drawer-title" class="text-xl font-bold flex items-center gap-2 text-white">
                                <span>${SavedDrawer.STAR_OUTLINE_SVG}</span> Saved Items
                            </h2>
                            <button id="saved-drawer-close" 
                                    class="text-white hover:bg-white/20 p-2 rounded flex items-center justify-center"
                                    aria-label="Close saved items drawer">
                                <span class="text-xl">${(window.ICONS && window.ICONS.cross) || '&times;'}</span>
                            </button>
                        </div>
                        <div class="flex gap-2 px-4 pb-3">
                            <button class="saved-view-tab flex-1 px-3 py-2 rounded-t text-sm font-semibold transition-colors active" data-view="category">
                                By Tab
                            </button>
                            <button class="saved-view-tab flex-1 px-3 py-2 rounded-t text-sm font-semibold transition-colors" data-view="all">
                                All Items
                            </button>
                        </div>
                    </div>
                    <div id="saved-drawer-content" class="flex-1 overflow-y-auto bg-gray-50"></div>
                </div>
            </aside>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        this.drawer = document.getElementById('saved-drawer');
        this.overlay = document.getElementById('saved-drawer-overlay');
        this.toggle = document.getElementById('saved-drawer-toggle');
        
        if (!this.toggle) {
            this.toggle = document.createElement('button');
            this.toggle.id = 'saved-drawer-toggle';
            this.toggle.setAttribute('aria-label','Open saved drawer');
            this.toggle.className = 'fixed right-4 top-20 z-50 rounded-full shadow-lg fab-brand text-white w-12 h-12 flex items-center justify-center';
            this.toggle.innerHTML = SavedDrawer.STAR_OUTLINE_SVG;
            document.body.appendChild(this.toggle);
        }
        Object.assign(this.toggle.style, { position:'fixed', right:'16px', top:'80px', pointerEvents:'auto', display:'' });
        this.closeBtn = document.getElementById('saved-drawer-close');
        this.content = document.getElementById('saved-drawer-content');
        this.countBadge = document.getElementById('saved-count-badge');
    }
    
    setupEventListeners() {
        this.toggle.addEventListener('click', () => this.toggleDrawer());
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        
        // Tab switching
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('.saved-view-tab');
            if (tab) {
                const view = tab.dataset.view;
                this.currentView = view;
                
                // Update active tab
                document.querySelectorAll('.saved-view-tab').forEach(t => {
                    t.classList.remove('active', 'bg-white', 'text-gray-800');
                    t.classList.add('text-white/70', 'hover:text-white');
                });
                tab.classList.add('active', 'bg-white', 'text-gray-800');
                tab.classList.remove('text-white/70', 'hover:text-white');
                
                this.render();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }
    
    toggleDrawer() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.render();
        this.overlay.classList.remove('hidden');
        this.drawer.classList.remove('translate-x-full');
        this.toggle.setAttribute('aria-expanded', 'true');
        
        // =================================================================
        // FIXED: Make contents focusable when the drawer opens.
        // =================================================================
        this.updateFocusability(true);
        
        setTimeout(() => this.closeBtn.focus(), 300);
    }
    
    close() {
        this.isOpen = false;
        this.drawer.classList.add('translate-x-full');
        this.toggle.setAttribute('aria-expanded', 'false');

        // =================================================================
        // FIXED: Make contents non-focusable when the drawer closes.
        // =================================================================
        this.updateFocusability(false);
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
        }, 300);
        
        this.toggle.focus();
    }
    
    updateBadge() {
        if (!this.stateManager) return;
        const count = this.stateManager.getSavedItems().length;
        if (count > 0) {
            this.countBadge.textContent = count;
            this.countBadge.classList.remove('hidden');
        } else {
            this.countBadge.classList.add('hidden');
        }
    }
    
    render() {
        if (!this.stateManager) return;
        
        const items = this.stateManager.getSavedItems();
        
        if (items.length === 0) {
            this.content.innerHTML = `
                <div class="text-center text-gray-500 py-12">
                    <div class="mb-4">
                        <span class="inline-block text-6xl">${ICONS.starOutline}</span>
                    </div>
                    <p class="text-lg">No saved items yet</p>
                    <p class="text-sm mt-2">Click <span class="inline-block align-middle">${ICONS.starOutline}</span> next to any item to save it</p>
                </div>
            `;
            return;
        }
        
        if (this.currentView === 'all') {
            this.renderAllView(items);
        } else {
            this.renderCategoryView(items);
        }
        
        // Add unsave listeners
        this.content.querySelectorAll('.unsave-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = btn.dataset.itemId;
                this.stateManager.unsaveItem(itemId);
                
                // Update the star on the actual item in the tab
                this.updateItemStar(itemId, false);
            });
        });
        
        // Add saved item navigation listeners
        this.content.querySelectorAll('.saved-item-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToItem(btn.dataset.itemId, btn.dataset.tab);
            });
        });
    }
    
    navigateToItem(itemId, tab) {
        // Close the drawer
        this.close();
        
        // Switch to the correct tab
        const tabMap = {
            'documents': '#documents',
            'glossary': '#glossary',
            'historical': '#historical',
            'knowledge-check': '#quiz'
        };
        
        const tabSelector = tabMap[tab];
        if (tabSelector) {
            const tabBtn = document.querySelector(`.nav-tab[data-tab-target="${tabSelector}"]`);
            if (tabBtn) tabBtn.click();
            
            // Special handling for historical foundations - switch browse mode
            if (tab === 'historical') {
                setTimeout(() => {
                    // Determine if it's a case, theme, or event based on itemId
                    const isCase = itemId.includes('historical-case');
                    const isTheme = itemId.includes('historical-theme');
                    const isEvent = itemId.includes('timeline-');
                    
                    if (isCase) {
                        const browseByCaseBtn = document.getElementById('browse-by-case');
                        if (browseByCaseBtn) browseByCaseBtn.click();
                    } else if (isTheme) {
                        const browseByThemeBtn = document.getElementById('browse-by-theme');
                        if (browseByThemeBtn) browseByThemeBtn.click();
                    }
                    
                    // Wait for browse mode content to render, then highlight
                    setTimeout(() => {
                        this.highlightItem(itemId);
                    }, 200);
                }, 300);
            } else {
                // For other tabs, highlight immediately after tab switch
                setTimeout(() => {
                    this.highlightItem(itemId);
                }, 300);
            }
        }
    }
    
    highlightItem(itemId) {
        const element = document.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`);
        if (element) {
            // Prefer the main card/container (historical, docs, glossary, etc.)
            const container =
              (element.closest && (element.closest('.historical-card') || element.closest('.doc-card') || element.closest('.glossary-card'))) ||
              element;
            
            // Try to find the actual title text within the container
            let titleElement =
              container.querySelector('h1, h2, h3, h4, .doc-title, .historical-title') ||
              (container.classList.contains('doc-title') || container.tagName === 'H3' || container.tagName === 'H4' ? container : null);
            
            // Fallbacks: search inside the original element, then fall back to container
            if (!titleElement) {
              titleElement =
                element.querySelector('h1, h2, h3, h4, .doc-title, .historical-title') ||
                element;
            }
            
            titleElement.classList.add('search-highlight');
            // Use 'start' for mobile, 'center' for desktop (mobile has viewport issues with centering)
            const isMobile = window.innerWidth <= 768;
            element.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'center' });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                titleElement.classList.remove('search-highlight');
            }, 3000);
        }
    }
    
    updateItemStar(itemId, isSaved) {
        // Find the item's star button in the current tab and update it
        const element = document.querySelector(`[data-item-id="${itemId}"]`);
        if (element) {
            const starBtn = element.querySelector('.term-star-btn, .case-star-btn, .theme-star-btn, .event-star-btn, .question-star-btn, .doc-star-btn');
            if (starBtn) {
                const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
                starBtn.innerHTML = starIcon;
                starBtn.setAttribute('title', isSaved ? 'Unsave item' : 'Save item');
            }
        }
    }
    
    renderAllView(items) {
        // Custom alphanumeric sort that handles leading numbers properly
        const sorted = [...items].sort((a, b) => {
            // Extract leading numbers if present
            const aMatch = a.title.match(/^(\d+)/);
            const bMatch = b.title.match(/^(\d+)/);
            
            // If both start with numbers, compare numerically
            if (aMatch && bMatch) {
                const aNum = parseInt(aMatch[1], 10);
                const bNum = parseInt(bMatch[1], 10);
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
                // If numbers are equal, compare the rest of the string
                return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            }
            
            // If only one starts with a number, number comes first
            if (aMatch) return -1;
            if (bMatch) return 1;
            
            // Otherwise, regular alphabetical sort
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });
        
        // **UPDATED**: Use a <ul> and wrap items in <li>
        const html = `
            <ul class="divide-y divide-gray-200 bg-white">
                ${sorted.map(item => `<li>${this.renderItem(item, true)}</li>`).join('')}
            </ul>
        `;
        
        this.content.innerHTML = html;
    }
    
    renderCategoryView(items) {
        // Group by type in tab order
        const grouped = {
            'Documents': items.filter(i => i.type === 'document'),
            'Glossary': items.filter(i => i.type === 'glossary'),
            'Historical Foundations': items.filter(i => i.type === 'historical-case' || i.type === 'historical-theme' || i.type === 'historical-event' || i.type === 'historical'),
            'Knowledge Checks': items.filter(i => i.type === 'knowledge-check')
        };
        
        let html = '';
        for (const [type, typeItems] of Object.entries(grouped)) {
            if (typeItems.length === 0) continue;
            
            // Custom alphanumeric sort that handles leading numbers properly
            const sorted = [...typeItems].sort((a, b) => {
                // Extract leading numbers if present
                const aMatch = a.title.match(/^(\d+)/);
                const bMatch = b.title.match(/^(\d+)/);
                
                // If both start with numbers, compare numerically
                if (aMatch && bMatch) {
                    const aNum = parseInt(aMatch[1], 10);
                    const bNum = parseInt(bMatch[1], 10);
                    if (aNum !== bNum) {
                        return aNum - bNum;
                    }
                    // If numbers are equal, compare the rest of the string
                    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
                }
                
                // If only one starts with a number, number comes first
                if (aMatch) return -1;
                if (bMatch) return 1;
                
                // Otherwise, regular alphabetical sort
                return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            });
            
            // **UPDATED**: Use <section>, sticky <h3> with count, and <ul>
            html += `
                <section class="bg-white">
                    <h3 class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 sticky top-0">${type} (${sorted.length})</h3>
                    <ul class="divide-y divide-gray-100">
                        ${sorted.map(item => `<li>${this.renderItem(item, false)}</li>`).join('')}
                    </ul>
                </section>
            `;
        }
        
        // **UPDATED**: Wrap sections in a divider
        this.content.innerHTML = `<div class="divide-y divide-gray-200">${html}</div>`;
    }
    
    renderItem(item, showTypeLabel = false) {
        const displayTitle = item.title || 'Untitled';
        const typeLabel = this.getTypeLabel(item.type);
        
        // For historical items, determine if it's a case, theme, or event
        let subtitle = '';
        if (showTypeLabel) {
            subtitle = typeLabel;
        } else if (item.type === 'historical-case' || item.type === 'historical-theme' || item.type === 'historical-event' || item.type === 'historical') {
            // Historical items show full label even in category view
            if (item.type === 'historical-case') {
                subtitle = 'Historical Case';
            } else if (item.type === 'historical-theme') {
                subtitle = 'Historical Theme';
            } else {
                subtitle = 'Historical Foundations';
            }
        }
        
        // **UPDATED**: Simplified wrapper to fit inside an <li>
        return `
            <div class="bg-white p-3 transition-colors hover:bg-blue-50">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <button class="saved-item-link text-blue-600 hover:underline font-medium text-sm block text-left w-full"
                           data-item-id="${item.itemId}"
                           data-tab="${item.tab}"
                           data-type="${item.type}">
                            ${this.escapeHtml(displayTitle)}
                        </button>
                        ${subtitle ? `<div class="text-xs text-gray-500 mt-1">${subtitle}</div>` : ''}
                    </div>
                    <button class="unsave-btn text-lg flex-shrink-0 hover:scale-110 transition-transform" 
                            data-item-id="${item.itemId}" 
                            title="Unsave item"
                            aria-label="Unsave ${this.escapeHtml(displayTitle)}">${SavedDrawer.STAR_FILLED_SVG}</button>
                </div>
            </div>
        `;
    }
    
    getTypeLabel(type) {
        const labels = {
            'document': 'Document',
            'glossary': 'Glossary Term',
            'historical-case': 'Historical Case',
            'historical-theme': 'Historical Theme',
            'historical-event': 'Historical Foundations',
            'historical': 'Historical Foundations',
            'knowledge-check': 'Knowledge Check Question'
        };
        return labels[type] || type;
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize saved drawer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.savedDrawer = new SavedDrawer();
});
window.__toggleSavedDrawer = function(){try{SavedDrawer.__instance&&SavedDrawer.__instance.toggleDrawer();}catch(e){}};