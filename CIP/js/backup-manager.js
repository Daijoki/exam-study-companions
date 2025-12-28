/**
 * Backup Manager UI
 * Provides interface for backing up and restoring read status, stars, and notes
 */

class BackupManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.drawer = null;
    this.backdrop = null;
    this.button = null;
    this.content = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    if (!this.stateManager) return;
    this.createButton();
    this.createDrawer();
    this.bindEvents();
  }

  createButton() {
    // Match saved drawer button styling - positioned at top-64 for uniform 20px spacing
    const button = document.createElement('button');
    button.id = 'backup-btn';
    button.className =
      'fixed right-4 top-64 z-40 fab-brand text-white p-3 rounded-full';
    button.setAttribute('aria-label', 'Backup & restore data');
    button.setAttribute('title', 'Backup & Restore');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = `
      <span class="text-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </span>
    `;
    document.body.appendChild(button);
    this.button = button;
  }

  createDrawer() {
    // Backdrop (matches saved drawer)
    const backdrop = document.createElement('div');
    backdrop.id = 'backup-drawer-overlay';
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity';
    backdrop.setAttribute('aria-hidden', 'true');

    // Drawer (matches saved drawer styling)
    const drawer = document.createElement('aside');
    drawer.id = 'backup-drawer';
    drawer.className =
      'fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform translate-x-full transition-transform duration-300';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'backup-drawer-title');
    
    drawer.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="drawer-header">
          <div class="flex items-center justify-between p-4 border-b border-white/20">
            <h2 id="backup-drawer-title" class="text-xl font-bold flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Backup & Restore
            </h2>
            <button id="backup-drawer-close"
              class="text-white hover:bg-white/20 p-2 rounded flex items-center justify-center"
              aria-label="Close backup drawer">
              ${(window.ICONS && window.ICONS.cross) || '×'}
            </button>
          </div>
          <div class="px-4 pb-3 text-xs text-white/80">
            <p>Export, import, or clear all your data</p>
          </div>
        </div>

        <div id="backup-drawer-content" class="flex-1 overflow-y-auto p-4">
          <!-- Current Data Stats -->
          <div class="mb-5 p-4 bg-gray-50 rounded-xl">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Current Data</h3>
            <div class="grid grid-cols-4 gap-3 text-center">
              <div class="bg-white p-2 rounded-lg">
                <div class="text-2xl font-bold text-green-600" id="backup-stat-viewed">0</div>
                <div class="text-[10px] text-gray-500">Read</div>
              </div>
              <div class="bg-white p-2 rounded-lg">
                <div class="text-2xl font-bold text-blue-600" id="backup-stat-saved">0</div>
                <div class="text-[10px] text-gray-500">Starred</div>
              </div>
              <div class="bg-white p-2 rounded-lg">
                <div class="text-2xl font-bold text-orange-600" id="backup-stat-notes">0</div>
                <div class="text-[10px] text-gray-500">Notes</div>
              </div>
              <div class="bg-white p-2 rounded-lg">
                <div class="text-2xl font-bold text-purple-600" id="backup-stat-quiz">0</div>
                <div class="text-[10px] text-gray-500">Knowledge Checks</div>
              </div>
            </div>
          </div>

          <!-- Export Section -->
          <div class="mb-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Export / Backup</h3>
            <button 
              class="w-full px-4 py-3 btn-brand rounded-xl hover:shadow-lg transition-all"
              data-backup-export>
              📥 Download Backup File
            </button>
            <p class="text-xs text-gray-500 mt-2">
              Downloads a JSON file with all your read status, stars, notes, and knowledge check progress. Save this file somewhere safe!
            </p>
          </div>

          <!-- Import Section -->
          <div class="mb-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Import / Restore</h3>
            <div class="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-brand transition-colors" id="backup-drop-zone">
              <input 
                type="file" 
                id="backup-file-input" 
                accept=".json" 
                class="hidden">
              <label 
                for="backup-file-input" 
                class="cursor-pointer flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span class="text-sm font-medium text-gray-700">Click to select backup file</span>
                <span class="text-xs text-gray-500">or drag and drop here</span>
              </label>
            </div>
            
            <div class="mt-3 space-y-2">
              <label class="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" id="backup-merge-checkbox" class="rounded">
                <span>Merge with existing data</span>
              </label>
              <p class="text-xs text-gray-500 ml-6">
                If unchecked, current data will be <strong>replaced</strong> with backup.
              </p>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="mt-6 pt-4 border-t border-gray-200">
            <h3 class="text-sm font-semibold text-red-600 mb-2">⚠️ Danger Zone</h3>
            <button 
              class="w-full px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all border border-red-200"
              data-backup-clear>
              Clear All Data
            </button>
            <p class="text-xs text-gray-500 mt-2">
              Permanently deletes all your read status, stars, notes, and knowledge check progress. Cannot be undone!
            </p>
          </div>

          <!-- Status Message -->
          <div id="backup-status" class="mt-4 p-3 rounded-lg text-sm hidden"></div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    this.drawer = drawer;
    this.backdrop = backdrop;
    this.content = drawer.querySelector('#backup-drawer-content');
  }

  bindEvents() {
    // Open/close drawer
    this.button.addEventListener('click', () => this.toggleDrawer());
    this.backdrop.addEventListener('click', () => this.close());
    const closeBtn = document.getElementById('backup-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Export button
    const exportBtn = this.drawer.querySelector('[data-backup-export]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    // Import file input
    const fileInput = this.drawer.querySelector('#backup-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importData(e.target.files[0]);
        }
      });

      // Drag and drop
      const dropZone = this.drawer.querySelector('#backup-drop-zone');
      if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.classList.add('border-brand', 'bg-blue-50');
        });
        dropZone.addEventListener('dragleave', () => {
          dropZone.classList.remove('border-brand', 'bg-blue-50');
        });
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('border-brand', 'bg-blue-50');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.importData(e.dataTransfer.files[0]);
          }
        });
      }
    }

    // Clear all button
    const clearBtn = this.drawer.querySelector('[data-backup-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAll());
    }
  }

  toggleDrawer() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.updateStats();
    this.drawer.classList.remove('translate-x-full');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.backdrop.classList.remove('hidden');
    this.backdrop.setAttribute('aria-hidden', 'false');
    this.button.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.isOpen = false;
    this.drawer.classList.add('translate-x-full');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.backdrop.classList.add('hidden');
    this.backdrop.setAttribute('aria-hidden', 'true');
    this.button.setAttribute('aria-expanded', 'false');
    this.hideStatus();
  }

  updateStats() {
    const data = this.stateManager.exportData();
    const viewedEl = this.drawer.querySelector('#backup-stat-viewed');
    const savedEl = this.drawer.querySelector('#backup-stat-saved');
    const notesEl = this.drawer.querySelector('#backup-stat-notes');
    const quizEl = this.drawer.querySelector('#backup-stat-quiz');

    if (viewedEl) viewedEl.textContent = data.stats.viewedCount;
    if (savedEl) savedEl.textContent = data.stats.savedCount;
    if (notesEl) notesEl.textContent = data.stats.notesCount;
    if (quizEl && data.stats && typeof data.stats.quizCount !== 'undefined') {
      quizEl.textContent = data.stats.quizCount;
    } else if (quizEl) {
      quizEl.textContent = 0;
    }
  }

  showStatus(message, type = 'info') {
    const statusEl = this.drawer.querySelector('#backup-status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700');
    
    if (type === 'success') {
      statusEl.classList.add('bg-green-100', 'text-green-700');
    } else if (type === 'error') {
      statusEl.classList.add('bg-red-100', 'text-red-700');
    } else {
      statusEl.classList.add('bg-blue-100', 'text-blue-700');
    }
  }

  hideStatus() {
    const statusEl = this.drawer.querySelector('#backup-status');
    if (statusEl) {
      statusEl.classList.add('hidden');
    }
  }

  exportData() {
    try {
      this.stateManager.downloadBackup();
      this.showStatus('✓ Backup file downloaded successfully!', 'success');
      setTimeout(() => this.hideStatus(), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      this.showStatus('✗ Export failed: ' + error.message, 'error');
    }
  }

  async importData(file) {
    const mergeCheckbox = this.drawer.querySelector('#backup-merge-checkbox');
    const merge = mergeCheckbox ? mergeCheckbox.checked : false;
    
    try {
      this.showStatus('Importing data...', 'info');
      const result = await this.stateManager.restoreFromFile(file, merge);
      
      if (result.success) {
        this.updateStats();
        const action = merge ? 'merged' : 'restored';
        this.showStatus(
          `✓ Successfully ${action}: ${result.imported.viewed} read, ${result.imported.saved} starred, ${result.imported.notes} notes`,
          'success'
        );
        
        // Reload page after 2 seconds to refresh all UI
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        this.showStatus('✗ Import failed: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Import failed:', error);
      this.showStatus('✗ Import failed: ' + error.message, 'error');
    }
    
    // Reset file input
    const fileInput = this.drawer.querySelector('#backup-file-input');
    if (fileInput) fileInput.value = '';
  }

  clearAll() {
    const cleared = this.stateManager.clearAllData();
    if (cleared) {
      this.updateStats();
      this.showStatus('✓ All data cleared successfully', 'success');
      
      // Reload page after 1 second to refresh all UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.stateManager) {
    window.backupManager = new BackupManager(window.stateManager);
  }
});
