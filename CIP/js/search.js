/**
 * Global Search Feature - Fixed and Enhanced
 * Searches across documents, glossary, historical cases, and quiz questions
 */

(function(){
  // Data sources configuration
  const DATA = {
    documents: 'data/documents.json',
    glossary: 'data/glossary.json',
    historical: 'data/historical-foundations.json',
    quiz: 'data/quiz.json'
  };
  
  // State object to hold references
  const S = { 
    index: null, 
    modal: null, 
    drawer: null,
    overlay: null,
    input: null, 
    results: null, 
    count: null, 
    trigger: null,
    lastQuery: '', // Preserve search query
    isOpen: false
  };

  // Utility functions
  const norm = s => String(s||'').replace(/\s+/g,' ').trim();
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  
  // IMPROVED: Use partial/substring matching instead of word boundaries
  // This allows matching "Henr" -> "Henrietta", "1965" -> years in content, etc.
  const partialRe = w => new RegExp(esc(w),'i');
  const hasAll = (hay, words) => words.every(w => partialRe(w).test(hay));
  
  // Remove emoji from strings (for document titles)
  const removeEmoji = s => String(s||'').replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  
  // Format string to title case (matching glossary.js behavior)
  const toTitleCase = s => {
    if (s === '3Rs') return s; // Special case
    return String(s).split(/(\s+|\-|\/)/).map(p => 
      (/^\s+$/.test(p) || p === '-' || p === '/') ? p : p[0].toUpperCase() + p.slice(1).toLowerCase()
    ).join('');
  };

  /**
   * Build search index from all data sources
   */
  async function buildIndex(){
    if (S.index) return S.index;

    const [docs, glos, hist, quiz] = await Promise.all([
      fetch(DATA.documents).then(r=>r.json()).catch(()=>null),
      fetch(DATA.glossary).then(r=>r.json()).catch(()=>null),
      fetch(DATA.historical).then(r=>r.json()).catch(()=>null),
      fetch(DATA.quiz).then(r=>r.json()).catch(()=>null)
    ]);

    const idx = [];

    // Flatten documents so we can optionally pull full modal text
    const docItems = [];
    if (docs && docs.categories){
      for (const [cat, items] of Object.entries(docs.categories)){
        if (!items) continue;

        // Standard categories: simple array of document objects
        if (Array.isArray(items)) {
          items.forEach(d => {
            if (d) docItems.push({ cat, doc: d });
          });
          continue;
        }

        // Nested categories (e.g., "charts-and-tables") with subgroups
        if (typeof items === 'object') {
          Object.values(items).forEach(group => {
            if (group && Array.isArray(group.items)) {
              group.items.forEach(d => {
                if (d) docItems.push({ cat, doc: d });
              });
            }
          });
        }
      }
    }

    // Pre-fetch local modal document HTML (docs/*.html) so search can
    // match against the full text shown in the document modals.
    const docBodyMap = {};
    if (docItems.length){
      const modalDocs = docItems.filter(({doc}) => doc && typeof doc.url === 'string' && doc.url.startsWith('docs/'));
      await Promise.all(
        modalDocs.map(({doc}) => 
          fetch(doc.url)
            .then(r => r.text())
            .then(html => {
              const plain = html.replace(/<[^>]+>/g, ' ');
              docBodyMap[doc.url] = norm(plain);
            })
            .catch(() => { /* ignore failures so search still works */ })
        )
      );
    }

    // Index Documents (title + description/category + optional modal body)
    if (docItems.length){
      docItems.forEach(({cat, doc}) => {
        const title = norm(doc.title||'');
        const descText = norm(((doc.description||'') + ' ' + cat).trim());
        const bodyText = (doc.url && docBodyMap[doc.url]) ? docBodyMap[doc.url] : '';
        const text = bodyText ? norm((descText + ' ' + bodyText).trim()) : descText;
        idx.push({ 
          type: 'Documents', 
          title, 
          text, 
          url: doc.url||null, 
          internal: { tab: '#documents', query: title }, 
          _hay: (title+' '+text).toLowerCase() 
        });
      });
    }

    // Index Glossary
    if (Array.isArray(glos)){
      glos.forEach(g=>{
        const defs = Array.isArray(g.definitions)
          ? g.definitions.map(d=>(d.label||'')+' '+(d.definition||'')).join(' ') 
          : (g.definition||'');
        const title = norm(g.term||'');
        const text = norm((g.description||'')+' '+defs);
        idx.push({ 
          type: 'Glossary', 
          title, 
          text, 
          url: null, 
          internal: { tab: '#glossary', query: title }, 
          _hay: (title+' '+text).toLowerCase() 
        });
      });
    }

    // Index Historical Timeline Events
    if (hist && Array.isArray(hist.timeline)){
      hist.timeline.forEach((event, eventIndex) => {
        const title = norm(event.title || '');
        const text = norm([
          event.year || '',
          ...(event.description || []),
          ...(event.key_points || []),
          ...(event.impact_today || [])
        ].join(' '));
        const itemId = `timeline-${eventIndex}`;
        idx.push({ 
          type: 'Historical Foundations', 
          title, 
          text, 
          url: null, 
          internal: { tab: '#historical', itemId: itemId }, 
          _hay: (title+' '+text).toLowerCase() 
        });
      });
    }

    // Index Quiz Questions
    if (quiz && Array.isArray(quiz.questions)){
      quiz.questions.forEach(q=>{
        const title = norm((q.number?`${q.number}. `:'') + (q.question||''));
        const text  = norm(String(q.feedback||'').replace(/<[^>]+>/g,' '));
        idx.push({ 
          type: 'Knowledge Checks', 
          title, 
          text, 
          url: null, 
          internal: { tab: '#quiz', query: q.question||'' }, 
          _hay: (title+' '+text).toLowerCase() 
        });
      });
    }

    S.index = idx;
    return idx;
  }


  /**
   * Create the search modal HTML - matching saved drawer styling
   */
  function createDrawerHTML() {
    const html = `
      <button id="global-search-trigger" 
              class="fixed right-4 top-4 z-40 fab-brand text-white p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Open search"
              title="Search across all content"
              aria-expanded="false">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
      
      <div id="global-search-overlay" 
           class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity"></div>
      
      <aside id="global-search-drawer" 
             class="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl z-50 transform translate-x-full transition-transform duration-300" 
             role="dialog" 
             aria-modal="true" 
             aria-labelledby="search-drawer-title">
        <div class="flex flex-col h-full">
          <div class="drawer-header">
            <div class="flex items-center justify-between p-4 border-b border-white/20">
              <h2 id="search-drawer-title" class="text-xl font-bold flex items-center gap-2 text-white">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Global Search
              </h2>
              <button id="global-search-close" 
                      class="text-white hover:bg-white/20 p-2 rounded flex items-center justify-center transition-colors"
                      aria-label="Close search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div class="p-4">
              <div class="relative">
                <input id="global-search-input" 
                       type="search" 
                       placeholder="Search documents, glossary, historical foundations, and questions…" 
                       class="w-full px-4 py-3 pr-10 bg-white/95 text-gray-800 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                       aria-label="Search the entire tool"
                       autocomplete="off" />
                <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <div class="mt-2 flex items-center justify-between text-xs text-white/70">
                <span id="global-search-count" class="hidden">Showing 0 results</span>
              </div>
            </div>
          </div>
          
          <div id="global-search-results" class="flex-1 overflow-y-auto bg-gray-50">
            <div class="p-6 text-center text-gray-500">
              <svg class="mx-auto mb-3 text-gray-400" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p>Type to search across the entire tool</p>
              <p class="text-sm mt-1 text-gray-400">Documents • Glossary • Historical Foundations • Knowledge Checks</p>
            </div>
          </div>
          
          <div class="border-t border-gray-200 bg-white px-4 py-3">
            <div class="text-xs text-gray-500">
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+K</kbd>
                <span>or</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">/</kbd>
                <span>to open search anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Open the search drawer
   */
  function openModal(){
    if (S.isOpen) return;
    
    S.isOpen = true;
    S.overlay.classList.remove('hidden');
    S.drawer.classList.remove('translate-x-full');
    S.trigger.setAttribute('aria-expanded', 'true');
    
    // Restore previous search query
    S.input.value = S.lastQuery;
    
    // If there was a previous query, run the search again
    if (S.lastQuery.trim()) {
      filter(S.lastQuery);
    }
    
    // Focus input after animation
    setTimeout(() => S.input.focus(), 100);
    
    // Update focusability
    updateFocusability(true);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the search drawer
   */
  function closeModal(){ 
    if (!S.isOpen) return;
    
    S.isOpen = false;
    S.drawer.classList.add('translate-x-full');
    S.overlay.classList.add('hidden');
    S.trigger.setAttribute('aria-expanded', 'false');
    
    // Save the current query before closing (don't clear it)
    S.lastQuery = S.input.value;
    
    // Update focusability
    updateFocusability(false);
    
    // Re-enable body scroll
    document.body.style.overflow = '';
  }

  /**
   * Control focusability of drawer elements for accessibility
   */
  function updateFocusability(isFocusable) {
    if (!S.drawer) return;
    
    const focusableElements = S.drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled])'
    );
    
    if (isFocusable) {
      focusableElements.forEach(el => el.removeAttribute('tabindex'));
    } else {
      focusableElements.forEach(el => el.setAttribute('tabindex', '-1'));
    }
  }

  /**
   * Render search results
   */
  function render(items, q){
    const queryTrimmed = (q||'').trim();
    
    // Update count
    if (queryTrimmed) { 
      S.count.classList.remove('hidden');
      S.count.textContent = `Showing ${items.length} result${items.length !== 1 ? 's' : ''}`; 
    } else { 
      S.count.classList.add('hidden');
    }
    
    // No results
    if (!items.length) { 
      S.results.innerHTML = `
        <div class="p-6 text-center text-gray-500">
          <svg class="mx-auto mb-3 text-gray-400" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No results found for "${queryTrimmed}"</p>
          <p class="text-sm mt-1 text-gray-400">Try different keywords</p>
        </div>
      `;
      return; 
    }
    
    // Group results by type
    const groups = items.reduce((m,it)=>((m[it.type]=m[it.type]||[]).push(it), m), {});
    const order = ['Documents','Glossary','Historical Foundations','Knowledge Checks'];
    
    const out = document.createElement('div');
    out.className = 'divide-y divide-gray-200';
    
    for (const type of order) {
      const list = groups[type]; 
      if (!list) continue;
      
      // *** NEW SORTING BLOCK ***
      // Sorts the list alphanumerically by title before rendering
      const sortedList = [...list].sort((a, b) => {
        const aTitle = a.title || '';
        const bTitle = b.title || '';
        const aMatch = aTitle.match(/^(\d+)/);
        const bMatch = bTitle.match(/^(\d+)/);
        
        if (aMatch && bMatch) {
            const aNum = parseInt(aMatch[1], 10);
            const bNum = parseInt(bMatch[1], 10);
            if (aNum !== bNum) {
                return aNum - bNum;
            }
            return aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
        }
        if (aMatch) return -1;
        if (bMatch) return 1;
        return aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
      });
      // *** END SORTING BLOCK ***
      
      const sec = document.createElement('section');
      sec.className = 'bg-white';
      sec.innerHTML = `<h3 class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 sticky top-0">${type} (${sortedList.length})</h3>`;
      
      const ul = document.createElement('ul'); 
      ul.className = 'divide-y divide-gray-100';
      
      // *** MODIFIED: Loop over sortedList instead of list ***
      sortedList.forEach((it, idx) => {
        const li = document.createElement('li');
        li.className = 'search-result-item px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50';
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.setAttribute('aria-label', `Open ${it.title}`);
        
        const snippet = (it.text).slice(0, 150);
        
        // Format title based on result type
        let displayTitle = it.title;
        if (type === 'Documents') {
          displayTitle = removeEmoji(it.title);
        } else if (type === 'Glossary') {
          // Use glossary term exactly as authored (preserve IRB, 3Rs, etc.)
          displayTitle = it.title;
        }
        
        li.innerHTML = `
          <div class="font-semibold text-[#00447C] mb-1">${highlightMatches(displayTitle, q)}</div>
          <div class="text-sm text-gray-600 line-clamp-2">${highlightMatches(snippet, q)}${snippet.length >= 150 ? '...' : ''}</div>
        `;
        
        li.addEventListener('click', () => openResult(it));
        li.addEventListener('keydown', e => { 
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openResult(it);
          }
        });
        
        ul.appendChild(li);
      });
      
      sec.appendChild(ul); 
      out.appendChild(sec);
    }
    
    S.results.innerHTML = '';
    S.results.appendChild(out);
  }

  /**
   * Switch to a tab and reveal/highlight the matching content
   */
  function switchTabAndReveal(internal){
    const tabBtn = document.querySelector('.nav-tab[data-tab-target="'+internal.tab+'"]');
    if (tabBtn) tabBtn.click();
    
    setTimeout(() => {
      // If this is a historical item with itemId, highlight the card
      if (internal.tab === '#historical' && internal.itemId) {
        // Wait for tab content to render
        setTimeout(() => {
          const element = document.querySelector(`[data-item-id="${CSS.escape(internal.itemId)}"]`);
          if (element) {
            // Find the card container
            const container = element.closest('.historical-card') || element;
            
            // Find the title (h3) within the card
            let titleElement = container.querySelector('h3') || container;
            
            // Add highlight
            titleElement.classList.add('search-highlight');
            const isMobile = window.innerWidth <= 768;
            container.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'center' });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              titleElement.classList.remove('search-highlight');
            }, 3000);
          }
        }, 200);
      }
      // If this is a historical item, switch to the correct browse mode
      else if (internal.tab === '#historical' && internal.browseMode) {
        const browseModeBtn = internal.browseMode === 'theme' 
          ? document.getElementById('browse-by-theme')
          : document.getElementById('browse-by-case');
        if (browseModeBtn) browseModeBtn.click();
        
        // Wait for browse mode content to render
        setTimeout(() => findAndHighlight(internal), 200);
      } else {
        findAndHighlight(internal);
      }
    }, 300);
  }
  
  function findAndHighlight(internal){
    const root = document.querySelector(internal.tab); 
    if (!root) return;
    
    // Find best matching element using word overlap
    const q = (internal.query||'').toLowerCase();
    const qTokens = new Set((q.match(/[a-z0-9]+/g)||[]));
    
    let best = null;
    let bestScore = -1;
    
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      const text = (el.textContent||'').toLowerCase();
      const elTokens = new Set((text.match(/[a-z0-9]+/g)||[]));
      
      let intersection = 0;
      for (const token of qTokens) {
        if (elTokens.has(token)) intersection++;
      }
      
      const union = elTokens.size + qTokens.size - intersection;
      const score = union ? intersection / union : 0;
      
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    
    if (best) {
      best.classList.add('search-highlight');
      // Use 'start' for mobile, 'center' for desktop (mobile has viewport issues with centering)
      const isMobile = window.innerWidth <= 768;
      best.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'center' });
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (best) best.classList.remove('search-highlight');
      }, 3000);
    }
  }

  /**
   * Open a search result
   */
  function openResult(item) { 
    closeModal();
    
    if (item.internal) {
      switchTabAndReveal(item.internal);
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener');
    }
  }

  /**
   * Filter search results based on query
   * FIXED: Corrected regex escaping bug
   */
  function filter(q){
    q = (q||'').trim();
    
    if (!q) { 
      S.results.innerHTML = `
        <div class="p-6 text-center text-gray-500">
          <svg class="mx-auto mb-3 text-gray-400" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>Type to search across the entire tool</p>
          <p class="text-sm mt-1 text-gray-400">Documents • Glossary • Historical • Knowledge Checks</p>
        </div>
      `;
      S.count.classList.add('hidden');
      return;
    }
    
    // FIXED: Changed from /\\s+/ to /\s+/
    const wordsArr = q.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = S.index.filter(it => hasAll(it._hay, wordsArr));
    
    render(filtered, q);
  }

  /**
   * Highlight matching text
   * IMPROVED: Now highlights partial matches, not just whole words
   */
  function highlightMatches(text, q){
    if (!q) return text;
    
    // Split query into words and escape for regex
    const parts = q.toLowerCase().trim().split(/\s+/).filter(Boolean).map(esc);
    
    try {
      // Highlight partial matches (removed word boundaries \b)
      return text.replace(
        new RegExp('('+parts.join('|')+')','gi'), 
        '<mark class="bg-yellow-200 text-gray-900 px-0.5 rounded">$1</mark>'
      );
    } catch {
      return text;
    }
  }

  /**
   * Mount event listeners
   */
  function mount(){
    S.modal = document.getElementById('global-search-modal'); // Legacy reference
    S.drawer = document.getElementById('global-search-drawer');
    S.overlay = document.getElementById('global-search-overlay');
    S.input = document.getElementById('global-search-input');
    S.results = document.getElementById('global-search-results');
    S.count = document.getElementById('global-search-count');
    S.trigger = document.getElementById('global-search-trigger');
    
    const closeBtn = document.getElementById('global-search-close');
    
    if (!S.drawer || !S.input || !S.results) {
      console.error('Search: Required elements not found');
      return;
    }
    
    // Trigger button
    if (S.trigger) {
      S.trigger.addEventListener('click', openModal);
    }
    
    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    // Overlay click
    if (S.overlay) {
      S.overlay.addEventListener('click', closeModal);
    }
    
    // Input changes
    S.input.addEventListener('input', e => filter(e.target.value));
    
    // Global keyboard shortcuts
    window.addEventListener('keydown', e => {
      // Open search: Ctrl+K or / (but not in input fields)
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || 
          (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
        e.preventDefault();
        openModal();
      }
      
      // Close search: Escape
      if (e.key === 'Escape' && S.isOpen) {
        closeModal();
      }
    });
    
    // Initialize focusability
    updateFocusability(false);
  }

  /**
   * Initialize
   */
  document.addEventListener('DOMContentLoaded', async () => {
    createDrawerHTML();
    mount();
    await buildIndex();
  });
})();