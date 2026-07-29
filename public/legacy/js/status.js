    // View switching
    function switchView(viewName) {
      state.currentView = viewName;

      // Update nav links
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
      });

      // Update views
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
      });
      document.getElementById(`${viewName}View`).classList.add('active');

      // Close mobile menu
      elements.mainNav.classList.remove('open');

      // Load view data
      loadViewData(viewName);
    }

    async function loadViewData(viewName) {
      switch (viewName) {
        case 'status':
          await loadStatus();
          break;
        case 'history':
          await loadCommits();
          break;
        case 'branches':
          await loadBranches();
          break;
        case 'remotes':
          await loadRemotes();
          break;
      }
    }

    // Load status
    async function loadStatus() {
      try {
        state.status = await api('/status');
        renderStatus();
        updateHeader();
      } catch (error) {
        elements.statusContent.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3 class="empty-state-title">Error loading status</h3>
            <p>${error.message}</p>
          </div>
        `;
      }
    }

    function updateHeader() {
      if (!state.status) return;

      elements.currentBranch.textContent = state.status.current || 'No branch';

      let syncHtml = '';
      if (state.status.ahead > 0) {
        syncHtml += `<span class="ahead">↑${state.status.ahead}</span>`;
      }
      if (state.status.behind > 0) {
        syncHtml += `<span class="behind">↓${state.status.behind}</span>`;
      }
      elements.syncInfo.innerHTML = syncHtml;

      // Update changes badge
      const totalChanges = (state.status.files.modified?.length || 0) +
        (state.status.files.added?.length || 0) +
        (state.status.files.deleted?.length || 0) +
        (state.status.files.untracked?.length || 0);

      if (totalChanges > 0) {
        elements.changesBadge.textContent = totalChanges;
        elements.changesBadge.style.display = 'flex';
      } else {
        elements.changesBadge.style.display = 'none';
      }
    }

    function renderStatus() {
      const { files, isClean } = state.status;
      const allFiles = [
        ...(files.staged || []).map(f => ({ name: f, status: 'staged' })),
        ...(files.modified || []).map(f => ({ name: f, status: 'modified' })),
        ...(files.added || []).map(f => ({ name: f, status: 'added' })),
        ...(files.deleted || []).map(f => ({ name: f, status: 'deleted' })),
        ...(files.untracked || []).map(f => ({ name: f, status: 'untracked' }))
      ];

      // Remove duplicates (files can appear in both staged and other categories)
      const uniqueFiles = allFiles.filter((file, index, self) =>
        index === self.findIndex(f => f.name === file.name)
      );

      if (isClean && uniqueFiles.length === 0) {
        elements.statusContent.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h3 class="empty-state-title">Working tree clean</h3>
            <p>No changes to commit</p>
          </div>
        `;
        return;
      }

      const stagedFiles = files.staged || [];
      const unstagedFiles = uniqueFiles.filter(f => !stagedFiles.includes(f.name));

      let html = '';

      // Staged files section
      if (stagedFiles.length > 0) {
        html += `
          <div class="card">
            <div class="section-header" data-section="staged">
              <span class="section-title">Staged Changes (${stagedFiles.length})</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <div class="section-content" id="stagedSection">
              <div class="select-all-row">
                <input type="checkbox" class="file-checkbox" id="selectAllStaged">
                <span class="file-count">Select all</span>
                <button class="btn btn-secondary btn-sm" onclick="unstageSelected()">Unstage</button>
              </div>
              <ul class="file-list">
                ${stagedFiles.map(file => renderFileItem(file, getFileStatus(file, files), true)).join('')}
              </ul>
            </div>
          </div>
        `;
      }

      // Unstaged files section
      if (unstagedFiles.length > 0) {
        html += `
          <div class="card">
            <div class="section-header" data-section="unstaged">
              <span class="section-title">Changes (${unstagedFiles.length})</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <div class="section-content" id="unstagedSection">
              <div class="select-all-row">
                <input type="checkbox" class="file-checkbox" id="selectAllUnstaged">
                <span class="file-count">Select all</span>
                <button class="btn btn-primary btn-sm" onclick="stageSelected()">Stage</button>
                <button class="btn btn-danger btn-sm" onclick="discardSelected()">Discard</button>
              </div>
              <ul class="file-list">
                ${unstagedFiles.map(f => renderFileItem(f.name, f.status, false)).join('')}
              </ul>
            </div>
          </div>
        `;
      }

      // Commit form
      if (stagedFiles.length > 0) {
        html += `
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Commit</h2>
            </div>
            <div class="commit-form">
              <textarea class="commit-textarea" id="commitMessage" placeholder="Describe your changes..." rows="3"></textarea>
              <div class="char-count" id="charCount">0 characters</div>
              <div class="commit-actions">
                <button class="btn btn-primary" onclick="commitChanges()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Commit Changes
                </button>
              </div>
            </div>
          </div>
        `;
      }

      // Diff viewer
      html += `
        <div class="card" id="diffCard" style="display: none;">
          <div class="card-header">
            <h2 class="card-title" id="diffTitle">Diff</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeDiff()">Close</button>
          </div>
          <div class="diff-container">
            <div class="diff-content" id="diffContent"></div>
          </div>
        </div>
      `;

      elements.statusContent.innerHTML = html;

      // Setup event listeners
      setupStatusListeners();
    }

    function getFileStatus(file, files) {
      if (files.modified?.includes(file)) return 'modified';
      if (files.added?.includes(file)) return 'added';
      if (files.deleted?.includes(file)) return 'deleted';
      if (files.untracked?.includes(file)) return 'untracked';
      if (files.renamed?.includes(file)) return 'renamed';
      return 'modified';
    }

    function renderFileItem(name, status, staged) {
      const statusLabel = {
        modified: 'M',
        added: 'A',
        deleted: 'D',
        untracked: 'U',
        renamed: 'R',
        staged: 'S'
      };

      const escapedName = escapeHtml(name);
      return `
        <li class="file-item" data-file="${escapedName}" data-staged="${staged}">
          <input type="checkbox" class="file-checkbox" data-file="${escapedName}">
          <span class="file-status ${status}">${statusLabel[status] || '?'}</span>
          <span class="file-name">${escapedName}</span>
        </li>
      `;
    }

    function setupStatusListeners() {
      // File click to show diff
      document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          if (e.target.classList.contains('file-checkbox')) return;
          const file = item.dataset.file;
          const staged = item.dataset.staged === 'true';
          await showDiff(file, staged);
        });
      });

      // Select all checkboxes
      const selectAllStaged = document.getElementById('selectAllStaged');
      const selectAllUnstaged = document.getElementById('selectAllUnstaged');

      if (selectAllStaged) {
        selectAllStaged.addEventListener('change', (e) => {
          document.querySelectorAll('#stagedSection .file-checkbox[data-file]').forEach(cb => {
            cb.checked = e.target.checked;
          });
        });
      }

      if (selectAllUnstaged) {
        selectAllUnstaged.addEventListener('change', (e) => {
          document.querySelectorAll('#unstagedSection .file-checkbox[data-file]').forEach(cb => {
            cb.checked = e.target.checked;
          });
        });
      }

      // Commit message character count
      const commitMessage = document.getElementById('commitMessage');
      const charCount = document.getElementById('charCount');
      if (commitMessage && charCount) {
        commitMessage.addEventListener('input', () => {
          charCount.textContent = `${commitMessage.value.length} characters`;
        });

        // Ctrl+Enter to commit
        commitMessage.addEventListener('keydown', (e) => {
          if (e.ctrlKey && e.key === 'Enter') {
            commitChanges();
          }
        });
      }

      // Section collapse
      document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
          const section = header.dataset.section;
          const content = document.getElementById(`${section}Section`);
          if (content) {
            content.classList.toggle('collapsed');
            header.querySelector('svg').style.transform =
              content.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
          }
        });
      });
    }

    async function showDiff(file, staged) {
      const diffCard = document.getElementById('diffCard');
      const diffTitle = document.getElementById('diffTitle');
      const diffContent = document.getElementById('diffContent');

      diffCard.style.display = 'block';
      diffTitle.textContent = file;
      diffContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

      try {
        const { diff } = await api(`/diff?file=${encodeURIComponent(file)}&staged=${staged}`);
        diffContent.innerHTML = renderDiff(diff);
      } catch (error) {
        diffContent.innerHTML = `<p style="padding: 16px; color: var(--text-tertiary);">Error loading diff</p>`;
      }
    }

    function renderDiff(diff) {
      if (!diff) return '<p style="padding: 16px; color: var(--text-tertiary);">No diff available</p>';

      const lines = diff.split('\n');
      let html = '';
      let lineNum = 0;

      lines.forEach(line => {
        let className = '';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          className = 'add';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          className = 'del';
        } else if (line.startsWith('@@')) {
          className = 'hunk';
        }

        lineNum++;
        html += `
          <div class="diff-line ${className}">
            <span class="diff-line-num">${lineNum}</span>
            <span class="diff-line-content">${escapeHtml(line)}</span>
          </div>
        `;
      });

      return html;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function closeDiff() {
      document.getElementById('diffCard').style.display = 'none';
    }

    function getSelectedFiles(section) {
      return Array.from(document.querySelectorAll(`#${section}Section .file-checkbox[data-file]:checked`))
        .map(cb => cb.dataset.file);
    }

    async function stageSelected() {
      const files = getSelectedFiles('unstaged');
      if (files.length === 0) {
        showToast('No files selected', 'error');
        return;
      }

      try {
        await api('/stage', { method: 'POST', body: { files } });
        showToast(`Staged ${files.length} file(s)`, 'success');
        await loadStatus();
      } catch (error) {
        // Error already shown by api()
      }
    }

    async function unstageSelected() {
      const files = getSelectedFiles('staged');
      if (files.length === 0) {
        showToast('No files selected', 'error');
        return;
      }

      try {
        await api('/unstage', { method: 'POST', body: { files } });
        showToast(`Unstaged ${files.length} file(s)`, 'success');
        await loadStatus();
      } catch (error) {
        // Error already shown
      }
    }

    async function discardSelected() {
      const files = getSelectedFiles('unstaged');
      if (files.length === 0) {
        showToast('No files selected', 'error');
        return;
      }

      const confirmed = await confirm(
        'Discard Changes',
        `Are you sure you want to discard changes to ${files.length} file(s)? This cannot be undone.`
      );

      if (!confirmed) return;

      try {
        await api('/discard', { method: 'POST', body: { files } });
        showToast(`Discarded changes to ${files.length} file(s)`, 'success');
        await loadStatus();
      } catch (error) {
        // Error already shown
      }
    }

    async function commitChanges() {
      const messageEl = document.getElementById('commitMessage');
      const message = messageEl?.value.trim();

      if (!message) {
        showToast('Please enter a commit message', 'error');
        messageEl?.focus();
        return;
      }

      try {
        const result = await api('/commit', { method: 'POST', body: { message } });
        showToast(`Committed: ${result.commit}`, 'success');
        await loadStatus();
      } catch (error) {
        // Error already shown
      }
    }
