    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      if (newTheme === 'light') {
        html.setAttribute('data-theme', 'light');
        document.getElementById('themeColor').setAttribute('content', '#f8f9fa');
      } else {
        html.removeAttribute('data-theme');
        document.getElementById('themeColor').setAttribute('content', '#0a0a0b');
      }

      localStorage.setItem('theme', newTheme);
    }

    // Event Listeners
    elements.themeToggle.addEventListener('click', toggleTheme);

    elements.menuToggle.addEventListener('click', () => {
      elements.mainNav.classList.toggle('open');
    });

    elements.branchSelector.addEventListener('click', showBranchSwitcher);
    elements.closeBranchModal.addEventListener('click', closeBranchModal);
    elements.newBranchBtn.addEventListener('click', showNewBranchForm);
    elements.backToHistory.addEventListener('click', () => switchView('history'));

    // Close modal on overlay click
    elements.branchModal.addEventListener('click', (e) => {
      if (e.target === elements.branchModal) closeBranchModal();
    });

    elements.confirmModal.addEventListener('click', (e) => {
      if (e.target === elements.confirmModal) {
        elements.confirmModal.classList.remove('open');
      }
    });

    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.dataset.view) {
          switchView(link.dataset.view);
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        closeBranchModal();
        elements.confirmModal.classList.remove('open');
      }

      // R to refresh
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        loadViewData(state.currentView);
      }
    });

    // Fetch CSRF token
    async function fetchCsrfToken() {
      try {
        const data = await fetch('/api/csrf-token').then(r => r.json());
        state.csrfToken = data.token;
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    }

    // Initialize
    (async function init() {
      await fetchCsrfToken();
      loadStatus();
    })();
