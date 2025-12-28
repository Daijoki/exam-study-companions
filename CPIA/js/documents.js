/**
 * Documents Manager
 * Handles document repository rendering and click handling
 */

class DocumentsManager {
    constructor() {
        this.data = null;
        this.container = document.getElementById('documents-container');
        this.stateManager = window.stateManager;
    }
    
    async init() {
        this.showLoading();
        
        try {
            this.data = await DataLoader.getDocuments();
            if (!this.data || !this.data.categories) {
                throw new Error('Invalid data structure');
            }
            this.render();
            this.setupEventListeners();
            
            // Listen to state changes to update UI
            if (this.stateManager) {
                this.stateManager.addListener(() => {
                    // Re-render to update visual state
                    this.updateDocumentStates();
                });
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
            this.showError('Unable to load documents. Please check your connection and try again.');
        }
    }
    
    showLoading() {
        this.container.innerHTML = Utils.createLoadingHTML();
    }
    
    showError(message) {
        this.container.innerHTML = Utils.createErrorHTML(message);
    }
    
    openDocument(url, title, description) {
        if (url) {
            // Mark as viewed when opened
            if (this.stateManager) {
                this.stateManager.markAsViewed(url, {
                    type: 'document',
                    title: title,
                    source: 'Documents'
                });
            }
            window.open(url, '_blank');
        }
    }
    
    setupEventListeners() {
        this.container.addEventListener('click', (e) => {
            // Handle star button
            const starBtn = e.target.closest('.doc-star-btn');
            if (starBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = starBtn.closest('.doc-card');
                if (card) {
                    const url = card.dataset.url;
                    const title = card.querySelector('h4')?.textContent?.replace(/📗\s*/, '').trim();
                    this.stateManager?.toggleSaved(url, {
                        type: 'document',
                        title: title,
                        tab: 'documents'
                    });
                }
                return;
            }
            
            // Handle read toggle button
            const readIndicator = e.target.closest('.read-indicator');
            if (readIndicator) {
                e.preventDefault();
                e.stopPropagation();
                const card = readIndicator.closest('.doc-card');
                if (card) {
                    const url = card.dataset.url;
                    const title = card.querySelector('h4')?.textContent?.replace(/📗\s*/, '').trim();
                    this.stateManager?.toggleViewed(url, {
                        type: 'document',
                        title: title,
                        source: 'Documents'
                    });
                }
                return;
            }
            
            // Handle card link click - mark as viewed before navigation
            const card = e.target.closest('.doc-card');
            if (card && card.dataset.url) {
                const title = card.querySelector('h4')?.textContent?.replace(/📗\s*/, '').trim();
                if (this.stateManager) {
                    this.stateManager.markAsViewed(card.dataset.url, {
                        type: 'document',
                        title: title,
                        source: 'Documents'
                    });
                }
                // Let the anchor tag handle the navigation
            }
        });
    }
    
    updateDocumentStates() {
        // Re-render to update visual state
        this.render();
    }
    
    renderCategory(category) {
        const docs = this.data.categories[category];
        if (!docs || docs.length === 0) return '';
        
        const categoryConfig = {
            'aaalac': { title: 'AAALAC International', color: 'doc-card-blue', border: 'border-blue-200' },
            'aalas': { title: 'American Association for Laboratory Animal Science (AALAS)', color: 'doc-card-green', border: 'border-green-200' },
            'iacuc-guidebook': { title: 'IACUC Guidebook', color: 'doc-card-blue', border: 'border-blue-200' },
            'avma': { title: 'AVMA Guidelines', color: 'doc-card-orange', border: 'border-orange-200' },
            'dod': { title: 'Department of Defense Requirements', color: 'from-red-500 to-pink-600', border: 'border-red-200' },
            'va': { title: 'Department of Veterans Affairs Requirements', color: 'from-indigo-500 to-blue-600', border: 'border-indigo-200' },
            'ag-guide': { title: 'Agricultural Animal Guide', color: 'from-green-500 to-emerald-600', border: 'border-green-200' },
            'guide': { title: 'Guide for the Care and Use of Laboratory Animals', color: 'from-teal-500 to-cyan-600', border: 'border-teal-200' },
            'nuremberg': { title: 'Historical Ethics Codes', color: 'from-purple-500 to-pink-600', border: 'border-purple-200' },
            'olaw': { title: 'NIH Office of Laboratory Animal Welfare (OLAW)', color: 'from-blue-500 to-indigo-600', border: 'border-blue-200' },
            'phs-policy': { title: 'Public Health Service Policy', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-200' },
            'usda': { title: 'USDA Animal Welfare Act', color: 'from-orange-500 to-red-600', border: 'border-orange-200' },
            'training': { title: 'Study Aids and Resources', color: 'from-purple-500 to-indigo-600', border: 'border-purple-200' }
        };
        
        const config = categoryConfig[category];
        if (!config) return ''; // Skip unknown categories
        
        const gradient = ['dod', 'va', 'ag-guide', 'guide', 'nuremberg', 'olaw', 'phs-policy', 'usda', 'training'].includes(category) ? 'bg-gradient-to-br' : '';
        
        const docsHtml = docs.map(doc => {
            const isViewed = this.stateManager?.isViewed(doc.url);
            const isSaved = this.stateManager?.isSaved(doc.url);
            
            /*
             * Build the read indicator.  To align with the rest of the
             * application (glossary, historical, etc.), we only show a
             * green "Read" pill with a check icon once the user has
             * actually viewed the document.  For unseen documents, we
             * omit the indicator entirely rather than showing a
             * "Mark as read" button.  This keeps the interface clean
             * and avoids confusing users about the meaning of the grey
             * pill.
             */
            let readButton = '';
            if (isViewed) {
                readButton = `<button title="Mark as unread" aria-label="Mark as unread" class="read-indicator text-xs px-2 py-1 rounded cursor-pointer bg-green-100 text-green-700 hover:bg-green-200" title="Mark as unread" aria-label="Mark as unread">
                    <span class="inline-block mr-1 align-middle">${ICONS.check}</span><span>Read</span>
                  </button>`;
            }


            const itemId = doc.url;
            const hasNote = this.stateManager && typeof this.stateManager.hasNote === 'function'
              ? this.stateManager.hasNote(itemId)
              : false;

            return `
            <a href="${doc.url}" 
               target="_blank"
               rel="noopener noreferrer"
               class="doc-card relative ${gradient} ${config.color} text-white p-4 rounded-lg shadow-md cursor-pointer block no-underline" 
               data-url="${doc.url}"
               data-item-id="${doc.url}"
               aria-label="${doc.title} (opens in new window)">
                <div class="flex justify-between items-start gap-2 mb-2">
                    <h4 class="font-bold flex-1 doc-title">${doc.title} <span aria-hidden="true" class="text-sm ml-1 inline-flex items-center" data-icon="externalLink"></span></h4>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${readButton}
                        <button class="doc-star-btn text-xl hover:scale-110 transition-transform leading-none" 
                                title="${isSaved ? 'Unsave item' : 'Save item'}"
                                style="cursor: pointer; pointer-events: auto;">
                            ${isSaved ? ICONS.starFilled : ICONS.starOutline}
                        </button>
                        <button class="ml-1 text-lg flex-shrink-0 hover:scale-110 transition-transform"
                                data-note-btn="true"
                                data-note-id="${itemId}"
                                data-note-type="document"
                                data-note-label="${doc.title}"
                                data-note-source="${config.title}"
                                title="Add note">
                          <span data-note-icon>${hasNote ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
                        </button>
                    </div>
                </div>
                ${doc.description ? `<p class="text-sm opacity-90">${doc.description}</p>` : ''}
            </a>
        `;
        }).join('');
        
        return `
            <div>
                <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b-2 ${config.border} pb-2">${config.title}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${docsHtml}
                </div>
            </div>
        `;
    }
    
    render() {
        const categories = [
            'aaalac',
            'aalas', 
            'iacuc-guidebook',
            'avma',
            'dod',
            'va',
            'ag-guide',
            'guide',
            'nuremberg',
            'olaw',
            'phs-policy',
            'usda',
            'training'
        ];
        
        const html = categories
            .map(cat => this.renderCategory(cat))
            .filter(html => html !== '')
            .join('<div class="my-6"></div>');
            
        this.container.innerHTML = html;
    }
}

// Make DocumentsManager available globally
window.DocumentsManager = DocumentsManager;