/**
 * Link Enhancer (clean rebuild)
 * - Wraps outbound links with read/star controls
 * - Keeps UI in sync with stateManager
 * - Provides consistent tooltips (title) like other tabs
 */
(function () {
  class LinkEnhancer {
    constructor() {
      this.stateManager = window.stateManager || null;
      if (this.stateManager && typeof this.stateManager.addListener === 'function') {
        this.stateManager.addListener((type, url, status) => {
          this.updateAllLinksForUrl(url, type, status);
        });
      }
    }

    enhanceLink(linkElement, context = {}) {
      if (!linkElement || !linkElement.href) return linkElement;
      const url = linkElement.href;

      // Skip if already wrapped
      if (linkElement.parentElement && linkElement.parentElement.classList.contains('link-wrapper')) {
        return linkElement.parentElement;
      }

      // Wrapper
      const wrapper = document.createElement('span');
      wrapper.className = 'link-wrapper inline-flex items-center gap-2';
      wrapper.setAttribute('data-link-url', url);

      // Insert wrapper
      const parent = linkElement.parentNode;
      parent.insertBefore(wrapper, linkElement);
      wrapper.appendChild(linkElement);

      // Mark as viewed on click (first time)
      linkElement.addEventListener('click', () => {
        if (this.stateManager && !this.stateManager.isViewed?.(url)) {
          this.stateManager.markAsViewed(url, context);
        }
      });

      // Controls (only read toggle now - stars are on items, not sources)
      const readToggle = this.createReadToggle(url, context);
      wrapper.appendChild(readToggle);

      // Persist context
      try { wrapper.setAttribute('data-context', JSON.stringify(context || {})); } catch (_) {}

      return wrapper;
    }

    createReadToggle(url, context) {
      const isViewed = !!this.stateManager?.isViewed?.(url);
      const btn = document.createElement('button');
      btn.className = 'read-toggle-btn text-xs px-2 py-1 rounded transition-colors';
      btn.type = 'button';
      btn.setAttribute('data-url', url);
      btn.setAttribute('aria-pressed', String(isViewed));

      // Only show when viewed
      if (!isViewed) btn.style.display = 'none';

      this.updateReadToggleUI(btn, isViewed);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.stateManager && typeof this.stateManager.toggleViewed === 'function') {
          // Just toggle the state. The listener will handle the UI update.
          this.stateManager.toggleViewed(url, context);
        }
      });

      return btn;
    }

    updateReadToggleUI(button, isViewed) {
      if (!button) return;
      const checkIcon = (window.ICONS && window.ICONS.check) || '✓';
      if (isViewed) {
        button.style.display = '';
        button.innerHTML = `<span class="inline-block mr-1 align-middle">${checkIcon}</span><span>Read</span>`;
        button.className = 'read-toggle-btn text-xs px-2 py-1 rounded transition-colors bg-green-100 text-green-700 hover:bg-green-200';
        button.setAttribute('aria-label', 'Mark as unread');
        button.setAttribute('title', 'Mark as unread');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.style.display = 'none';
        button.innerHTML = 'Mark as read';
        button.className = 'read-toggle-btn text-xs px-2 py-1 rounded transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200';
        button.setAttribute('aria-label', 'Mark as read');
        button.setAttribute('title', 'Mark as read');
        button.setAttribute('aria-pressed', 'false');
      }
    }

    updateAllLinksForUrl(url, type, status) {
      const wrappers = document.querySelectorAll(`[data-link-url="${CSS.escape(url)}"]`);
      wrappers.forEach((wrapper) => {
        if (type === 'viewed') {
          const readToggle = wrapper.querySelector('.read-toggle-btn');
          if (readToggle) this.updateReadToggleUI(readToggle, !!status);
        }
      });
    }
  }

  // Expose singleton
  window.linkEnhancer = new LinkEnhancer();
})();