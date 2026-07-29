    // Load branches
    async function loadBranches() {
      try {
        state.branches = await api('/branches');
        renderBranches();
      } catch (error) {
        elements.branchList.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">Error loading branches</h3>
          </div>
        `;
      }
    }

    function renderBranches() {
      if (!state.branches || state.branches.local.length === 0) {
        elements.branchList.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">No branches</h3>
          </div>
        `;
        return;
      }

      const escapedBranch = escapeHtml(state.branches.current);
      elements.branchList.innerHTML = state.branches.local.map(branch => {
        const isCurrent = branch === state.branches.current;
        const escapedBranchName = escapeHtml(branch);
        return `
          <li class="branch-item ${isCurrent ? 'current' : ''}" data-branch="${escapedBranchName}">
            <span class="branch-item-name">
              ${isCurrent ? '● ' : ''}${escapedBranchName}
            </span>
            <div class="branch-item-actions">
              ${!isCurrent ? `
                <button class="btn btn-secondary btn-sm" data-action="checkout" data-branch-target="${escapedBranchName}">
                  Switch
                </button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-branch-target="${escapedBranchName}">
                  Delete
                </button>
              ` : '<span style="color: var(--accent); font-size: 12px; font-weight: 500;">Current</span>'}
            </div>
          </li>
        `;
      }).join('');

      // Attach event listeners after rendering
      elements.branchList.querySelectorAll('[data-action="checkout"]').forEach(btn => {
        btn.addEventListener('click', () => checkoutBranch(btn.dataset.branchTarget));
      });
      elements.branchList.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteBranch(btn.dataset.branchTarget));
      });
    }

    async function checkoutBranch(branch) {
      try {
        await api('/branches/checkout', { method: 'POST', body: { branch } });
        showToast(`Switched to ${branch}`, 'success');
        await loadBranches();
        await loadStatus();
      } catch (error) {
        // Error shown by api()
      }
    }

    async function deleteBranch(branch) {
      const confirmed = await confirm('Delete Branch', `Are you sure you want to delete branch "${branch}"?`);
      if (!confirmed) return;

      try {
        await api(`/branches/${encodeURIComponent(branch)}`, { method: 'DELETE' });
        showToast(`Deleted branch ${branch}`, 'success');
        await loadBranches();
      } catch (error) {
        // Error shown
      }
    }

    async function createBranch(name, checkout) {
      try {
        await api('/branches', { method: 'POST', body: { name, checkout } });
        showToast(`Created branch ${name}`, 'success');
        closeBranchModal();
        await loadBranches();
        if (checkout) await loadStatus();
      } catch (error) {
        // Error shown
      }
    }

    function showNewBranchForm() {
      elements.branchModalTitle.textContent = 'Create New Branch';
      elements.branchModalContent.innerHTML = `
        <div class="input-group">
          <label class="input-label">Branch Name</label>
          <input type="text" class="input" id="newBranchName" placeholder="feature/my-branch">
        </div>
        <div class="input-group">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: var(--text-secondary);">
            <input type="checkbox" id="checkoutNewBranch" checked style="accent-color: var(--accent);">
            Switch to new branch after creation
          </label>
        </div>
        <button class="btn btn-primary" style="width: 100%;" onclick="handleCreateBranch()">
          Create Branch
        </button>
      `;
      elements.branchModal.classList.add('open');

      // Focus input
      setTimeout(() => document.getElementById('newBranchName')?.focus(), 100);
    }

    function handleCreateBranch() {
      const name = document.getElementById('newBranchName')?.value.trim();
      const checkout = document.getElementById('checkoutNewBranch')?.checked;

      if (!name) {
        showToast('Please enter a branch name', 'error');
        return;
      }

      createBranch(name, checkout);
    }

    function showBranchSwitcher() {
      elements.branchModalTitle.textContent = 'Switch Branch';

      if (!state.branches) {
        elements.branchModalContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        loadBranches().then(() => {
          renderBranchSwitcher();
        });
      } else {
        renderBranchSwitcher();
      }

      elements.branchModal.classList.add('open');
    }

    function renderBranchSwitcher() {
      elements.branchModalContent.innerHTML = `
        <ul class="branch-list">
          ${state.branches.local.map(branch => {
            const isCurrent = branch === state.branches.current;
            const escapedBranch = escapeHtml(branch);
            return `
              <li class="branch-item ${isCurrent ? 'current' : ''}" ${!isCurrent ? `data-switch-branch="${escapedBranch}"` : ''} style="${!isCurrent ? 'cursor: pointer;' : ''}">
                <span class="branch-item-name">
                  ${isCurrent ? '● ' : ''}${escapedBranch}
                </span>
              </li>
            `;
          }).join('')}
        </ul>
      `;

      // Attach event listeners for branch switching
      elements.branchModalContent.querySelectorAll('[data-switch-branch]').forEach(item => {
        item.addEventListener('click', () => {
          checkoutBranch(item.dataset.switchBranch);
          closeBranchModal();
        });
      });
    }

    function closeBranchModal() {
      elements.branchModal.classList.remove('open');
    }
