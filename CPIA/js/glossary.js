class GlossaryManager {
  constructor() {
    this.data = { terms: [] };
    this.container = document.getElementById('glossary-container');
    this.noResults = document.getElementById('no-results');
    this.searchInput = document.getElementById('glossary-search');
    this.resultsCount = document.getElementById('results-count');
    this.studyModeToggle = document.getElementById('study-mode-toggle');
    this.searchSection = document.getElementById('search-section');
    this.studyControls = document.getElementById('study-controls');
    this.directionToggle = document.getElementById('direction-toggle');
    this.directionText = document.getElementById('direction-text');
    this.shuffleButton = document.getElementById('shuffle-cards');
    this.studyMode = false;
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.studyDirection = 'term-to-def'; // 'term-to-def' or 'def-to-term'
    this.shuffledIndices = []; // Empty means not shuffled
  }
  async init() {
    this.showLoading();
    
    try {
      const raw = await window.DataLoader.getGlossary();
      const arr = Array.isArray(raw) ? raw : (raw && raw.terms) ? raw.terms : [];
      this.data.terms = (arr || []).map(t => this.decorate(t));
      this.attach();
      this.render();
    } catch (error) {
      console.error("Glossary init failed:", error);
      this.showError('Unable to load glossary terms. Please check your connection and try again.');
    }
  }
  
  showLoading() {
    if (this.container) {
      this.container.innerHTML = Utils.createLoadingHTML();
    }
  }
  
  showError(message) {
    if (this.container) {
      this.container.innerHTML = Utils.createErrorHTML(message);
    }
  }
  decorate(item) {
    const term = (item.term || '').trim();
    const isAcr = /^[A-Z0-9\-\/]{2,15}$/.test(term);
    const isMulti = (item.type === 'multi-agency' || item.type === 'multi-agency-table') && Array.isArray(item.definitions) && item.definitions.length >= 2;
    const hasSrc = (item.type === 'simple' && !!(item.source||'').trim()) || isMulti;
    const blob = [
      term, item.description||'', item.definition||'', item.source||'',
      ...(Array.isArray(item.definitions) ? item.definitions.map(d => `${d.label||''} ${d.source||''} ${d.definition||''}`) : [])
    ].join(' ').toLowerCase();
    // Determine comparison (table only if different wording)
    let isComparison = false;
    if (isMulti) {
      const norm = s => String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
      const normalizeStrong = (s) => norm(String(s).replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/[(),]/g,'').replace(/\s+/g,' ').trim());
      const defs = (item.definitions||[]).map(d => d.definition || '');
      const uniq = [...new Set(defs.map(normalizeStrong).filter(Boolean))];
      isComparison = uniq.length > 1;
    }
    return { ...item, _hasSrc:hasSrc, _isAcr:isAcr, _isMulti:isMulti, _isComparison:isComparison, _blob:blob };
  }
  attach(){ 
    if (this.searchInput) {
      // Use debounced search for better performance
      const debouncedRender = Utils.debounce(() => this.render(), 200);
      this.searchInput.addEventListener('input', debouncedRender);
    }
    if (this.studyModeToggle) {
      this.studyModeToggle.addEventListener('click', () => this.toggleStudyMode());
    }
    if (this.shuffleButton) {
      this.shuffleButton.addEventListener('click', () => this.shuffleCards());
    }
    if (this.directionToggle) {
      this.directionToggle.addEventListener('click', () => this.toggleDirection());
    }
    
    // Add event delegation for flashcard interactions
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('.flashcard')) {
          this.flipCard();
        }
        if (e.target.closest('.control-btn[data-action="prev"]')) {
          this.prevCard();
        }
        if (e.target.closest('.control-btn[data-action="next"]')) {
          this.nextCard();
        }
      });
      
      this.container.addEventListener('keydown', (e) => {
        if (e.target.closest('.flashcard') && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          this.flipCard();
        }
        if (e.target.closest('.control-btn[data-action="prev"]') && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          this.prevCard();
        }
        if (e.target.closest('.control-btn[data-action="next"]') && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          this.nextCard();
        }
      });
    }
  }
  getQuery(){ return (this.searchInput?.value || '').trim(); }
  esc(s){ return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  hi(raw,q){
  const text = String(raw || '');
  const qq = String(q || '').trim();

  // Improve readability of bullets and simple numbered lists
  let formatted = text
    // Put each bullet on its own line
    .replace(/\s*•\s*/g, '\n• ')
    // Put simple numbered items like (1) (2) on their own lines
    .replace(/\s*\((\d+)\)\s*/g, '\n($1) ');

  const t = this.esc(formatted);
  if (!qq) return t;

  try {
    const escaped = qq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    return t.replace(re, m => `<mark>${m}</mark>`);
  } catch (e) {
    return t;
  }
}
  
  // *** UPDATED FUNCTION ***
  toTitle(s){
    // Special case for 3Rs
    if (s === '3Rs') return s;
    
    // Split by separators (space, dash, slash)
    return String(s).split(/(\s+|\-|\/)/).map(p=>{
      // Check if the part is just a separator (space, -, /)
      if (/^\s+$/.test(p) || p === '-' || p === '/') return p;
      
      // Check if the part is an acronym (all caps, 2-15 chars)
      // This will preserve "IACUC", "AWA", "USDA", etc.
      const isAcronym = /^[A-Z0-9]{2,15}$/.test(p); 
      if (isAcronym) return p; // Keep it uppercase
      
      // Otherwise, apply title casing
      return p[0].toUpperCase() + p.slice(1).toLowerCase();
    }).join('');
  }
  
  formatTitle(item,q){
    const term=String(item.term||''), isAcr=/^[A-Z0-9\-\/]{2,15}$/.test(term), desc=String(item.description||'').trim();
    
    // Use toTitle for all terms, as it now correctly handles acronyms
    const display=this.toTitle(term);
    
    const extra=isAcr&&desc?` <span class="text-gray-600 font-normal">(${this.hi(this.toTitle(desc),q)})</span>`:'';
    return `${this.hi(display,q)}${extra}`;
  }
  apply(){
    const q=this.getQuery().toLowerCase();
    let items = (this.data.terms || []).slice();
    if(q) items=items.filter(t=>t._blob.includes(q));
    items.sort((a,b)=>(a.term||'').localeCompare(b.term||''));
    return items;
  }
  render(){
    if (this.studyMode) {
      this.noResults?.classList?.add('hidden');
      this.renderFlashcard();
      return;
    }
    const items=this.apply();
    const q=this.getQuery();
    if (this.resultsCount) {
      if (!q) {
        this.resultsCount.style.display = 'none';
      } else {
        this.resultsCount.style.display = 'inline-flex';
        this.resultsCount.innerHTML = `Showing <strong class="count">${items.length}</strong> result${items.length===1?'':'s'}`;
      }
    }
    if(!items.length){ this.container.innerHTML=''; this.noResults?.classList?.remove('hidden'); return;}
    this.noResults?.classList?.add('hidden');
    this.container.innerHTML = items.map(it => it._isMulti ? this.renderMulti(it,q) : this.renderSimple(it,q)).join('');
    
    // Enhance all source links with read functionality
    if (window.linkEnhancer) {
      const articles = this.container.querySelectorAll('article');
      articles.forEach(article => {
        // Get the term from the article's data or reconstruct it properly
        const h3 = article.querySelector('h3');
        let termTitle = '';
        
        // Find the corresponding item from data to get proper title
        const itemIndex = Array.from(this.container.querySelectorAll('article')).indexOf(article);
        const item = items[itemIndex];
        
        if (item) {
          const term = String(item.term || '');
          const isAcr = /^[A-Z0-9\-\/]{2,15}$/.test(term);
          const desc = String(item.description || '').trim();
          termTitle = isAcr && desc ? `${term.toUpperCase()} (${this.toTitle(desc)})` : (isAcr ? term.toUpperCase() : this.toTitle(term));
        } else {
          termTitle = h3?.textContent?.trim() || '';
        }
        
        const links = article.querySelectorAll('a.source-pill');
        links.forEach(link => {
          const context = {
            type: 'glossary',
            title: link.textContent.trim(),
            source: `Glossary: ${termTitle}`
          };
          window.linkEnhancer.enhanceLink(link, context);
        });
      });
    }
    
    // Add star button event listeners for terms
    this.attachStarListeners();
  }
  
  attachStarListeners() {
    const starButtons = this.container.querySelectorAll('.term-star-btn');
    starButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const term = btn.dataset.term;
        
        if (window.stateManager) {
          const isCurrentlySaved = window.stateManager.isSaved(itemId);
          const context = {
            type: 'glossary',
            title: term,
            tab: 'glossary'
          };
          window.stateManager.toggleSaved(itemId, context);
          
          // Update button UI
          const isSaved = !isCurrentlySaved;
          const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
          btn.innerHTML = starIcon;
          btn.setAttribute('title', isSaved ? 'Unsave term' : 'Save term');
          btn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${term}`);
        }
      });
    });
  }
  renderSimple(item,q){
    const src=(item.source||'').trim(), def=item.definition||'';
    const srcUrl = item.source_url || '';
    let srcHTML = '';
    if (src) {
      if (srcUrl) {
        srcHTML = `<p class=\"mt-3 text-sm text-gray-600\"><strong>Source:</strong> <a href="${srcUrl}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border hover:bg-[#00447C] hover:text-white hover:border-[#00447C] transition-colors cursor-pointer" tabindex="0">${this.hi(src,q)}</a></p>`;
      } else {
        srcHTML = `<p class=\"mt-3 text-sm text-gray-600\"><strong>Source:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border">${this.hi(src,q)}</span></p>`;
      }
    }
    const term = String(item.term || '').trim();
    const itemId = `glossary-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const isSaved = window.stateManager?.isSaved?.(itemId) || false;
    const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
    
    return `<article class="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm glossary-item-enhanced glossary-card" style="border-left: 4px solid #8B5CF6;" data-item-id="${itemId}">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-semibold text-[#00447C] flex-1">${this.formatTitle(item,q)}</h3>
        <button class="term-star-btn text-lg flex-shrink-0 hover:scale-110 transition-transform" 
                data-item-id="${itemId}" 
                data-term="${this.escapeHtml(term)}"
                title="${isSaved ? 'Unsave term' : 'Save term'}"
                aria-label="${isSaved ? 'Unsave' : 'Save'} ${this.escapeHtml(term)}">${starIcon}</button>
        <button class="ml-1 text-lg flex-shrink-0 hover:scale-110 transition-transform"
                data-note-btn="true"
                data-note-id="${itemId}"
                data-note-type="glossary"
                data-note-label="${this.escapeHtml(term)}"
                data-note-source="Glossary"
                title="Add note">
          <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
        </button>
      </div>
      ${def?`<p class="mt-2">${this.hi(def,q)}</p>`:''}
      ${srcHTML}
    </article>`;
  }

  renderMulti(item,q){
    const norm = s => String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
    const normalizeStrong = (s) => norm(String(s)
      .replace(/[“”]/g,'"')
      .replace(/[’]/g,"'")
      .replace(/[(),]/g,'')
      .replace(/\s+/g,' ')
      .trim());
    const defs = (item.definitions||[]).map(d => d.definition || '');
    const uniq = [...new Set(defs.map(normalizeStrong).filter(Boolean))];
    const term = String(item.term || '').trim();
    const itemId = `glossary-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const isSaved = window.stateManager?.isSaved?.(itemId) || false;
    const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');

    // Case 1: all definitions are effectively the same (simple multi-agency)
    if (uniq.length === 1) {
      const labels = (item.definitions||[]).map(d => {
        const label = d.label || d.source || '';
        let url = d.url || '';
        // Special case: for Agency Notification, keep the org/role label non-clickable
        if ((item.term||'').trim() === 'Agency Notification') {
          url = '';
        }
        if (url) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00447C] cursor-pointer mr-1" tabindex="0">${this.hi(label,q)}</a>`;
        } else {
          return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1">${this.hi(label,q)}</span>`;
        }
      }).join(' ');

      return `<article class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4" style="border-left: 4px solid #8B5CF6;" data-item-id="${itemId}">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-[#00447C]">${this.formatTitle(item,q)}</h3>
            ${item.description ? `<p class="text-sm text-gray-600 mt-1">${this.hi(item.description,q)}</p>` : ''}
          </div>
          <div class="flex items-center gap-1">
            <button class="term-star-btn text-lg flex-shrink-0 hover:scale-110 transition-transform" 
                    data-item-id="${itemId}" 
                    data-term="${this.escapeHtml(term)}"
                    title="${isSaved ? 'Unsave term' : 'Save term'}"
                    aria-label="${isSaved ? 'Unsave' : 'Save'} ${this.escapeHtml(term)}">${starIcon}</button>
            <button class="ml-1 text-lg flex-shrink-0 hover:scale-110 transition-transform"
                    data-note-btn="true"
                    data-note-id="${itemId}"
                    data-note-type="glossary"
                    data-note-label="${this.escapeHtml(term)}"
                    data-note-source="Glossary"
                    title="Add note">
              <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
            </button>
          </div>
        </div>
        <p class="mt-2">${this.hi(item.definitions[0].definition||'',q)}</p>
        <p class="mt-3 text-sm text-gray-600"><strong>${(Array.isArray(item.definitions) && item.definitions.length>1) ? 'Sources:' : 'Source:'}</strong> ${labels}</p>
      </article>`;
    }

    // Case 2: comparison/table view
    const hasRowSources = item.definitions && item.definitions.some(d => d.sources && d.sources.length > 0);
    const __hasAnyUrl = (item.definitions||[]).some(d => d && d.url);

    let rows;
    if (hasRowSources) {
      // 3-column table: Organization/Role | Description | Sources
      rows = (item.definitions||[]).map(d => {
        const label = d.label || d.source || '';
        const definition = d.definition || '';

        // Build source pills from the per-row sources array
        let sourcePills = '';
        if (d.sources && Array.isArray(d.sources)) {
          sourcePills = d.sources.map(src => {
            const text = src.text || '';
            const url = src.url || '';
            if (url) {
              return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00447C] cursor-pointer mr-1 mb-1">${this.hi(text,q)}</a>`;
            } else {
              return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1 mb-1">${this.hi(text,q)}</span>`;
            }
          }).join(' ');
        }

        return `
        <tr class="align-top border-b last:border-0">
          <td class="align-top p-3 w-1/3">${this.hi(label,q)}</td>
          <td class="align-top p-3 w-1/3">${this.hi(definition,q)}</td>
          <td class="align-top p-3 w-1/3">${sourcePills}</td>
        </tr>`;
      }).join('');
    } else {
      // 2-column table; layout depends on whether any URLs exist
      const __hasAnyUrlInner = __hasAnyUrl;
      rows = (item.definitions||[]).map(d => {
        const label = d.label || d.source || '';
        const definition = d.definition || '';
        const url = d.url || '';

        let sourceCell;
        if (url) {
          sourceCell = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00447C] cursor-pointer" tabindex="0">${this.hi(label,q)}</a>`;
        } else {
          sourceCell = `<span class="text-gray-700">${this.hi(label,q)}</span>`;
        }

        if (__hasAnyUrlInner) {
          // Description | Sources
          return `
          <tr class="align-top border-b last:border-0">
            <td class="align-top p-3 glossary-def-col">${this.hi(definition,q)}</td>
            <td class="align-top p-3 glossary-src-col">${sourceCell}</td>
          </tr>`;
        } else {
          // Organization/Role | Description
          return `
          <tr class="align-top border-b last:border-0">
            <td class="align-top p-3">${sourceCell}</td>
            <td class="align-top p-3">${this.hi(definition,q)}</td>
          </tr>`;
        }
      }).join('');
    }

    // Optional bottom sources section (for overall item.sources)
    let sourcesHTML = '';
    if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
      const sourcePills = item.sources.map(src => {
        const text = src.text || '';
        const url = src.url || '';
        if (url) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00447C] cursor-pointer mr-1 mb-1">${this.hi(text,q)}</a>`;
        } else {
          return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1 mb-1">${this.hi(text,q)}</span>`;
        }
      }).join(' ');
      const __srcLabel = (Array.isArray(item.sources) && item.sources.length>1) ? 'Sources:' : 'Source:';
      sourcesHTML = `<p class="mt-3 text-sm text-gray-600"><strong>${__srcLabel}</strong> ${sourcePills}</p>`;
    }

    const leftHeader = hasRowSources 
      ? (item.leftHeader || 'Organization/Role') 
      : (__hasAnyUrl ? 'Description' : (item.leftHeader || 'Role'));
    const rightHeader = hasRowSources 
      ? 'Description' 
      : (__hasAnyUrl ? (item.leftHeader || 'Sources') : 'Description');
    const thirdHeader = hasRowSources ? '<th class="text-left p-3 font-semibold">Sources</th>' : '';

    const showDescription = item.type === 'multi-agency-table' && item.description;

    return `<article class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4" style="border-left: 4px solid #8B5CF6;" data-item-id="${itemId}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-[#00447C]">${this.formatTitle(item,q)}</h3>
          ${showDescription ? `<p class="text-sm text-gray-600 mt-1">${this.hi(item.description,q)}</p>` : ''}
        </div>
        <div class="flex items-center gap-1">
          <button class="term-star-btn text-lg flex-shrink-0 hover:scale-110 transition-transform" 
                  data-item-id="${itemId}" 
                  data-term="${this.escapeHtml(term)}"
                  title="${isSaved ? 'Unsave term' : 'Save term'}"
                  aria-label="${isSaved ? 'Unsave' : 'Save'} ${this.escapeHtml(term)}">${starIcon}</button>
          <button class="ml-1 text-lg flex-shrink-0 hover:scale-110 transition-transform"
                  data-note-btn="true"
                  data-note-id="${itemId}"
                  data-note-type="glossary"
                  data-note-label="${this.escapeHtml(term)}"
                  data-note-source="Glossary"
                  title="Add note">
            <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
          </button>
        </div>
      </div>
      <div class="overflow-x-auto mt-3"><table class="min-w-full border border-gray-200 rounded-lg">
        <thead><tr class="bg-gray-50"><th class="text-left p-3 font-semibold">${leftHeader}</th><th class="text-left p-3 font-semibold">${rightHeader}</th>${thirdHeader}</tr></thead>
        <tbody>${rows}</tbody></table></div>
      ${sourcesHTML}
    </article>`;
  }
  toggleStudyMode() {
    this.studyMode = !this.studyMode;
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.shuffledIndices = []; // Reset shuffle when toggling modes
    if (this.studyMode) {
      // Study mode is active; offer to switch back to list view
      // Use a larger icon size for better legibility
      this.studyModeToggle.innerHTML = `<span class="text-2xl">${ICONS.list}</span><span>List View</span>`;
      this.studyModeToggle.classList.add('bg-purple-100', 'border-[#8B5CF6]', 'text-[#8B5CF6]');
      this.searchSection.classList.add('hidden');
      if (this.studyControls) this.studyControls.classList.remove('hidden');
    } else {
      // List view is active; offer to switch to study mode
      // Use a larger icon size for better legibility
      this.studyModeToggle.innerHTML = `<span class="text-2xl">${ICONS.study}</span><span>Study Mode</span>`;
      this.studyModeToggle.classList.remove('bg-purple-100', 'border-[#8B5CF6]', 'text-[#8B5CF6]');
      this.searchSection.classList.remove('hidden');
      if (this.studyControls) this.studyControls.classList.add('hidden');
    }
    this.render();
  }
  shuffleCards() {
    const items = this.apply();
    if (items.length === 0) return;
    
    // Fisher-Yates shuffle
    this.shuffledIndices = Array.from({ length: items.length }, (_, i) => i);
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.renderFlashcard();
  }
  toggleDirection() {
    this.studyDirection = this.studyDirection === 'term-to-def' ? 'def-to-term' : 'term-to-def';
    this.currentCardIndex = 0; // Reset to first card
    this.isFlipped = false;
    
    // Update button text
    if (this.directionText) {
      this.directionText.textContent = this.studyDirection === 'term-to-def' 
        ? 'Term → Definition' 
        : 'Definition → Term';
    }
    
    this.renderFlashcard();
  }
  getCurrentItem() {
    const items = this.apply();
    if (items.length === 0) return null;
    
    // If shuffled, use shuffled index
    if (this.shuffledIndices.length > 0) {
      return items[this.shuffledIndices[this.currentCardIndex]];
    }
    
    return items[this.currentCardIndex];
  }
  renderFlashcard() {
    const items = this.apply();
    if (!items.length) {
      this.container.innerHTML = '<div class="text-center p-8 text-gray-500">No terms available for study mode.</div>';
      return;
    }
    
    const item = this.getCurrentItem();
    if (!item) return;
    
    const term = String(item.term || '');
    const isAcr = /^[A-Z0-9\-\/]{2,15}$/.test(term);
    const display = isAcr ? term.toUpperCase() : this.toTitle(term);
    const desc = String(item.description || '').trim();
    const fullTitle = isAcr && desc ? `${display} (${this.toTitle(desc)})` : display;
    
    // Helper function to replace term with blanks
    const hideTermInText = (text) => {
      if (this.studyDirection !== 'def-to-term') return text;
      
      let result = text;
      
      // Replace the term itself (case-insensitive)
      const termPattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const termRegex = new RegExp(`\\b${termPattern}\\b`, 'gi');
      result = result.replace(termRegex, '______');
      
      // If it's an acronym with a description (full phrase), also hide that
      if (isAcr && desc) {
        const descPattern = desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const descRegex = new RegExp(`\\b${descPattern}\\b`, 'gi');
        result = result.replace(descRegex, '______');
      }
      
      return result;
    };
    
    // Prepare definition content
    let definitionContent = '';
    
    // ===================================================================
    // START: *** THIS IS THE CORRECTED BLOCK ***
    // ===================================================================
    if (item._isMulti && item._isComparison) {
      // Check if this is a "table" item (like 'Authority') or a "list" item (like '3Rs')
      const hasMainSources = Array.isArray(item.sources) && item.sources.length > 0;
      const isTableLayout = item.type === 'multi-agency-table'; // <-- *** THIS IS THE FIX ***

      const rows = (item.definitions || []).map(d => {
        const label = d.label || d.source || ''; // This is the Role/Org OR the Source Label
        const definition = d.definition || '';
        
        // This part builds the *per-definition* sources (e.g., for "Agency Notification" or "3Rs")
        let defSourcesHTML = '';
        if (Array.isArray(d.sources) && d.sources.length) {
            // Case 1: Item has d.sources array (e.g., Agency Notification)
            const count = d.sources.length;
            const labelTxt = count > 1 ? 'Sources:' : 'Source:';
            const items = d.sources.map(s => {
              const t = s.text || '';
              const u = s.url || '';
              return u
                ? `<a href="${u}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs border mr-1 mb-1" tabindex="0">${this.esc(t)}</a>`
                : `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1 mb-1">${this.esc(t)}</span>`;
            }).join(' ');
            defSourcesHTML = `<div class="mt-2 text-sm text-gray-600"><strong>${labelTxt}</strong> ${items}</div>`;
        }
        else if (d.url && !hasMainSources) {
            // Case 2: Item has no main sources, so d.label IS the source (e.g., 3Rs)
            defSourcesHTML = `<div class="mt-2 text-sm text-gray-600"><strong>Source:</strong> <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs border mr-1 mb-1" tabindex="0">${this.esc(label)}</a></div>`;
        } else if (d.url && hasMainSources) {
            // Case 3: Item has main sources, but ALSO a URL on the definition row (e.g. IACUC Composition)
             defSourcesHTML = `<div class="mt-2 text-sm text-gray-600"><strong>Source:</strong> <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs border mr-1 mb-1" tabindex="0">${this.esc(label)}</a></div>`;
        }

        // Conditionally create a heading
        // ONLY create a heading if this is a "table" item
        const headingHTML = isTableLayout
          ? `<h5 class="font-semibold text-gray-700 mb-1">${this.esc(label)}</h5>` // It's a "Role" item
          : ''; // It's a "List" item (like 3Rs), don't show the source as a heading

        return `
        <div class="mb-4 pb-4 border-b last:border-0">
          ${headingHTML}
          <div class="text-gray-800 leading-relaxed ${isTableLayout ? 'pl-2' : ''}">${this.esc(hideTermInText(definition))}</div>
          ${defSourcesHTML}
        </div>
        `;
      }).join('');
      
      // Now, build the main 'item.sources' (for 'Authority', 'Responsibilities', etc.)
      let mainSourcesHTML = '';
      if (hasMainSources) {
          const count = item.sources.length;
          const labelTxt = count > 1 ? 'Sources:' : 'Source:';
          const items = item.sources.map(s => {
            const t = s.text || '';
            const u = s.url || '';
            return u
              ? `<a href="${u}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs border mr-1 mb-1" tabindex="0">${this.esc(t)}</a>`
              : `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1 mb-1">${this.esc(t)}</span>`;
          }).join(' ');
          mainSourcesHTML = `<div class="text-sm text-gray-600 pt-3 border-t"><strong>${labelTxt}</strong> ${items}</div>`;
      }

      definitionContent = rows + mainSourcesHTML; // Combine them
    } 
    // ===================================================================
    // END: *** THIS IS THE CORRECTED BLOCK ***
    // ===================================================================
    else if (item._isMulti) {
      // This block handles non-comparison multi-items (where all definitions are the same)
      const sourcePills = (item.definitions || []).map(d => {
        const label = d.label || d.source || '';
        const url = d.url || '';
        if (url) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border hover:bg-[#00447C] hover:text-white hover:border-[#00447C] transition-colors cursor-pointer mr-1" tabindex="0">${this.esc(label)}</a>`;
        } else {
          return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border mr-1">${this.esc(label)}</span>`;
        }
      }).join('');
      definitionContent = `
        <div class="text-gray-800 mb-4 leading-relaxed">${this.esc(hideTermInText(item.definitions[0].definition || ''))}</div>
        <div class="text-sm text-gray-600 pt-3 border-t"><strong>Sources:</strong> ${sourcePills}</div>
      `;
    } else {
      // This block handles simple terms
      let sourcePill = '';
      if (item.source) {
        const url = item.source_url || '';
        if (url) {
          sourcePill = `<div class="text-sm text-gray-600 pt-3 border-t"><strong>Source:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer" class="source-pill inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border hover:bg-[#00447C] hover:text-white hover:border-[#00447C] transition-colors cursor-pointer" tabindex="0">${this.esc(item.source)}</a></div>`;
        } else {
          sourcePill = `<div class="text-sm text-gray-600 pt-3 border-t"><strong>Source:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border">${this.esc(item.source)}</span></div>`;
        }
      }
      definitionContent = `
        <div class="text-gray-800 mb-4 leading-relaxed">${this.esc(hideTermInText(item.definition || ''))}</div>
        ${sourcePill}
      `;
    }
    
    // Determine front and back content based on direction
    let frontContent, backContent;
    if (this.studyDirection === 'term-to-def') {
      // Show term on front, definition on back
      frontContent = `
        <div class="text-center">
          <div class="text-4xl font-bold text-[#00447C] mb-4">${fullTitle}</div>
          <div class="text-gray-500 text-sm mt-8">Click to reveal definition</div>
        </div>
      `;
      
      backContent = `
        <div class="flashcard-back-centered">
          <div>
            <div class="text-2xl font-bold text-[#00447C] mb-4 text-center pb-4 border-b">${fullTitle}</div>
            ${definitionContent}
          </div>
          <div class="text-gray-500 text-sm mt-8 text-center">Click to flip back</div>
        </div>
      `;
    } else {
      // Show definition on front, term on back
      frontContent = `
        <div class="text-gray-800 leading-relaxed text-center" style="max-width: 600px; margin: 0 auto;">
          ${definitionContent}
          <div class="text-gray-500 text-sm mt-6 text-center">Click to reveal term</div>
        </div>
      `;
      backContent = `
        <div class="text-center">
          <div class="text-4xl font-bold text-[#00447C] mb-4">${fullTitle}</div>
          <div class="text-gray-500 text-sm mt-6 text-center">Click to flip back</div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard ${this.isFlipped ? 'flipped' : ''}" 
             tabindex="0"
             role="button"
             aria-label="${this.isFlipped ? 'Flip card to front' : 'Flip card to back'}">
          <div class="flashcard-inner">
            <div class="flashcard-front">
              ${this.studyDirection === 'term-to-def' ? frontContent : `<div class="flashcard-back-centered">${frontContent}</div>`}
            </div>
            <div class="flashcard-back">
              ${this.studyDirection === 'term-to-def' 
                ? backContent
                : `<div class="flashcard-back-centered">${backContent}`
              }
            </div>
          </div>
        </div>
        <div class="flashcard-controls">
          <button class="control-btn" data-action="prev" ${this.currentCardIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>
          <div class="progress-indicator">
            <span class="font-semibold">${this.currentCardIndex + 1}</span> of <span class="font-semibold">${items.length}</span>
          </div>
          <button class="control-btn" data-action="next" ${this.currentCardIndex === items.length - 1 ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    `;
    
    // Enhance all source links in the flashcard with read/star functionality
    if (window.linkEnhancer) {
      const links = this.container.querySelectorAll('a.source-pill');
      const term = String(item.term || '');
      const isAcr = /^[A-Z0-9\-\/]{2,15}$/.test(term);
      const desc = String(item.description || '').trim();
      const termTitle = isAcr && desc ? `${term.toUpperCase()} (${this.toTitle(desc)})` : (isAcr ? term.toUpperCase() : this.toTitle(term));
      
      links.forEach(link => {
        const context = {
          type: 'glossary',
          title: link.textContent.trim(),
          source: `Glossary: ${termTitle}`
        };
        window.linkEnhancer.enhanceLink(link, context);
      });
    }
  }
  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.renderFlashcard();
  }
  nextCard() {
    const items = this.apply();
    if (this.currentCardIndex < items.length - 1) {
      this.currentCardIndex++;
      this.isFlipped = false;
      this.renderFlashcard();
    }
  }
  prevCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.isFlipped = false;
      this.renderFlashcard();
    }
  }
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
document.addEventListener('DOMContentLoaded',()=>{ if(document.getElementById('glossary')){ const gm=new GlossaryManager(); gm.init(); window.glossaryManager = gm; }});

