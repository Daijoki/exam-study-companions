/**
 * Notes system: contextual, one-per-item notes bound to the same IDs as stars.
 * - One note per item.
 * - Pen appears anywhere a star appears.
 * - Notes drawer lets you jump back into context with the note open.
 */

class NotesManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.modal = null;
    this.textarea = null;
    this.titleEl = null;
    this.backdrop = null;
    this.deleteButton = null;
    this.currentId = null;
    this.currentContext = null;
    this.lastSavedText = '';
    this.init();
  }

  init() {
    if (!this.stateManager) return;
    this.createModal();
    this.attachGlobalClickHandler();

    if (typeof this.stateManager.addListener === 'function') {
      this.stateManager.addListener((type, id) => {
        if (type === 'note') {
          this.updateNoteIcons(id);
          if (window.notesDrawer && typeof window.notesDrawer.handleNoteUpdate === 'function') {
            window.notesDrawer.handleNoteUpdate();
          }
        }
      });
    }
  }

  createModal() {
    if (this.modal) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'note-modal-backdrop';
    // --- MODIFICATION: Set z-index to appear over document modal (10000) ---
    backdrop.className = 'fixed inset-0 bg-black/40 hidden';
    backdrop.style.zIndex = '10005'; 
    backdrop.style.pointerEvents = 'none'; 
    backdrop.setAttribute('aria-hidden', 'true');

    const modal = document.createElement('div');
    modal.id = 'note-modal';
     // --- MODIFICATION: Set z-index to appear over document modal (10000) ---
    modal.className = 'fixed inset-x-4 top-24 md:left-1/2 md:-translate-x-1/2 md:w-[480px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 hidden';
    modal.style.zIndex = '10010';
    modal.innerHTML = `
      <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100" data-note-drag-handle>
        <h2 id="note-modal-title" class="text-sm font-semibold text-gray-800">Add Note</h2>
        <button class="p-1.5 rounded-full hover:bg-gray-100" type="button" aria-label="Close note editor" data-note-close>
          ${(window.ICONS && window.ICONS.cross) || '&times;'}
        </button>
      </div>
      <div class="px-4 pt-2 pb-3">
        <textarea id="note-modal-textarea"
          class="w-full h-32 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007CC2]"
          placeholder="Type your note here..."></textarea>
        <div class="mt-3 flex items-center justify-between gap-2">
          <button type="button"
            class="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
            data-note-delete>
            Delete
          </button>
          <div class="flex items-center gap-2">
            <span id="note-modal-status" class="text-[10px] text-gray-400"></span>
            <button type="button"
              class="text-xs font-semibold px-3 py-1.5 rounded-full brand-gradient text-white shadow hover:shadow-md"
              data-note-save>
              Save note
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    this.modal = modal;
    this.textarea = modal.querySelector('#note-modal-textarea');
    this.titleEl = modal.querySelector('#note-modal-title');
    this.backdrop = backdrop;
    this.deleteButton = modal.querySelector('[data-note-delete]');
    this.updateDeleteButtonState();
    if (this.textarea) {
      this.textarea.addEventListener('input', () => this.updateDeleteButtonState());
    }

    backdrop.addEventListener('click', () => this.handleCloseRequest());
    modal.querySelector('[data-note-close]').addEventListener('click', () => this.handleCloseRequest());
    modal.querySelector('[data-note-save]').addEventListener('click', () => this.save());
    if (this.deleteButton) {
      this.deleteButton.addEventListener('click', () => this.delete());
    }

    this.makeModalDraggable(modal);
  }

  updateDeleteButtonState() {
    if (!this.deleteButton || !this.textarea) return;
    const text = this.textarea.value ? this.textarea.value.trim() : '';
    const canDelete = text.length > 0;
    if (canDelete) {
      this.deleteButton.classList.remove('opacity-50');
    } else {
      this.deleteButton.classList.add('opacity-50');
    }
  }

  handleCloseRequest() {
    if (!this.modal || !this.textarea) {
      this.close();
      return;
    }
    const current = (this.textarea.value || '').trim();
    const baseline = (this.lastSavedText || '').trim();
    const hasUnsaved = current && current !== baseline;
    if (hasUnsaved) {
      const discard = confirm('You have unsaved changes to this note. Close without saving?');
      if (!discard) return;
    }
    this.close();
  }

  makeModalDraggable(modal) {
    if (!modal) return;
    const handle = modal.querySelector('[data-note-drag-handle]');
    if (!handle) return;

    // Help touch devices know this region is draggable, not scrollable
    try {
      handle.style.touchAction = 'none';
    } catch (e) {
      // ignore if not supported
    }

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const startDrag = (clientX, clientY) => {
      isDragging = true;

      const rect = modal.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      const viewportWidth = window.innerWidth || rect.width;
      const targetWidth = Math.min(rect.width, viewportWidth - 32, 480);
      modal.style.width = `${targetWidth}px`;
      modal.style.maxWidth = `${targetWidth}px`;
      startX = clientX;
      startY = clientY;
      modal.style.left = `${startLeft}px`;
      modal.style.top = `${startTop}px`;
      modal.style.right = 'auto';
      modal.style.bottom = 'auto';
      modal.style.transform = 'none';
    };

    const moveDrag = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      const maxLeft = window.innerWidth - 40;
      const minLeft = - (modal.offsetWidth - 40);
      const minTop = 0;
      const maxTop = window.innerHeight - 60;
      if (newLeft < minLeft) newLeft = minLeft;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop < minTop) newTop = minTop;
      if (newTop > maxTop) newTop = maxTop;
      modal.style.left = `${newLeft}px`;
      modal.style.top = `${newTop}px`;
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest('[data-note-close]')) return;
      startDrag(event.clientX, event.clientY);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!isDragging) return;
      moveDrag(event.clientX, event.clientY);
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('[data-note-close]')) return;
      startDrag(event.clientX, event.clientY);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      event.preventDefault();
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;
      moveDrag(event.clientX, event.clientY);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (event.target.closest && event.target.closest('[data-note-close]')) return;
      startDrag(touch.clientX, touch.clientY);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
      event.preventDefault();
    };

    const onTouchMove = (event) => {
      if (!isDragging || event.touches.length !== 1) return;
      const touch = event.touches[0];
      moveDrag(touch.clientX, touch.clientY);
      event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };

    if (window.PointerEvent) {
      handle.addEventListener('pointerdown', onPointerDown);
    } else {
      handle.addEventListener('mousedown', onMouseDown);
      handle.addEventListener('touchstart', onTouchStart, { passive: false });
    }
  }

  attachGlobalClickHandler() {
    // Use capture phase so we intercept before card/tile click handlers.
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-note-btn]');
      if (!trigger) return;

      e.preventDefault();
      e.stopPropagation();

      const itemId = trigger.getAttribute('data-note-id');
      if (!itemId) return;

      const context = {
        type: trigger.getAttribute('data-note-type') || 'item',
        label: trigger.getAttribute('data-note-label') || '',
        source: trigger.getAttribute('data-note-source') || ''
      };

      this.open(itemId, context);
    }, true);
  }

  open(itemId, context) {
    if (!this.stateManager) return;
    this.currentId = itemId;
    this.currentContext = context || {};

    const existing = this.stateManager.getNote(itemId);
    this.textarea.value = (existing && existing.text) || '';

    let labelFromExisting = existing && existing.label;
    const contextLabel = context && context.label;
    if (labelFromExisting && contextLabel) {
      // Upgrade generic quiz labels like "Question 1" to the richer context label when available
      const genericQuizPattern = /^Question \d+$/i;
      if (genericQuizPattern.test(labelFromExisting) && contextLabel.length > labelFromExisting.length) {
        labelFromExisting = contextLabel;
      }
    }
    const label = labelFromExisting || contextLabel || '';
    this.titleEl.textContent = label ? `Note: ${label}` : 'Add Note';
    this.lastSavedText = (existing && existing.text) || '';

    this.modal.classList.remove('hidden');
    this.backdrop.classList.remove('hidden');
    this.backdrop.setAttribute('aria-hidden', 'false');
    this.textarea.focus();
    this.setStatus(existing && existing.text ? 'Loaded' : '');
    this.updateDeleteButtonState();
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
    this.backdrop.classList.add('hidden');
    this.backdrop.setAttribute('aria-hidden', 'true');
    // Reset any inline positioning & sizing so the modal returns to default next time
    this.modal.style.left = '';
    this.modal.style.top = '';
    this.modal.style.right = '';
    this.modal.style.bottom = '';
    this.modal.style.transform = '';
    this.modal.style.width = '';
    this.modal.style.maxWidth = '';
    this.setStatus('');
    this.currentId = null;
    this.currentContext = null;
  }

  setStatus(msg) {
    const el = this.modal && this.modal.querySelector('#note-modal-status');
    if (el) el.textContent = msg || '';
  }

  save() {
    if (!this.currentId || !this.stateManager) {
      this.close();
      return;
    }
    const text = (this.textarea.value || '').trim();
    if (!text) {
      this.delete();
      return;
    }

    const payload = {
      text,
      label: (this.currentContext && this.currentContext.label) || '',
      type: (this.currentContext && this.currentContext.type) || 'item',
      source: (this.currentContext && this.currentContext.source) || ''
    };

    this.stateManager.saveNote(this.currentId, payload);
    this.lastSavedText = text;
    this.setStatus('Saved');
    this.updateDeleteButtonState();
    setTimeout(() => this.close(), 120);
  }

  delete() {
    if (!this.currentId || !this.stateManager) {
      this.close();
      return;
    }
    const text = this.textarea && this.textarea.value ? this.textarea.value.trim() : '';
    if (!text) {
      // Nothing to delete; ignore.
      return;
    }
    if (!confirm('Delete this note?')) {
      return;
    }
    this.stateManager.deleteNote(this.currentId);
    this.textarea.value = '';
    this.lastSavedText = '';
    this.setStatus('Deleted');
    this.updateDeleteButtonState();
    setTimeout(() => this.close(), 80);
  }

  updateNoteIcons(itemId) {
    if (!this.stateManager) return;
    const hasNote = this.stateManager.hasNote(itemId);
    const selector = `[data-note-btn][data-note-id="${CSS.escape(itemId)}"]`;
    document.querySelectorAll(selector).forEach((btn) => {
      const iconSpan = btn.querySelector('[data-note-icon]');
      if (!iconSpan) return;
      if (hasNote) {
        iconSpan.innerHTML = (window.ICONS && window.ICONS.noteFilled) || '槙';
        btn.setAttribute('title', 'Edit note');
      } else {
        iconSpan.innerHTML = (window.ICONS && window.ICONS.noteOutline) || '槙';
        btn.setAttribute('title', 'Add note');
      }
    });
  }
}

class NotesDrawer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.isOpen = false;
    this.currentQuery = '';
    this.debouncedRender = null;

    this.toggle = null;
    this.overlay = null;
    this.drawer = null;
    this.content = null;
    this.closeBtn = null;
    this.countBadge = null;
    this.searchInput = null;
    this.searchCountEl = null;

    this.init();
  }

  init() {
    if (!this.stateManager) return;
    this.createHTML();
    this.cacheElements();
    this.bindEvents();
    this.render();

    if (this.stateManager && typeof this.stateManager.addListener === 'function') {
      this.stateManager.addListener(() => {
        if (this.isOpen) this.render();
        this.updateBadge();
      });
    }

    this.updateBadge();
    window.notesDrawer = this;
  }

  createHTML() {
    const toggle = document.createElement('button');
    toggle.id = 'notes-drawer-toggle';
    toggle.className =
      'fixed right-4 top-36 z-40 fab-brand text-white p-3 rounded-full';
    toggle.setAttribute('aria-label', 'Open notes');
    toggle.setAttribute('title', 'View your notes');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `
      <span class="text-xl">${(window.ICONS && window.ICONS.noteOutline) || '槙'}</span>
      <span id="notes-count-badge" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center hidden">0</span>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'notes-drawer-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity';

    const drawer = document.createElement('aside');
    drawer.id = 'notes-drawer';
    drawer.className =
      'fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform translate-x-full transition-transform z-50 flex flex-col';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-labelledby', 'notes-drawer-title');

    // **UPDATED HTML STRUCTURE**
    // This now matches the layout of the Global Search drawer
    drawer.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="drawer-header flex-shrink-0">
          <div class="flex items-center justify-between p-4 border-b border-white/20">
            <h2 id="notes-drawer-title" class="text-xl font-bold flex items-center gap-2 text-white">
              <span>${(window.ICONS && window.ICONS.noteOutline) || '槙'}</span>
              Notes
            </h2>
            <button id="notes-drawer-close"
              class="text-white hover:bg-white/20 p-2 rounded flex items-center justify-center"
              aria-label="Close notes drawer">
              <span class="text-xl">${(window.ICONS && window.ICONS.cross) || '&times;'}</span>
            </button>
          </div>
          
          <div class="p-4">
            <div class="relative">
              <input id="notes-search-input"
                     type="search"
                     placeholder="Search notes..."
                     class="w-full px-4 py-3 pr-10 bg-white/95 text-gray-800 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                     aria-label="Search your notes"
                     autocomplete="off" />
              <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-white/70">
              <span id="notes-search-count" class="hidden">Showing 0 results</span>
            </div>
          </div>
        </div>

        <div id="notes-drawer-content" class="flex-1 overflow-y-auto py-2"></div>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
  }

  cacheElements() {
    this.toggle = document.getElementById('notes-drawer-toggle');
    this.overlay = document.getElementById('notes-drawer-overlay');
    this.drawer = document.getElementById('notes-drawer');
    this.content = document.getElementById('notes-drawer-content');
    this.closeBtn = document.getElementById('notes-drawer-close');
    this.countBadge = document.getElementById('notes-count-badge');
    
    // **UPDATED SELECTORS**
    // These elements are now inside the main drawer
    this.searchInput = this.drawer.querySelector('#notes-search-input');
    this.searchCountEl = this.drawer.querySelector('#notes-search-count');
  }

  bindEvents() {
    this.toggle.addEventListener('click', () => this.toggleDrawer());
    this.overlay.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());

    // Debounced search
    this.debouncedRender = Utils.debounce(() => this.render(), 200);
    this.searchInput.addEventListener('input', (e) => {
        this.currentQuery = e.target.value;
        this.debouncedRender();
    });

    this.content.addEventListener('click', (e) => {
      // Check for delete button first
      const deleteBtn = e.target.closest('[data-note-delete-id]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.getAttribute('data-note-delete-id');
        this.deleteNoteFromDrawer(id);
        return;
      }

      // Then check for jump button
      const row = e.target.closest('[data-note-jump-id]');
      if (!row) return;
      const id = row.getAttribute('data-note-jump-id');
      const type = row.getAttribute('data-note-jump-type');
      this.jumpTo(id, type);
    });
  }

  deleteNoteFromDrawer(id) {
    if (!this.stateManager || !id) return;
    if (confirm('Delete this note?')) {
      this.stateManager.deleteNote(id);
      // handleNoteUpdate will be called automatically via state listener
    }
  }

  toggleDrawer() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.render(); // Render before showing
    this.drawer.classList.remove('translate-x-full');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.overlay.classList.remove('hidden');
    // Restore previous search query and focus
    this.searchInput.value = this.currentQuery;
    setTimeout(() => this.searchInput.focus(), 100);
  }

  close() {
    this.isOpen = false;
    // Don't clear search query on close
    // this.currentQuery = ''; 
    // this.searchInput.value = '';

    this.drawer.classList.add('translate-x-full');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.overlay.classList.add('hidden');
    this.toggle.focus();
  }

  handleNoteUpdate() {
    // Always re-render and refresh badge when notes change
    if (this.isOpen) {
      this.render();
    }
    this.updateBadge();
  }

  
  updateBadge() {
    if (!this.stateManager || !this.countBadge) return;
    const notes = this.stateManager.getAllNotes ? this.stateManager.getAllNotes() : [];
    const count = Array.isArray(notes) ? notes.length : 0;
    if (count > 0) {
      this.countBadge.textContent = count;
      this.countBadge.classList.remove('hidden');
    } else {
      this.countBadge.classList.add('hidden');
    }
  }

  render() {
    if (!this.stateManager || !this.content) return;
    
    // Get all notes *first*, then filter
    const allNotes = this.stateManager.getAllNotes();
    const query = this.currentQuery.trim();
    const queryLC = query.toLowerCase();

    let filteredNotes = allNotes;
    if (queryLC) {
        this.searchCountEl.classList.remove('hidden');
        filteredNotes = allNotes.filter(note => {
            const hay = (note.label || '') + ' ' + (note.text || '');
            return hay.toLowerCase().includes(queryLC);
        });
        this.searchCountEl.textContent = `Showing ${filteredNotes.length} result${filteredNotes.length !== 1 ? 's' : ''}`;
    } else {
        this.searchCountEl.classList.add('hidden');
    }

    // Case 1: No notes at all
    if (allNotes.length === 0) {
        this.searchCountEl.classList.add('hidden');
        this.content.innerHTML = `
            <div class="text-center text-gray-500 py-12 px-6">
                <div class="mb-4 text-gray-400">
                    <svg class="mx-auto" width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
                    </svg>
                </div>
                <p class="text-lg font-medium">No notes yet</p>
                <p class="text-sm mt-2">Click the pen icon <span class="inline-block align-middle w-4 h-4">${(window.ICONS && window.ICONS.noteOutline) || '槙'}</span> next to any item to save a note.</p>
            </div>
        `;
        return;
    }

    // Case 2: No search results
    if (filteredNotes.length === 0) {
        this.content.innerHTML = `
            <div class="text-center text-gray-500 py-12 px-6">
                 <div class="mb-4 text-gray-400">
                    <svg class="mx-auto" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="7"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <p class="text-lg font-medium">No notes found</p>
                <p class="text-sm mt-2">No notes matched your search for "${this.escapeHtml(query)}".</p>
            </div>
        `;
        return;
    }

    // Case 3: Show results
    const groups = { document: [], glossary: [], historical: [], quiz: [], item: [] };

    filteredNotes.forEach((n) => {
      const t = n.type && groups[n.type] ? n.type : 'item';
      groups[t].push(n);
    });

    const labelMap = {
      document: 'Documents',
      glossary: 'Glossary',
      historical: 'Historical Foundations',
      quiz: 'Knowledge Checks',
      item: 'Other'
    };

    // This structure now mimics the Global Search results, with sections
    const sections = Object.entries(groups)
      .filter(([, arr]) => arr.length)
      .map(([type, arr]) => {
        const label = labelMap[type] || type;

        // *** ALPHANUMERIC SORT LOGIC ADDED HERE ***
        // Sort the notes array (arr) based on the logic from saved-drawer.js
        const sortedArr = arr.sort((a, b) => {
            const aLabel = a.label || '';
            const bLabel = b.label || '';

            // Smart alphanumeric sort (from saved-drawer.js)
            const aMatch = aLabel.match(/^(\d+)/);
            const bMatch = bLabel.match(/^(\d+)/);
            
            if (aMatch && bMatch) {
                const aNum = parseInt(aMatch[1], 10);
                const bNum = parseInt(bMatch[1], 10);
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
                // If numbers are equal, compare the rest of the string
                return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
            }
            
            // If only one starts with a number, number comes first
            if (aMatch) return -1;
            if (bMatch) return 1;
            
            // Otherwise, regular alphabetical sort
            return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
        });
        // *** END SORTING LOGIC ***

        const rows = sortedArr // Use sortedArr instead of arr
          .map((n) => {
            const safeLabel = this.escapeHtml(n.label || n.id || '');
            const preview = this.escapeHtml((n.text || '').replace(/\s+/g, ' ').slice(0, 140));
            
            const finalLabel = query ? this.highlight(safeLabel, query) : safeLabel;
            const finalPreview = query ? this.highlight(preview, query) : preview;

            return `
              <li class="notes-note-row">
                <div class="notes-note-row-inner flex items-start justify-between gap-2 p-3 transition-colors">
                  <button class="flex-1 text-left min-w-0" data-note-jump-id="${n.id}" data-note-jump-type="${type}"
                          role="button" tabindex="0" aria-label="Open note for ${safeLabel}">
                    <div class="font-medium text-sm text-blue-600 hover:underline">${finalLabel || '(Untitled item)'}</div>
                    ${
                      preview
                        ? `<div class="text-xs text-gray-500 mt-1 line-clamp-2">${finalPreview}</div>`
                        : ''
                    }
                  </button>
                  <button class="flex-shrink-0 text-red-500 hover:text-red-700 hover:scale-110 transition-transform p-1" 
                          data-note-delete-id="${n.id}"
                          title="Delete note"
                          aria-label="Delete note for ${safeLabel}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </li>
            `;
          })
          .join('');
          
        // Create section with sticky header, like search results
        return `
          <section class="notes-section">
            <h3 class="notes-section-header px-4 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0">${label} (${arr.length})</h3>
            <ul class="notes-section-list px-3 pb-3 space-y-2">
              ${rows}
            </ul>
          </section>
        `;
})
      .join('');

    this.content.innerHTML = `<div class="divide-y divide-gray-200">${sections}</div>`;
  }

  jumpTo(id, fallbackType) {
    if (!id || !this.stateManager) return;

    const note = this.stateManager.getNote(id) || {};
    const type = note.type || fallbackType || 'item';

    // Map note types to tabs (matching saved drawer)
    const tabMap = {
      'document': '#documents',
      'glossary': '#glossary',
      'historical': '#historical',
      'quiz': '#quiz'
    };

    this.close();

    const tabSelector = tabMap[type];
    if (tabSelector) {
      const tabBtn = document.querySelector(`.nav-tab[data-tab-target="${tabSelector}"]`);
      if (tabBtn) tabBtn.click();

      // Special handling for historical foundations - switch browse mode
      if (type === 'historical') {
        setTimeout(() => {
          // Determine if it's a case or theme based on itemId
          const isCase = id.includes('historical-case');
          const isTheme = id.includes('historical-theme');

          if (isCase) {
            const browseByCaseBtn = document.getElementById('browse-by-case');
            if (browseByCaseBtn) browseByCaseBtn.click();
          } else if (isTheme) {
            const browseByThemeBtn = document.getElementById('browse-by-theme');
            if (browseByThemeBtn) browseByThemeBtn.click();
          }

          // Wait for browse mode content to render, then highlight
          setTimeout(() => {
            this.highlightAndOpenNote(id, type, note);
          }, 200);
        }, 300);
      } else {
        // For other tabs, highlight immediately after tab switch
        setTimeout(() => {
          this.highlightAndOpenNote(id, type, note);
        }, 300);
      }
    }
  }

  highlightAndOpenNote(id, type, note) {
    const element = document.querySelector(`[data-item-id="${CSS.escape(id)}"]`);
    if (!element) {
      console.warn('Could not find target element for note:', id);
      return;
    }

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

    // Add highlight using the same class as search hits
    titleElement.classList.add('search-highlight');
    // Use 'start' for mobile, 'center' for desktop (mobile has viewport issues with centering)
    const isMobile = window.innerWidth <= 768;
    container.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      titleElement.classList.remove('search-highlight');
    }, 3000);

    // Open the note modal
    if (window.notesManager && typeof window.notesManager.open === 'function') {
      setTimeout(() => {
        window.notesManager.open(id, {
          type,
          label: note.label || '',
          source: note.source || ''
        });
      }, 500);
    }
  }
  
  // --- Helper Functions ---

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  highlight(text, query) {
      if (!query) return text;
      try {
          const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
          return text.replace(regex, '<mark class="bg-yellow-200 text-gray-900 px-0.5 rounded">$1</mark>');
      } catch (e) {
          // Fallback for invalid regex
          return text;
      }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.stateManager) return;
  window.notesManager = new NotesManager(window.stateManager);
  window.notesDrawer = new NotesDrawer(window.stateManager);
});