/**
 * Document Modal Manager
 * Handles viewing docs in a modal with full app features (star, notes, read tracking)
 */

class DocumentModalManager {
    constructor(stateManager, notesManager) {
        this.stateManager = stateManager;
        this.notesManager = notesManager;
        this.currentUrl = null;
        this.currentTitle = null;
        this.modal = null;
    }

    /**
     * Opens a document in a modal with full app features
     * @param {string} url - The document URL (can be relative like 'docs/types-of-irb-review.html')
     * @param {string} title - The document title
     * @param {string} description - Optional description
     */
    openDocument(url, title, description = '') {
        this.currentUrl = url;
        this.currentTitle = title;

        // Mark as viewed immediately
        if (this.stateManager) {
            this.stateManager.markAsViewed(url, {
                type: 'document',
                title: title,
                source: 'Documents'
            });
        }

        // Check if it's a local HTML file (starts with 'docs/')
        if (url.startsWith('docs/')) {
            this.showModal(url, title, description);
        } else {
            // External URLs still open in new tab
            window.open(url, '_blank');
        }
    }

    /**
     * Creates and shows the modal
     */
    showModal(url, title, description) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'doc-modal-overlay';
        overlay.id = 'doc-modal-overlay';
        
        // Check if already starred
        const isStarred = this.stateManager?.isSaved(url);
        const isViewed = this.stateManager?.isViewed(url);
        const hasNote = this.stateManager?.hasNote ? this.stateManager.hasNote(url) : false;
        const safeNoteLabel = title ? title.replace(/[📗📊]\s*/g, '').replace(/"/g, '&quot;') : '';
        
        overlay.innerHTML = `
            <div class="doc-modal">
                <div class="doc-modal-header">
                    <div class="doc-modal-title">
                        <h3>${title}</h3>
                        ${description ? `<p class="doc-modal-description">${description}</p>` : ''}
                    </div>
                    <div class="doc-modal-actions">
                        <button class="doc-star-btn" 
                                data-url="${url}" 
                                title="${isStarred ? 'Unsave Item' : 'Save Item'}"
                                aria-label="${isStarred ? 'Unsave Item' : 'Save Item'}">
                            ${isStarred ? (window.ICONS?.starFilled || '⭐') : (window.ICONS?.starOutline || '☆')}
                        </button>
                        <button class="doc-notes-btn" 
                                data-url="${url}" 
                                data-note-btn="true"
                                data-note-id="${url}"
                                data-note-type="document"
                                data-note-label="${safeNoteLabel}"
                                data-note-source="Documents"
                                title="${hasNote ? 'Edit note' : 'Add note'}"
                                aria-label="${hasNote ? 'Edit note' : 'Add note'}">
                            <span data-note-icon>
                                ${hasNote 
                                  ? (window.ICONS?.noteFilled || '🖊') 
                                  : (window.ICONS?.noteOutline || '🖊')}
                            </span>
                        </button>
                        <button class="doc-close-btn" 
                                title="Close"
                                aria-label="Close">×</button>
                    </div>
                </div>
                <div class="doc-modal-content-wrapper">
                    <iframe src="${url}" 
                            class="doc-modal-content" 
                            title="${title}"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(overlay);

// Sync theme into same-origin document iframes so their tables respect dark mode
const iframe = overlay.querySelector('.doc-modal-content');
if (iframe) {
  iframe.addEventListener('load', () => {
    try {
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!iframeDoc) return;
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      iframeDoc.documentElement.setAttribute('data-theme', theme);
      if (iframeDoc.body) {
        iframeDoc.body.setAttribute('data-theme', theme);
      }
    } catch (e) {
      console.warn('Unable to sync theme to document iframe', e);
    }
  });
}
        this.modal = overlay;

        // Setup event listeners
        this.setupModalEventListeners();

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    /**
     * Sets up event listeners for modal interactions
     */
    setupModalEventListeners() {
        if (!this.modal) return;

        // Close button
        const closeBtn = this.modal.querySelector('.doc-close-btn');
        closeBtn?.addEventListener('click', () => this.closeModal());

        // Close on overlay click (but not on modal content)
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('doc-modal-overlay')) {
                this.closeModal();
            }
        });

        // ESC key to close
        this.handleEscKey = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };
        document.addEventListener('keydown', this.handleEscKey);

        // Star button
        const starBtn = this.modal.querySelector('.doc-star-btn');
        starBtn?.addEventListener('click', () => {
            this.stateManager?.toggleSaved(this.currentUrl, {
                type: 'document',
                title: this.currentTitle,
                tab: 'documents'
            });
            // Update icon only
            const isNowStarred = this.stateManager?.isSaved(this.currentUrl);
            starBtn.innerHTML = isNowStarred ? 
                (window.ICONS?.starFilled || '⭐') : 
                (window.ICONS?.starOutline || '☆');
        });

        
        // Notes button
        const notesBtn = this.modal.querySelector('.doc-notes-btn');
        notesBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNotesForDocument();
        });
    }

    /**
     * Shows notes modal for the current document
     */
    showNotesForDocument() {
        // Get notesManager from window if not set on instance
        const notesManager = this.notesManager || window.notesManager;
        if (!notesManager || !this.currentUrl) {
            console.warn('NotesManager not available or no URL set');
            return;
        }

        // Call the notesManager's open method with url as itemId
        notesManager.open(this.currentUrl, {
            label: this.currentTitle,
            type: 'document',
            source: 'Documents',
            tab: 'documents'
        });
    }

    /**
     * Closes the modal
     */
    closeModal() {
        if (!this.modal) return;

        // Remove event listener
        document.removeEventListener('keydown', this.handleEscKey);

        // Remove modal
        this.modal.remove();
        this.modal = null;

        // Restore body scroll
        document.body.style.overflow = '';

        // Clear current document info
        this.currentUrl = null;
        this.currentTitle = null;
    }
}

/**
 * CSS to add to your main stylesheet
 */
const MODAL_CSS = `
.doc-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
}

.doc-modal {
    background: var(--bg-lighter, #1E293B);
    border-radius: 0.5rem;
    width: 100%;
    max-width: 1200px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.doc-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    gap: 1rem;
}

.doc-modal-title h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
}

.doc-modal-description {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: #6b7280;
}

.doc-modal-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.doc-modal-actions button {
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
}

.doc-modal-actions button:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
    color: #374151;
}