// =============================================
// INTEGRATED PATCH: r3d Glossary Card Tagging
// (Previously in assets/js/r3d-glossary-cards.js)
// =============================================

// Find the Glossary tab by text, get its tabpanel via aria-controls, and tag cards within it.
(function () {
  function getGlossaryPanel() {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const t of tabs) {
      const label = (t.textContent || "").trim().toLowerCase();
      if (label.includes("glossary")) {
        const pId = t.getAttribute("aria-controls");
        if (pId) {
          const panel = document.getElementById(pId);
          if (panel) return panel;
        }
      }
    }
    // Fallback: any element with id/class containing 'gloss'
    return document.querySelector('[id*="gloss" i], [class*="gloss" i]');
  }

  function looksLikeCard(el) {
    if (!(el instanceof HTMLElement)) return false;
    const c = " " + (el.className || "") + " ";
    return (
      (/\bbg-white\b/.test(c) || /\bborder\b/.test(c)) &&
      (/\brounded-lg\b/.test(c) || /\brounded-2xl\b/.test(c) || /\brounded-xl\b/.test(c) || /\brounded\b/.test(c))
    ) || /\bcard\b/.test(c) || /\btile\b/.test(c);
  }

  function containsTermLikeContent(el) {
    // Heuristics: links, tables, definition lists, or obvious heading+small text combos
    return !!(el.querySelector('a, table, dl, dt, dd, h3, h4, .text-lg, .font-semibold'));
  }

  function tagGlossaryCards() {
    const panel = getGlossaryPanel();
    if (!panel) return;
    const candidates = panel.querySelectorAll('.glossary-card, .bg-white, .border, .card, .tile');
    candidates.forEach(el => {
      if (el.classList.contains('glossary-card')) return;
      if (looksLikeCard(el) && containsTermLikeContent(el)) {
        el.classList.add('glossary-card');
      }
    });
  }

  function init() {
    tagGlossaryCards();
    // Re-tag when tabs change
    document.addEventListener('click', () => setTimeout(tagGlossaryCards, 0), true);
    // Watch for dynamic content
    const mo = new MutationObserver(() => tagGlossaryCards());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();