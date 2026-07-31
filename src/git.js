import simpleGit from 'simple-git';
import { normalize, isAbsolute, relative } from 'path';

export function createGitAPI(repoPath) {
  const git = simpleGit(repoPath);

  // Validate file paths to prevent path traversal attacks
  function validateFilePaths(files) {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    for (const file of fileArray) {
      if (typeof file !== 'string') {
        throw new Error('File path must be a string');
      }

      // Normalize the path to resolve any . or .. segments
      const normalizedPath = normalize(file);

      // Check for absolute paths
      if (isAbsolute(normalizedPath)) {
        throw new Error('Absolute paths are not allowed');
      }

      // Check for path traversal attempts
      if (normalizedPath.startsWith('..') || normalizedPath.includes('/..') || normalizedPath.includes('\\..')) {
        throw new Error('Path traversal attempts are not allowed');
      }

      // Additional check: ensure the relative path doesn't escape the repo
      const resolvedPath = relative(repoPath, normalize(`${repoPath}/${normalizedPath}`));
      if (resolvedPath.startsWith('..')) {
        throw new Error('Path must be within the repository');
      }
    }
  }

  // Validate branch name
  function validateBranchName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Branch name must be a non-empty string');
    }

    // Git branch name restrictions
    const invalidPatterns = [
      /^\./, // Cannot start with dot
      /\.\./,  // Cannot contain two consecutive dots
      /[\x00-\x1f\x7f]/, // No control characters
      /[ ~^:?*\[\]\\]/, // No special characters
      /@\{/, // No @{
      /\/$/, // Cannot end with /
      /\.lock$/, // Cannot end with .lock
      /^@$/, // Cannot be just @
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(name)) {
        throw new Error('Invalid branch name format');
      }
    }

    if (name.length > 255) {
      throw new Error('Branch name too long (max 255 characters)');
    }
  }

  // Validate commit hash
  function validateCommitHash(hash) {
    if (typeof hash !== 'string') {
      throw new Error('Commit hash must be a string');
    }

    // Git hashes are SHA-1 (40 hex chars) or can be abbreviated (min 4 chars)
    if (!/^[a-f0-9]{4,40}$/i.test(hash)) {
      throw new Error('Invalid commit hash format');
    }
  }

  // Validate commit message
  function validateCommitMessage(message) {
    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Commit message must be a non-empty string');
    }

    if (message.length > 10000) {
      throw new Error('Commit message too long (max 10000 characters)');
    }
  }

  return {
    async getStatus() {
      const status = await git.status();
      const isRepo = await git.checkIsRepo();

      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      // Get ahead/behind info
      let ahead = 0;
      let behind = 0;

      if (status.tracking) {
        try {
          const log = await git.log([`${status.tracking}..HEAD`]);
          ahead = log.total;
        } catch (e) {
          // Remote branch might not exist
        }

        try {
          const log = await git.log([`HEAD..${status.tracking}`]);
          behind = log.total;
        } catch (e) {
          // Remote branch might not exist
        }
      }

      // --- Build new flat format ---
      const stagedSet = new Set(status.staged);

      // unstaged: modified/created/deleted NOT in staged, plus untracked as 'added'
      const unstaged = [
        ...status.modified
          .filter(p => !stagedSet.has(p))
          .map(p => ({ path: p, status: 'modified' })),
        ...status.created
          .filter(p => !stagedSet.has(p))
          .map(p => ({ path: p, status: 'added' })),
        ...status.deleted
          .filter(p => !stagedSet.has(p))
          .map(p => ({ path: p, status: 'deleted' })),
        ...status.not_added.map(p => ({ path: p, status: 'added' })),
      ];

      // staged: from status.staged, determine change type
      const staged = status.staged.map(p => {
        let changeType = 'modified';
        if (status.created.includes(p)) {
          changeType = 'added';
        } else if (status.deleted.includes(p)) {
          changeType = 'deleted';
        } else if (status.modified.includes(p)) {
          changeType = 'modified';
        }
        return { path: p, status: changeType };
      });

      // renamed: add entries where r.to is NOT already in status.staged (dedup)
      for (const r of status.renamed) {
        if (!stagedSet.has(r.to)) {
          staged.push({ path: r.to, status: 'renamed', originalPath: r.from });
        }
      }

      // conflicted
      const conflicted = status.conflicted.map(p => ({ path: p, status: 'conflicted' }));

      return {
        current: status.current,
        tracking: status.tracking || '',
        ahead,
        behind,
        isClean: status.isClean(),
        unstaged,
        staged,
        conflicted,
      };
    },

    async getBranches() {
      const summary = await git.branchLocal();
      const remoteBranches = await git.branch(['-r']);

      return {
        current: summary.current,
        local: summary.all,
        remote: remoteBranches.all
      };
    },

    async createBranch(name, checkout = false) {
      validateBranchName(name);
      if (checkout) {
        await git.checkoutLocalBranch(name);
      } else {
        await git.branch([name]);
      }
      return { success: true, branch: name };
    },

    async checkoutBranch(branch) {
      validateBranchName(branch);
      await git.checkout(branch);
      return { success: true, branch };
    },

    async deleteBranch(name) {
      validateBranchName(name);
      await git.deleteLocalBranch(name);
      return { success: true, branch: name };
    },

    async getCommitHistory({ limit = 50, skip = 0, order = 'date', firstParent = false, allBranches = true } = {}) {
      try {
        // Build args: order, scope, first-parent
        const args = ['log', '--no-show-signature', '--decorate=full'];

        // Order: date-order (default) or topo-order
        if (order === 'topo') {
          args.push('--topo-order');
        } else {
          args.push('--date-order');
        }

        // Scope: all branches (including stash) or just HEAD
        if (allBranches) {
          args.push('--all');
          // Exclude origin/HEAD to avoid clutter
          args.push('--exclude=origin/HEAD');
        }

        // First-parent mode
        if (firstParent) {
          args.push('--first-parent');
        }

        // Pagination
        args.push(`--max-count=${limit}`);
        if (skip > 0) {
          args.push(`--skip=${skip}`);
        }

        // Use \0 as delimiter to avoid conflicts with special chars in messages
        args.push('--format=%H%x00%P%x00%D%x00%aN±%aE%x00%at%x00%s');

        const raw = await git.raw(args);

        if (!raw || !raw.trim()) return [];

        return raw.trim().split('\n').filter(Boolean).map(line => {
          const parts = line.split('\x00');
          const hash = parts[0] || '';
          const parentHashes = parts[1] || '';
          const refs = parts[2] || '';
          const authorEmail = parts[3] || '?±?';
          const timestamp = parts[4] || '0';
          const message = parts[5] || '';

          // Parse author±email
          const [author, email] = authorEmail.split('±');

          // Format date from unix timestamp
          const date = timestamp !== '0' ? new Date(parseInt(timestamp) * 1000).toISOString() : '';

          return {
            hash,
            shortHash: hash.substring(0, 7),
            message: message,
            author: author || '',
            email: email || '',
            date,
            refs,
            parents: parentHashes ? parentHashes.split(' ') : [],
          };
        });
      } catch (e) {
        // Repository might have no commits
        return [];
      }
    },

    async getCommitDetails(hash) {
      validateCommitHash(hash);
      // Use command-line style arguments to get a specific commit by hash
      const log = await git.log(['-1', hash]);
      const commit = log.latest;

      if (!commit) {
        throw new Error('Commit not found');
      }

      const diff = await git.diff([`${hash}^..${hash}`]).catch(() =>
        git.show([hash, '--format=']) // For first commit, use git show
      );

      const show = await git.show([hash, '--stat', '--name-status']);

      return {
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        diff,
        stats: show
      };
    },

    async getDiff(file, staged = false) {
      if (file) {
        validateFilePaths(file);
      }

      // Check if file is untracked
      if (file && !staged) {
        const status = await git.status();
        if (status.not_added.includes(file)) {
          // For untracked files, show content as all additions
          try {
            const content = await git.show([`:${file}`]).catch(() => {
              // File not in index, read from working directory
              return git.raw(['show', `:0:${file}`]).catch(async () => {
                // Read file directly from filesystem
                const { readFile } = await import('fs/promises');
                const { join } = await import('path');
                const filePath = join(repoPath, file);
                return await readFile(filePath, 'utf8');
              });
            });

            // Format as diff with all lines as additions
            const lines = content.split('\n');
            let diff = `diff --git a/${file} b/${file}\n`;
            diff += `new file mode 100644\n`;
            diff += `--- /dev/null\n`;
            diff += `+++ b/${file}\n`;
            diff += `@@ -0,0 +1,${lines.length} @@\n`;
            diff += lines.map(line => `+${line}`).join('\n');

            return diff;
          } catch (error) {
            // If we can't read the file, fall back to normal diff
            console.error('Error reading untracked file:', error);
          }
        }
      }

      const args = staged ? ['--cached'] : [];
      if (file) {
        args.push('--', file);
      }
      return await git.diff(args);
    },

    async getStagedFileStats() {
      const output = await git.diff(['--cached', '--numstat']);
      if (!output || !output.trim()) return [];
      return output.trim().split('\n').filter(Boolean).map(line => {
        const parts = line.split('\t');
        const ins = parts[0];
        const del = parts[1];
        const path = parts.slice(2).join('\t');
        const isBinary = ins === '-' && del === '-';
        return {
          path,
          ins: isBinary ? 0 : parseInt(ins || 0),
          del: isBinary ? 0 : parseInt(del || 0),
          binary: isBinary,
        };
      });
    },

    async stageFiles(files) {
      if (files && files.length > 0) {
        validateFilePaths(files);
        await git.add(files);
      } else {
        await git.add('.');
      }
      return { success: true };
    },

    async unstageFiles(files) {
      if (files && files.length > 0) {
        validateFilePaths(files);
        await git.reset(['HEAD', '--', ...files]);
      } else {
        await git.reset(['HEAD']);
      }
      return { success: true };
    },

    async commit(message) {
      validateCommitMessage(message);
      const result = await git.commit(message);
      return {
        success: true,
        commit: result.commit,
        summary: result.summary
      };
    },

    async discardChanges(files) {
      if (files && files.length > 0) {
        validateFilePaths(files);

        // Get current status to check for untracked files
        const status = await git.status();
        const fileArray = Array.isArray(files) ? files : [files];

        const untrackedFiles = [];
        const trackedFiles = [];

        for (const file of fileArray) {
          if (status.not_added.includes(file)) {
            untrackedFiles.push(file);
          } else {
            trackedFiles.push(file);
          }
        }

        // Delete untracked files from filesystem
        if (untrackedFiles.length > 0) {
          const { unlink } = await import('fs/promises');
          const { join } = await import('path');

          for (const file of untrackedFiles) {
            const filePath = join(repoPath, file);
            await unlink(filePath);
          }
        }

        // Discard changes for tracked files
        if (trackedFiles.length > 0) {
          await git.checkout(['--', ...trackedFiles]);
        }
      } else {
        // Discard all: remove untracked files and checkout tracked files
        const status = await git.status();

        if (status.not_added.length > 0) {
          const { unlink } = await import('fs/promises');
          const { join } = await import('path');

          for (const file of status.not_added) {
            try {
              const filePath = join(repoPath, file);
              await unlink(filePath);
            } catch (e) {
              // File might not exist or be inaccessible
            }
          }
        }

        await git.checkout(['--', '.']);
      }
      return { success: true };
    },

    async getRemotes() {
      const remotes = await git.getRemotes(true);
      return remotes.map(remote => ({
        name: remote.name,
        fetchUrl: remote.refs.fetch,
        pushUrl: remote.refs.push
      }));
    },

    async getStashes() {
      try {
        // Get stash list with format: index|refname|branch|message
        const raw = await git.raw([
          'stash', 'list',
          '--format=%gd|%gD|%gs'
        ]);

        if (!raw || !raw.trim()) {
          return [];
        }

        const lines = raw.trim().split('\n').filter(Boolean);
        const stashes = [];

        for (const line of lines) {
          const parts = line.split('|');
          const ref = parts[0];              // stash@{0}
          const refName = parts[1] || '';     // refs/stash
          const message = parts.slice(2).join('|') || ''; // the message (may contain |)

          // Parse branch name from message: "On branchName: ..."
          let branch = '';
          let cleanMessage = message;
          const onMatch = message.match(/^On ([^:]+):\s*(.*)/);
          if (onMatch) {
            branch = onMatch[1];
            cleanMessage = onMatch[2];
          }

          // Get list of files changed in this stash
          let files = [];
          try {
            const showRaw = await git.raw(['stash', 'show', '--name-status', ref]);
            if (showRaw && showRaw.trim()) {
              const fileLines = showRaw.split('\n').filter(Boolean);
              // First line is summary (e.g. " 2 files changed, 10 insertions(+), 2 deletions(-)")
              // Subsequent lines are name-status
              for (let i = 1; i < fileLines.length; i++) {
                const fl = fileLines[i].trim();
                if (!fl) continue;
                // format: M\tpath or A\tpath or D\tpath
                const status = fl[0];
                const path = fl.substring(1).trim();
                if (path) {
                  let changeType = 'modified';
                  if (status === 'A') changeType = 'added';
                  else if (status === 'D') changeType = 'deleted';
                  else if (status === 'R') changeType = 'renamed';
                  files.push({ path, status: changeType });
                }
              }
            }
          } catch (_) {
            // stash show may fail for empty stashes
          }

          stashes.push({
            ref,
            refName,
            message: cleanMessage,
            branch,
            files,
          });
        }

        return stashes;
      } catch (e) {
        // No stashes or not a repo
        return [];
      }
    },

    async applyStash(ref) {
      if (typeof ref !== 'string' || !ref.trim()) {
        throw new Error('Stash reference is required');
      }
      // Validate format: stash@{N}
      if (!/^stash@\{\d+\}$/.test(ref)) {
        throw new Error('Invalid stash reference format');
      }
      await git.stash(['apply', ref]);
      return { success: true };
    },

    async dropStash(ref) {
      if (typeof ref !== 'string' || !ref.trim()) {
        throw new Error('Stash reference is required');
      }
      // Validate format: stash@{N}
      if (!/^stash@\{\d+\}$/.test(ref)) {
        throw new Error('Invalid stash reference format');
      }
      await git.stash(['drop', ref]);
      return { success: true };
    },

    async fetch() {
      await git.fetch();
      return { success: true };
    },

    async pull({ remote, remoteBranch, rebase = false, autostash = false } = {}) {
      // Build args: [remote, remoteBranch, --rebase?, --autostash?]
      const args = [];

      if (remote) args.push(remote);
      if (remoteBranch) args.push(remoteBranch);
      if (rebase) args.push('--rebase');
      if (autostash) args.push('--autostash');

      const result = await git.pull(args);
      return { success: true, result };
    },

    async push({ remote = 'origin', branch = '', remoteBranch = '', force = false, tags = false } = {}) {
      const args = [remote];

      // <remote> <src>:<dst>
      if (branch && remoteBranch) {
        args.push(`${branch}:${remoteBranch}`);
      } else if (branch) {
        args.push(branch);
      }

      if (tags) args.push('--tags');

      if (force === 'force-with-lease') {
        args.push('--force-with-lease');
      } else if (force === true) {
        args.push('--force');
      }

      // If no branch specified, push current branch to matching remote
      if (!branch) {
        try {
          const status = await git.status();
          args.push('-u', remote, status.current);
        } catch (_) {
          args.push('-u', remote, 'HEAD');
        }
      }

      await git.push(args);
      return { success: true };
    },

    async getConfig() {
      const config = await git.listConfig();
      const userName = config.all['user.name'] || '';
      const userEmail = config.all['user.email'] || '';
      const defaultBranch = config.all['init.defaultbranch'] || 'main';
      const aiPrompt = config.all['webgit.aiprompt'] || '';

      return {
        userName,
        userEmail,
        defaultBranch,
        aiPrompt
      };
    },

    async resetBranch(hash, mode = 'mixed') {
      validateCommitHash(hash);

      const validModes = ['soft', 'mixed', 'hard', 'merge', 'keep'];
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid reset mode '${mode}'. Valid modes: ${validModes.join(', ')}`);
      }

      const args = [`--${mode}`, hash];
      await git.reset(args);

      return { success: true, hash, mode };
    },

    async stash({ message, includeUntracked } = {}) {
      const args = ['push'];

      if (includeUntracked) {
        args.push('-u');
      }

      if (message && message.trim()) {
        args.push('-m', message.trim());
      }

      await git.stash(args);
      return { success: true };
    },

    async checkoutAndFastForward({ localBranch, remoteBranch, localChanges = 'dont-change' } = {}) {
      validateBranchName(localBranch);
      validateBranchName(remoteBranch);

      const validModes = ['dont-change', 'stash', 'discard'];
      if (!validModes.includes(localChanges)) {
        throw new Error(`Invalid local changes mode '${localChanges}'. Valid modes: ${validModes.join(', ')}`);
      }

      // Save current state
      const currentBranch = (await git.status()).current;
      let stashResult = null;

      try {
        // Handle local changes before checkout
        if (localChanges === 'stash') {
          stashResult = await git.stash(['push', '-m', `auto-stash before checkout-ff to ${localBranch}`]);
        } else if (localChanges === 'discard') {
          await git.checkout(['--', '.']);
          // Also clean untracked
          try {
            await git.raw(['clean', '-fd']);
          } catch (_) {}
        }

        // Checkout the target local branch
        await git.checkout(localBranch);

        // Fetch latest from remote
        try {
          await git.fetch();
        } catch (_) {
          // Fetch may fail if no remote, continue
        }

        // Fast-forward merge: merge remoteBranch into localBranch with --ff-only
        try {
          await git.merge([`--ff-only`, remoteBranch]);
        } catch (e) {
          // If ff-only fails, try a simpler approach: reset --hard to remoteBranch
          if (e.message && e.message.includes('Not possible to fast-forward')) {
            await git.reset(['--hard', remoteBranch]);
          } else {
            throw e;
          }
        }

        // Reapply stash if we stashed
        if (localChanges === 'stash' && stashResult) {
          try {
            await git.stash(['pop']);
          } catch (_) {
            // Stash pop may have conflicts, that's OK
          }
        }

        return { success: true, localBranch, remoteBranch };
      } catch (e) {
        // Try to restore original branch on failure
        try {
          await git.checkout(currentBranch);
          if (localChanges === 'stash' && stashResult) {
            await git.stash(['pop']);
          }
        } catch (_) {}
        throw e;
      }
    },

    async setConfig(key, value) {
      // Whitelist of allowed config keys to prevent command injection
      const allowedKeys = [
        'user.name',
        'user.email',
        'init.defaultbranch',
        'webgit.aiprompt'
      ];

      if (!allowedKeys.includes(key)) {
        throw new Error(`Configuration key '${key}' is not allowed. Allowed keys: ${allowedKeys.join(', ')}`);
      }

      // Validate value is a string
      if (typeof value !== 'string') {
        throw new Error('Configuration value must be a string');
      }

      // Empty value for the AI prompt → clear the saved prompt
      if (value.trim().length === 0) {
        if (key === 'webgit.aiprompt') {
          try {
            await git.raw(['config', '--unset', key]);
          } catch (_) {
            // Key was not set — that's fine
          }
          return { success: true };
        }
        throw new Error('Configuration value must be a non-empty string');
      }

      await git.addConfig(key, value);
      return { success: true };
    }
  };
}
