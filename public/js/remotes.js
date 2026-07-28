    // Load remotes
    async function loadRemotes() {
      try {
        state.remotes = await api('/remotes');
        renderRemotes();
      } catch (error) {
        elements.remotesContent.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">Error loading remotes</h3>
          </div>
        `;
      }
    }

    function renderRemotes() {
      if (!state.remotes || state.remotes.length === 0) {
        elements.remotesContent.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <h3 class="empty-state-title">No remotes configured</h3>
            <p>Add a remote to sync with a remote repository</p>
          </div>
        `;
        return;
      }

      elements.remotesContent.innerHTML = `
        <div class="remote-info">
          ${state.remotes.map(remote => `
            <div class="remote-item">
              <span class="remote-name">${escapeHtml(remote.name)}</span>
              <span class="remote-url">${escapeHtml(remote.fetchUrl)}</span>
            </div>
          `).join('')}
        </div>
        <div class="remote-actions">
          <button class="btn btn-secondary" onclick="fetchRemote()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
            </svg>
            Fetch
          </button>
          <button class="btn btn-secondary" onclick="pullRemote()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            Pull
          </button>
          <button class="btn btn-primary" onclick="pushRemote()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            Push
          </button>
        </div>
      `;
    }

    async function fetchRemote() {
      try {
        showToast('Fetching...', 'info');
        await api('/fetch', { method: 'POST' });
        showToast('Fetch completed', 'success');
        await loadStatus();
      } catch (error) {
        // Error shown
      }
    }

    async function pullRemote() {
      try {
        showToast('Pulling...', 'info');
        await api('/pull', { method: 'POST', body: {} });
        showToast('Pull completed', 'success');
        await loadStatus();
        await loadCommits();
      } catch (error) {
        // Error shown
      }
    }

    async function pushRemote() {
      try {
        showToast('Pushing...', 'info');
        await api('/push', { method: 'POST', body: { setUpstream: true } });
        showToast('Push completed', 'success');
        await loadStatus();
      } catch (error) {
        // Error shown
      }
    }
