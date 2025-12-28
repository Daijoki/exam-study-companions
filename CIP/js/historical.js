/**
 * Historical Foundations Manager - Timeline Version
 */

class HistoricalManager {
    constructor() {
        this.data = null;
        this.urls = null;
        this.contentContainer = document.getElementById('historical-scenarios');
        this.detailContainer = document.getElementById('historical-connection');
        this.detailContent = document.getElementById('connection-content');
        this.detailContentWrapper = document.getElementById('historical-detail-content');
        
        // Modal elements
        this.modal = document.getElementById('historical-modal');
        this.modalBody = document.getElementById('historical-modal-body');
        this.modalClose = document.getElementById('historical-modal-close');
        this.lastFocusedElement = null;
        
        // Setup modal event listeners
        this.setupModalListeners();
    }
    
    async init() {
        try {
            const [dataResponse, urlsResponse] = await Promise.all([
                fetch('data/historical-foundations.json'),
                fetch('data/historical-foundations-urls.json')
            ]);
            
            if (!dataResponse.ok || !urlsResponse.ok) {
                throw new Error('Failed to load historical data');
            }
            
            this.data = await dataResponse.json();
            this.urls = await urlsResponse.json();
            
            this.render();
        } catch (error) {
            console.error('HistoricalManager: Error loading data:', error);
            this.showError();
        }
    }
    
    showError() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="col-span-full bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                    <div class="text-red-600 text-4xl mb-2">⚠</div>
                    <h3 class="text-lg font-semibold text-red-900 mb-2">Unable to Load Content</h3>
                    <p class="text-red-700 mb-4">Unable to load historical foundations content. Please check your connection and try again.</p>
                    <button onclick="window.historicalManager.init()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    render() {
        if (!this.data || !this.data.timeline) {
            this.showError();
            return;
        }
        
        const timeline = this.data.timeline;
        let html = '';
        