.doc-star-btn.starred {
    color: #f59e0b;
    background-color: #fef3c7;
    border-color: #fbbf24;
}

.doc-read-btn {
    width: auto;
    min-width: 2.5rem;
    padding: 0.5rem 0.75rem;
}

.doc-read-btn.viewed {
    color: #10b981;
    background-color: #d1fae5;
    border-color: #34d399;
}

.doc-close-btn {
    font-size: 1.5rem;
    line-height: 1;
}

.doc-modal-content-wrapper {
    flex: 1;
    overflow: hidden;
}

.doc-modal-content {
    width: 100%;
    height: 100%;
    border: none;
}

@media (max-width: 768px) {
    .doc-modal {
        height: 95vh;
        max-width: 100%;
    }
    
    .doc-modal-header {
        padding: 1rem;
        flex-direction: column;
        align-items: stretch;
    }
    
    .doc-modal-actions {
        justify-content: flex-end;
    }
}
`;

/**
 * Usage in documents.js:
 * 
 * // Initialize in your DocumentsManager constructor:
 * constructor() {
 *     // ... existing code ...
 *     this.modalManager = new DocumentModalManager(
 *         window.stateManager, 
 *         window.notesManager
 *     );
 * }
 * 
 * // Replace openDocument method:
 * openDocument(url, title, description) {
 *     this.modalManager.openDocument(url, title, description);
 * }
 */
