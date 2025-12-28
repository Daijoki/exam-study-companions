/**
 * Documents Manager
 * Handles document repository rendering and click handling
 */

class DocumentsManager {
    constructor() {
        this.data = null;
        this.container = document.getElementById('documents-container');
        this.stateManager = window.stateManager;
        this.modalManager = null; // Will be initialized after notesManager is available
    }
    
    async init() {
        this.showLoading();
        
        // Initialize modal manager
        if (!this.modalManager) {
            this.modalManager = new DocumentModalManager(
                this.stateManager,
                window.notesManager
            );
        }
        
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
        if (url && this.modalManager) {
            this.modalManager.openDocument(url, title, description);
        } else if (url) {
            // Fallback if modal manager not available
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
                    const title = card.querySelector('h4')?.textContent?.replace(/[📗📊]\s*/g, '').trim();
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
                    const title = card.querySelector('h4')?.textContent?.replace(/[📗📊]\s*/g, '').trim();
                    this.stateManager?.toggleViewed(url, {
                        type: 'document',
                        title: title,
                        source: 'Documents'
                    });
                }
                return;
            }
            
            // Handle card click
            const card = e.target.closest('.doc-card');
            if (card && card.dataset.url) {
                e.preventDefault(); // Prevent anchor navigation
                const title = card.querySelector('h4')?.textContent?.replace(/[📗📊]\s*/g, '').trim();
                const description = card.querySelector('p')?.textContent || '';
                this.openDocument(card.dataset.url, title, description);
            }
        });
        
        this.container.addEventListener('keydown', (e) => {
            const card = e.target.closest('.doc-card');
            if (card && card.dataset.url && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const title = card.querySelector('h4')?.textContent?.replace('↗', '').replace(/[📗📊]\s*/g, '').trim();
                const description = card.querySelector('p')?.textContent || '';
                this.openDocument(card.dataset.url, title, description);
            }
        });
    }
    
    updateDocumentStates() {
        // Re-render to update visual state
        this.render();
    }
    
    renderDocCard(doc, gradient, colorClass) {
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

        return `
        <a href="${doc.url}" 
           class="doc-card relative ${gradient} ${colorClass} text-white p-4 rounded-lg shadow-md cursor-pointer block no-underline" 
           data-url="${doc.url}"
           data-item-id="${doc.url}"
           aria-label="${doc.title.replace(/[📗📊]\s*/g, '')} (opens in new window)">
            <div class="flex justify-between items-start gap-2 mb-2">
                <h4 class="font-bold flex-1 doc-title">${doc.title.replace(/[📗📊]\s*/g, '')} <span aria-hidden="true" class="text-sm ml-1 inline-flex items-center" data-icon="externalLink"></span></h4>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${readButton}
                    <button class="doc-star-btn text-xl hover:scale-110 transition-transform leading-none" 
                            title="${isSaved ? 'Unsave item' : 'Save item'}"
                            style="cursor: pointer; pointer-events: auto;">
                        ${isSaved ? ICONS.starFilled : ICONS.starOutline}
                    </button>
                    <button class="text-xl hover:scale-110 transition-transform leading-none"
                            data-note-btn="true"
                            data-note-id="${doc.url}"
                            data-note-type="document"
                            data-note-label="${doc.title.replace(/📗\s*/, '').replace(/"/g, '&quot;')}"
                            data-note-source="Documents"
                            title="Add note">
                        <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(doc.url) ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
                    </button>
                </div>
            </div>
            ${doc.description ? `<p class="text-sm opacity-90">${doc.description}</p>` : ''}
        </a>
    `;
    }

    renderChartsAndTables() {
        const chartsData = this.data.categories['charts-and-tables'];
        if (!chartsData) return '';
        
        const subgroups = ['irb-review', 'informed-consent', 'fda-regulations', 'reference'];
        const gradient = 'bg-gradient-to-br';
        const colorClass = 'from-pink-500 to-rose-600';
        
        const subgroupsHtml = subgroups.map(subgroupKey => {
            const subgroup = chartsData[subgroupKey];
            if (!subgroup || !subgroup.items || subgroup.items.length === 0) return '';
            
            const cardsHtml = subgroup.items.map(doc => 
                this.renderDocCard(doc, gradient, colorClass)
            ).join('');
            
            return `
                <div class="mb-4">
                    <h4 class="text-md font-medium text-gray-600 mb-2 pl-1">${subgroup.title}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div>
                <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b-2 border-pink-200 pb-2">Charts & Tables</h3>
                ${subgroupsHtml}
            </div>
        `;
    }

    renderCategory(category) {
        // Handle charts-and-tables specially with sub-groups
        if (category === 'charts-and-tables') {
            return this.renderChartsAndTables();
        }
        
        const docs = this.data.categories[category];
        if (!docs || docs.length === 0) return '';
        
        const categoryConfig = {
            'ethical-codes': { title: 'Ethical Codes', color: 'doc-card-blue', border: 'border-blue-200' },
            'hhs': { title: 'HHS Regulations (45 CFR)', color: 'doc-card-blue', border: 'border-blue-200' },
            'fda': { title: 'FDA Regulations (21 CFR)', color: 'doc-card-green', border: 'border-green-200' },
            'other-federal': { title: 'Other Federal Regulations', color: 'doc-card-orange', border: 'border-orange-200' },
            'training': { title: 'Training Modules', color: 'from-indigo-500 to-purple-600', border: 'border-indigo-200' },
            'guidance': { title: 'Guidance', color: 'from-teal-500 to-cyan-600', border: 'border-teal-200' }
        };
        
        const config = categoryConfig[category];
        if (!config) return '';
        
        const gradient = category === 'training' || category === 'guidance' ? 'bg-gradient-to-br' : '';
        
        const docsHtml = docs.map(doc => 
            this.renderDocCard(doc, gradient, config.color)
        ).join('');
        
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
            'ethical-codes',
            'hhs', 
            'fda',
            'other-federal',
            'charts-and-tables',
            'training',
            'guidance'
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