        timeline.forEach((event, index) => {
            const itemId = `timeline-${index}`;
            const isSaved = window.stateManager && window.stateManager.isSaved(itemId);
            const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
            
            html += `
                <div class="historical-card bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer" 
                     data-item-id="${itemId}"
                     data-event-index="${index}"
                     role="button"
                     tabindex="0"
                     aria-label="View details for ${this.escapeHtml(event.title)}">
                    <div class="flex items-start justify-between mb-3">
                        <span class="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">${event.year}</span>
                        <div class="flex items-center gap-2">
                            <button class="event-star-btn text-lg leading-none hover:scale-110 transition-transform" 
                                    data-item-id="${itemId}"
                                    data-title="${this.escapeHtml(event.title)}"
                                    title="${isSaved ? 'Unsave event' : 'Save event'}"
                                    aria-label="${isSaved ? 'Unsave' : 'Save'} ${this.escapeHtml(event.title)}"
                                    onclick="event.stopPropagation()">
                                ${starIcon}
                            </button>
                            <button class="event-note-btn text-lg leading-none hover:scale-110 transition-transform" 
                                    data-note-btn
                                    data-item-id="${itemId}"
                                    data-title="${this.escapeHtml(event.title)}"
                                    data-type="historical"
                                    data-note-id="${itemId}"
                                    data-note-type="historical"
                                    data-note-label="${this.escapeHtml(event.title)}"
                                    data-note-source="Historical Foundations"
                                    title="Add note"
                                    aria-label="Add note for ${this.escapeHtml(event.title)}"
                                    onclick="event.stopPropagation()">
                                <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (window.ICONS?.noteFilled || '🖊') : (window.ICONS?.noteOutline || '🖊')}</span>
                            </button>
                        </div>
                    </div>
                    <h3 class="text-base font-bold text-gray-900 mb-2 line-clamp-2">${event.title}</h3>
                    <p class="text-sm text-gray-600 line-clamp-3">${event.description[0] || ''}</p>
                    ${event.key_points && event.key_points.length > 0 ? `
                        <div class="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                            Key Points
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        this.contentContainer.innerHTML = html;
        
        // Attach event listeners
        this.attachCardListeners();
        this.attachStarListeners();
        this.attachNoteListeners();
    }
    
    attachCardListeners() {
        const cards = this.contentContainer.querySelectorAll('.historical-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.event-star-btn') || e.target.closest('.event-note-btn')) {
                    return;
                }
                const eventIndex = parseInt(card.dataset.eventIndex);
                this.showEventDetail(eventIndex);
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (e.target.closest('.event-star-btn') || e.target.closest('.event-note-btn')) return;
                    e.preventDefault();
                    const eventIndex = parseInt(card.dataset.eventIndex);
                    this.showEventDetail(eventIndex);
                }
            });
        });
    }
    
    showEventDetail(eventIndex) {
        const event = this.data.timeline[eventIndex];
        if (!event) return;
        
        this.lastFocusedElement = document.activeElement;
        const itemId = `timeline-${eventIndex}`;
        const safeTitle = this.escapeHtml(event.title);
        const isSaved = window.stateManager && window.stateManager.isSaved(itemId);
        const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
        
        // Process description to add inline links
        let description = event.description.map(para => {
            let processedPara = para;
            
            if (event.links && event.links.length > 0) {
                event.links.forEach(link => {
                    const linkText = link.text;
                    const regex = new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    processedPara = processedPara.replace(regex, `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="inline-link text-blue-600 hover:text-blue-800 underline" data-link-url="${link.url}">${linkText}</a>`);
                });
            }
            
            return `<p class="text-sm text-gray-700 mb-3">${processedPara}</p>`;
        }).join('');
        
        // Build expandable Key Points section
        let keyPointsHtml = '';
        if (event.key_points && event.key_points.length > 0) {
            keyPointsHtml = `
                <div class="mt-4 pt-4" style="border-top: 1px solid var(--border-color, #e5e7eb);">
                    <button class="expandable-section-btn w-full flex items-center justify-between p-3 rounded-lg transition-colors"
                            style="background-color: rgba(59, 130, 246, 0.15);"
                            data-section="key-points-${eventIndex}"
                            aria-expanded="false"
                            onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.2)'"
                            onmouseout="this.style.backgroundColor='rgba(59, 130, 246, 0.15)'">
                        <div class="flex items-center gap-2 font-bold" style="color: #60a5fa;">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                            </svg>
                            <span>Key Points</span>
                        </div>
                        <svg class="w-5 h-5 transform transition-transform" fill="currentColor" viewBox="0 0 20 20" style="color: #9ca3af;">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    <div class="expandable-content hidden mt-3" id="key-points-${eventIndex}">
                        <ul class="space-y-2">
                            ${event.key_points.map(point => `
                                <li class="text-sm flex items-start gap-2" style="color: var(--text-primary);">
                                    <span class="font-bold" style="color: #60a5fa;">•</span>
                                    <span>${point}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // Build expandable Impact Today section
        let impactTodayHtml = '';
        if (event.impact_today && event.impact_today.length > 0) {
            impactTodayHtml = `
                <div class="mt-4 pt-4" style="border-top: 1px solid var(--border-color, #e5e7eb);">
                    <button class="expandable-section-btn w-full flex items-center justify-between p-3 rounded-lg transition-colors"
                            style="background-color: rgba(16, 185, 129, 0.15);"
                            data-section="impact-today-${eventIndex}"
                            aria-expanded="false"
                            onmouseover="this.style.backgroundColor='rgba(16, 185, 129, 0.2)'"
                            onmouseout="this.style.backgroundColor='rgba(16, 185, 129, 0.15)'">
                        <div class="flex items-center gap-2 font-bold" style="color: #34d399;">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <span>Impact Today</span>
                        </div>
                        <svg class="w-5 h-5 transform transition-transform" fill="currentColor" viewBox="0 0 20 20" style="color: #9ca3af;">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    <div class="expandable-content hidden mt-3" id="impact-today-${eventIndex}">
                        <ul class="space-y-2">
                            ${event.impact_today.map(impact => `
                                <li class="text-sm flex items-start gap-2" style="color: var(--text-primary);">
                                    <span class="font-bold" style="color: #34d399;">✓</span>
                                    <span>${impact}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        let html = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">${event.title}</h3>
                    <span class="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded whitespace-nowrap">${event.year}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="event-star-btn text-lg leading-none hover:scale-110 transition-transform" 
                            data-item-id="${itemId}"
                            data-title="${safeTitle}"
                            title="${isSaved ? 'Unsave event' : 'Save event'}"
                            aria-label="${isSaved ? 'Unsave' : 'Save'} ${safeTitle}">
                        ${starIcon}
                    </button>
                    <button class="event-note-btn text-lg leading-none hover:scale-110 transition-transform" 
                            data-note-btn
                            data-item-id="${itemId}"
                            data-title="${safeTitle}"
                            data-type="historical"
                            data-note-id="${itemId}"
                            data-note-type="historical"
                            data-note-label="${safeTitle}"
                            data-note-source="Historical Foundations"
                            title="Add note"
                            aria-label="Add note for ${safeTitle}">
                        <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (window.ICONS?.noteFilled || '🖊') : (window.ICONS?.noteOutline || '🖊')}</span>
                    </button>
                </div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4">
                ${description}
                ${keyPointsHtml}
                ${impactTodayHtml}
            </div>
        `;
        
        this.modalBody.innerHTML = html;
        
        // Enhance inline links with read status
        if (window.linkEnhancer) {
            const inlineLinks = this.modalBody.querySelectorAll('a.inline-link');
            inlineLinks.forEach(link => {
                const context = {
                    type: 'historical-event',
                    title: event.title,
                    source: `Historical: ${event.title}`,
                    description: event.description[0] || ''
                };
                window.linkEnhancer.enhanceLink(link, context);
            });
        }
        
        this.attachExpandableSectionListeners();
        this.openModal();
        this.attachModalButtonListeners(itemId, safeTitle, 'historical-event');
    }
    
    setupModalListeners() {
        if (!this.modal || !this.modalClose) return;
        
        this.modalClose.addEventListener('click', () => this.closeModal());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        if (!this.modal) return;
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        
        if (this.modalClose) {
            setTimeout(() => this.modalClose.focus(), 100);
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
        
        document.body.style.overflow = '';
    }
    
    attachModalButtonListeners(itemId, title, itemType) {
        const starBtn = this.modalBody.querySelector(`.event-star-btn[data-item-id="${CSS.escape(itemId)}"]`);
        if (starBtn) {
            starBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.stateManager) {
                    const isCurrentlySaved = window.stateManager.isSaved(itemId);
                    window.stateManager.toggleSaved(itemId, {
                        type: itemType,
                        title: title,
                        tab: 'historical'
                    });
                    
                    const isSaved = !isCurrentlySaved;
                    const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
                    starBtn.innerHTML = starIcon;
                    starBtn.setAttribute('title', isSaved ? 'Unsave event' : 'Save event');
                    starBtn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${title}`);

                    const cardStarBtn = this.contentContainer.querySelector(`[data-item-id="${CSS.escape(itemId)}"] .event-star-btn`);
                    if (cardStarBtn) {
                        cardStarBtn.innerHTML = starIcon;
                        cardStarBtn.setAttribute('title', isSaved ? 'Unsave event' : 'Save event');
                        cardStarBtn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${title}`);
                    }
                }
            });
        }
        
        const noteBtn = this.modalBody.querySelector(`.event-note-btn[data-item-id="${CSS.escape(itemId)}"]`);
        if (noteBtn) {
            noteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.notesManager && typeof window.notesManager.open === 'function') {
                    window.notesManager.open(itemId, {
                        type: itemType,
                        label: title
                    });
                } else {
                    console.error('HistoricalManager: notesManager.open not available');
                    alert('Notes system is not available. Please refresh the page.');
                }
            });
        }
    }
    
    attachExpandableSectionListeners() {
        const expandButtons = this.modalBody.querySelectorAll('.expandable-section-btn');
        expandButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = btn.dataset.section;
                const content = document.getElementById(sectionId);
                const arrow = btn.querySelector('svg:last-child');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                
                if (content) {
                    if (isExpanded) {
                        content.classList.add('hidden');
                        btn.setAttribute('aria-expanded', 'false');
                        arrow.style.transform = 'rotate(0deg)';
                    } else {
                        content.classList.remove('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                        arrow.style.transform = 'rotate(180deg)';
                    }
                }
            });
        });
    }
    
    attachStarListeners() {
        const starButtons = this.contentContainer.querySelectorAll('.event-star-btn');
        starButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                const title = btn.dataset.title;
                
                if (window.stateManager) {
                    const isCurrentlySaved = window.stateManager.isSaved(itemId);
                    const context = {
                        type: 'historical-event',
                        title: title,
                        tab: 'historical'
                    };
                    window.stateManager.toggleSaved(itemId, context);
                    
                    const isSaved = !isCurrentlySaved;
                    const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
                    btn.innerHTML = starIcon;
                    btn.setAttribute('title', isSaved ? 'Unsave event' : 'Save event');
                    btn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${title}`);
                }
            });
        });
    }
    
    attachNoteListeners() {
        const noteButtons = this.contentContainer.querySelectorAll('.event-note-btn');
        noteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                const title = btn.dataset.title;
                const type = btn.dataset.type;
                
                if (window.notesManager && typeof window.notesManager.open === 'function') {
                    window.notesManager.open(itemId, {
                        type: type,
                        label: title
                    });
                } else {
                    console.error('HistoricalManager: notesManager.open not available');
                    alert('Notes system is not available. Please refresh the page.');
                }
            });
        });
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

window.HistoricalManager = HistoricalManager;
