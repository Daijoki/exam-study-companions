
/* === Focus Modality (clean, merged into existing JS) === */
(function(){
  const root = document.documentElement;
  // Start in mouse mode (no rings) until keyboard navigation
  root.classList.remove('modality-keyboard');
  const nav = new Set(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End']);
  window.addEventListener('keydown', (e)=>{ if(nav.has(e.key)) root.classList.add('modality-keyboard'); }, {capture:true});
  const demote = ()=> root.classList.remove('modality-keyboard');
  window.addEventListener('pointerdown', demote, {capture:true});
  window.addEventListener('mousedown', demote, {capture:true});
  // Silent programmatic focus helper
  window.silentFocus = function(el){
    if(!el) return;
    el.setAttribute('data-silent-focus','true');
    try { el.focus({preventScroll:true}); } catch(_){ try{ el.focus(); }catch(__){} }
    requestAnimationFrame(()=> el.removeAttribute('data-silent-focus'));
  };
})();
/* === /Focus Modality === */

/**
 * Main Application Controller
 * Handles initialization and tab navigation
 */

class App {
    constructor() {
        this.mainNav = document.getElementById('main-nav');
        this.contentSections = document.querySelectorAll('.content-section');
        
        // Initialize managers
        this.glossaryManager = null;
        this.documentsManager = null;
        this.historicalManager = null;
        this.quizManager = null;
    }
    
    async init() {
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Initialize all managers
        this.glossaryManager = new GlossaryManager();
        this.documentsManager = new DocumentsManager();
        this.historicalManager = new HistoricalManager();
        this.quizManager = new QuizManager();
        
        // Expose managers globally for retry buttons in error states
        window.historicalManager = this.historicalManager;
        
        // Load all data and initialize managers
        await Promise.all([
            this.glossaryManager.init(),
            this.documentsManager.init(),
            this.historicalManager.init(),
            this.quizManager.init()
        ]);
        
        // Set initial tab
        this.switchTab('#overview', false);
    }
    
    setupTabNavigation() {
        // Click events
        this.mainNav.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab')) {
                this.switchTab(e.target.dataset.tabTarget, true);
            }
        });
        
        // Keyboard events for tabs
        this.mainNav.addEventListener('keydown', (e) => {
            if (e.target.matches('.nav-tab')) {
                const tabs = Array.from(this.mainNav.querySelectorAll('.nav-tab'));
                const currentIndex = tabs.indexOf(e.target);
                let handled = false;
                
                switch(e.key) {
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % tabs.length;
                        tabs[nextIndex].focus();
                        handled = true;
                        break;
                        
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                        tabs[prevIndex].focus();
                        handled = true;
                        break;
                        
                    case 'Home':
                        e.preventDefault();
                        tabs[0].focus();
                        handled = true;
                        break;
                        
                    case 'End':
                        e.preventDefault();
                        tabs[tabs.length - 1].focus();
                        handled = true;
                        break;
                        
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.switchTab(e.target.dataset.tabTarget, true);
                        handled = true;
                        break;
                }
            }
        });
    }
    
    switchTab(targetId, shouldScroll = false) {
        const targetSection = document.querySelector(targetId);
        const activeTab = this.mainNav.querySelector(`[data-tab-target="${targetId}"]`);

        // Hide all sections
        this.contentSections.forEach(section => section.classList.add('hidden'));
        
        // Remove active class and update aria-selected for all tabs
        this.mainNav.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });

        // Show target section and activate tab
        if (targetSection) {
            targetSection.classList.remove('hidden');
            try{
              targetSection.classList.add('anim-fade-in');
              targetSection.addEventListener('animationend', function onEnd(){
                targetSection.classList.remove('anim-fade-in');
                targetSection.removeEventListener('animationend', onEnd);
              });
            }catch(e){}

            if (shouldScroll) {
            // Scroll so the top of the new section is visible beneath the sticky nav
            try {
              const nav = this.mainNav || document.getElementById('main-nav');
              const navHeight = nav ? nav.getBoundingClientRect().height : 0;
              const padding = 16; // breathing room under the tabs
              const rect = targetSection.getBoundingClientRect();
              const absoluteTop = window.scrollY + rect.top;
              const scrollTop = Math.max(absoluteTop - navHeight - padding, 0);
              window.scrollTo({ top: scrollTop, behavior: 'smooth' });
            } catch (e) {
              // fail silently if scrolling isn't available
            }
            }

            // Announce to screen readers

            const tabName = activeTab ? activeTab.textContent.trim() : 'section';
            this.announceToScreenReader(`${tabName} selected`);
        }
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }
    }
    
    announceToScreenReader(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
}


// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
