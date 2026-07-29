    // Load commits
    async function loadCommits() {
      try {
        state.commits = await api('/commits?limit=50');
        renderCommits();
      } catch (error) {
        elements.commitList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3 class="empty-state-title">Error loading commits</h3>
          </div>
        `;
      }
    }

    function renderCommits() {
      if (!state.commits || state.commits.length === 0) {
        elements.commitList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <h3 class="empty-state-title">No commits yet</h3>
            <p>Create your first commit to see history</p>
          </div>
        `;
        return;
      }

      elements.commitList.innerHTML = state.commits.map(commit => `
        <li class="commit-item" data-hash="${commit.hash}">
          <div class="commit-header">
            <div class="commit-avatar">${commit.author.charAt(0).toUpperCase()}</div>
            <div class="commit-meta">
              <div class="commit-author">${escapeHtml(commit.author)}</div>
              <div class="commit-date">${formatDate(commit.date)}</div>
            </div>
            <span class="commit-hash">${commit.shortHash}</span>
          </div>
          <div class="commit-message">${escapeHtml(commit.message)}</div>
        </li>
      `).join('');

      // Add click handlers
      elements.commitList.querySelectorAll('.commit-item').forEach(item => {
        item.addEventListener('click', () => showCommitDetails(item.dataset.hash));
      });
    }

    function formatDate(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }

    async function showCommitDetails(hash) {
      switchView('commitDetail');

      try {
        const commit = await api(`/commits/${hash}`);
        elements.commitDetailContent.innerHTML = `
          <div style="margin-bottom: 24px;">
            <div class="commit-header" style="margin-bottom: 16px;">
              <div class="commit-avatar">${commit.author.charAt(0).toUpperCase()}</div>
              <div class="commit-meta">
                <div class="commit-author">${escapeHtml(commit.author)}</div>
                <div class="commit-date">${formatDate(commit.date)}</div>
              </div>
              <span class="commit-hash">${commit.shortHash}</span>
            </div>
            <p style="line-height: 1.6; color: var(--text-secondary);">${escapeHtml(commit.message)}</p>
          </div>
          <div class="diff-container">
            <div class="diff-header">
              <span class="diff-file-name">Changes</span>
            </div>
            <div class="diff-content" style="max-height: 500px; overflow: auto;">
              ${renderDiff(commit.diff)}
            </div>
          </div>
        `;
      } catch (error) {
        elements.commitDetailContent.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">Error loading commit</h3>
          </div>
        `;
      }
    }
