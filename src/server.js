import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, basename, resolve, isAbsolute } from 'path';
import { readdir, access } from 'fs/promises';
import { homedir } from 'os';
import { createRepoManager } from './repoManager.js';
import { loadSettings, saveSettings } from './settingsStore.js';
import { generateCommitMessage } from './ai.js';
import simpleGit from 'simple-git';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Start the WebGit server
 * @param {Object} options - Server options
 * @param {number} [options.port=3000] - Port to run the server on
 * @param {string} [options.repoPath=process.cwd()] - Path to the git repository
 * @param {boolean} [options.open=false] - Open browser automatically
 */
export async function startServer(options = {}) {
  const port = options.port || process.env.PORT || 3000;
  const repoPath = options.repoPath || process.env.REPO_PATH || process.cwd();
  const repoName = basename(repoPath);

  const app = express();

  // Generate CSRF token for this session
  const csrfToken = randomBytes(32).toString('hex');

  // Security headers middleware
  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for inline scripts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));

    next();
  });

  app.use(express.json());
  app.use(express.static(join(__dirname, '../public')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // CSRF token endpoint
  app.get('/api/csrf-token', (req, res) => {
    res.json({ token: csrfToken });
  });

  // CSRF protection middleware for state-changing operations
  function csrfProtection(req, res, next) {
    const token = req.headers['x-csrf-token'];
    if (token !== csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
  }

  // Error sanitization helper
  function sanitizeError(error) {
    // Remove file paths and sensitive information from error messages
    let message = error.message || 'An error occurred';

    // Remove absolute paths
    message = message.replace(/\/[\w\-./]+/g, '');
    message = message.replace(/[A-Z]:\\[\w\-\\/.]+/g, '');

    // Remove stack traces if present (lines starting with whitespace followed by "at ")
    const lines = message.split('\n').filter(line => !/^\s+at\s/.test(line));

    // For checkout conflict errors, keep the full message (file list etc.)
    // Otherwise only keep first line
    const isCheckoutConflict = lines.some(l => l.includes('would be overwritten by checkout'));
    if (isCheckoutConflict) {
      message = lines.join('\n');
    } else {
      message = lines[0] || 'An error occurred';
    }

    // Clean up git's "error: " prefix for readability
    message = message.replace(/^error:\s*/gm, '');

    // Limit message length
    if (message.length > 500) {
      message = message.substring(0, 500) + '...';
    }

    return message;
  }

  // Create repository manager (supports multiple repos)
  // 啟動時從 ~/.webgit/repos.json 還原 repo 清單與上次選中的 repo
  const repoManager = createRepoManager();
  await repoManager.init({ ensureRepoPath: repoPath });

  // Helper: resolve the git API from request's repoId query/body
  function getGitAPI(req) {
    const repoId = req.query.repoId || req.body?.repoId;
    return repoManager.getAPI(repoId || repoManager.getDefaultRepo());
  }

  // API Routes
  app.get('/api/status', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const status = await gitAPI.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/branches', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const branches = await gitAPI.getBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/branches', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { name, checkout } = req.body;
      const result = await gitAPI.createBranch(name, checkout);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/branches/checkout-ff', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { localBranch, remoteBranch, localChanges } = req.body;
      const result = await gitAPI.checkoutAndFastForward({ localBranch, remoteBranch, localChanges });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/branches/checkout', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { branch } = req.body;
      const result = await gitAPI.checkoutBranch(branch);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.delete('/api/branches/:name', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const result = await gitAPI.deleteBranch(req.params.name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/commits', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      const order = req.query.order || 'date';
      const firstParent = req.query.firstParent === 'true';
      const allBranches = req.query.allBranches !== 'false';
      const commits = await gitAPI.getCommitHistory({ limit, skip, order, firstParent, allBranches });
      res.json(commits);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/commits/:hash', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const commit = await gitAPI.getCommitDetails(req.params.hash);
      res.json(commit);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/diff', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { file, staged } = req.query;
      const diff = await gitAPI.getDiff(file, staged === 'true');
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/stage', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { files } = req.body;
      const result = await gitAPI.stageFiles(files);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/unstage', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { files } = req.body;
      const result = await gitAPI.unstageFiles(files);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/commit', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { message } = req.body;
      const result = await gitAPI.commit(message);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // AI 設定狀態（啟用中的 profile）
  app.get('/api/ai/status', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { profiles, active } = await gitAPI.getAiProfiles();
      const activeProfile = profiles.find(p => p.id === active) || null;
      res.json({
        configured: !!activeProfile,
        activeId: activeProfile?.id || null,
        activeName: activeProfile?.name || null,
        baseUrl: activeProfile?.baseUrl || null,
        profilesCount: profiles.length,
      });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // AI profiles 列表（apiKey 遮蔽）
  app.get('/api/ai/profiles', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const data = await gitAPI.getAiProfiles();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // AI profiles 整包儲存
  app.post('/api/ai/profiles', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { profiles, active } = req.body || {};
      const result = await gitAPI.setAiProfiles({ profiles, active });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/ai-commit-generate', csrfProtection, async (req, res) => {
    try {
      const { stagedFiles, customPrompt } = req.body;

      if (!stagedFiles || stagedFiles.length === 0) {
        return res.status(400).json({ error: 'No staged files' });
      }

      const gitAPI = getGitAPI(req);

      // 強制使用 profiles：沒有啟用的 profile 就不提供 AI
      const { profiles, active } = await gitAPI.getAiProfiles();
      const activeProfile = profiles.find(p => p.id === active);
      if (!activeProfile) {
        return res.status(400).json({ error: '尚未設定 AI profile，請到 Preferences → AI 頁籤設定' });
      }

      // Prompt 優先序：請求帶的 customPrompt > active profile 的 prompt
      let prompt = customPrompt;
      if (!prompt || !prompt.trim()) {
        prompt = activeProfile.prompt || undefined;
      }

      const result = await generateCommitMessage(gitAPI, stagedFiles, repoPath, prompt, {
        baseUrl: activeProfile.baseUrl,
        apiKey: activeProfile.apiKey,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/discard', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { files } = req.body;
      const result = await gitAPI.discardChanges(files);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/stashes', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const stashes = await gitAPI.getStashes();
      res.json(stashes);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/remotes', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const remotes = await gitAPI.getRemotes();
      res.json(remotes);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/fetch', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const result = await gitAPI.fetch();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/pull', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { remote, remoteBranch, rebase, autostash } = req.body;
      const result = await gitAPI.pull({ remote, remoteBranch, rebase, autostash });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/stash', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { message, includeUntracked } = req.body;
      const result = await gitAPI.stash({ message, includeUntracked });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/stash/apply', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { ref } = req.body;
      const result = await gitAPI.applyStash(ref);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/stash/drop', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { ref } = req.body;
      const result = await gitAPI.dropStash(ref);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/push', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { remote, branch, remoteBranch, force, tags } = req.body;
      const result = await gitAPI.push({ remote, branch, remoteBranch, force, tags });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get('/api/config', async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const config = await gitAPI.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/reset', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { hash, mode } = req.body;
      const result = await gitAPI.resetBranch(hash, mode || 'mixed');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.post('/api/config', csrfProtection, async (req, res) => {
    try {
      const gitAPI = getGitAPI(req);
      const { key, value } = req.body;
      const result = await gitAPI.setConfig(key, value);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ── Settings routes ─────────────────────────────────────────────────────

  // GET /api/settings/source-code-folders — 回傳 Source Code Folder 清單（第一筆 = Open Repo 預設資料夾）
  app.get('/api/settings/source-code-folders', async (req, res) => {
    try {
      const settings = await loadSettings();
      res.json({ folders: settings.sourceCodeFolders });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // POST /api/settings/source-code-folders — 整包儲存 Source Code Folder 清單（順序即意義）
  app.post('/api/settings/source-code-folders', csrfProtection, async (req, res) => {
    try {
      const { folders } = req.body || {};
      if (!Array.isArray(folders)) {
        return res.status(400).json({ error: 'folders must be an array' });
      }
      // 正規化：僅保留非空字串、解析為絕對路徑、去重（保留順序）
      const cleaned = [...new Set(
        folders
          .filter((f) => typeof f === 'string' && f.trim().length > 0)
          .map((f) => resolve(f.trim()))
      )];
      const settings = await loadSettings();
      settings.sourceCodeFolders = cleaned;
      await saveSettings(settings);
      res.json({ folders: cleaned });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ── Repository management routes (no CSRF needed) ──────────────────────

  // GET /api/repos — list all open repos + last active repo
  app.get('/api/repos', async (req, res) => {
    try {
      const repos = await repoManager.getAllRepos();
      res.json({ repos, activeRepo: repoManager.getActiveRepoId() });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // GET /api/repos/all — list ALL repos (including closed ones) from repos.json
  app.get('/api/repos/all', async (req, res) => {
    try {
      const repos = await repoManager.getAllPersistedRepos();
      res.json({ repos });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // POST /api/repos/active — remember the currently selected repo
  app.post('/api/repos/active', async (req, res) => {
    try {
      const { repoId } = req.body;
      if (!repoId) {
        return res.status(400).json({ error: 'repoId is required' });
      }
      await repoManager.setActiveRepo(repoId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // POST /api/repos/open — open an existing git repo
  app.post('/api/repos/open', async (req, res) => {
    try {
      const { path, label } = req.body;
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }
      const result = await repoManager.openRepo(path, { label });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // POST /api/repos/clone — clone a new repo from a remote URL
  app.post('/api/repos/clone', async (req, res) => {
    try {
      const { url, dir } = req.body;
      if (!url || !dir) {
        return res.status(400).json({ error: 'url and dir are required' });
      }

      // Basic URL validation to prevent command injection
      if (typeof url !== 'string' || url.length > 2048) {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      // Prevent path traversal in dir
      if (dir.includes('..')) {
        return res.status(400).json({ error: 'Path traversal is not allowed' });
      }

      // Perform the clone
      const git = simpleGit();
      await git.clone(url, dir);

      // Register the cloned repo
      const result = await repoManager.openRepo(dir);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // PATCH /api/repos/:id — set/clear the custom label (empty = clear)
  app.patch('/api/repos/:id', async (req, res) => {
    try {
      const { label } = req.body;
      const result = await repoManager.setLabel(req.params.id, label);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // DELETE /api/repos/:id — close a repo (kept in repos.json, removed from tabs)
  // ?purge=true — also remove the repo entry from repos.json entirely
  app.delete('/api/repos/:id', async (req, res) => {
    try {
      const purge = req.query.purge === 'true' || req.query.purge === '1';
      await repoManager.closeRepo(req.params.id, { purge });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // GET /api/browse — list subdirectories for the folder picker
  // ?path=/home/user — defaults to the user's home directory
  app.get('/api/browse', async (req, res) => {
    try {
      const queryPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
      const target = queryPath && queryPath.trim() ? resolve(queryPath) : homedir();

      if (queryPath && !isAbsolute(queryPath)) {
        return res.status(400).json({ error: 'Path must be absolute' });
      }

      if (!isAbsolute(target)) {
        return res.status(400).json({ error: 'Path must be absolute' });
      }

      const entries = await readdir(target, { withFileTypes: true });

      const parent = dirname(target);
      const canGoUp = parent !== target;

      // On Windows, at the root of a drive, offer the drive list
      let drives = null;
      if (process.platform === 'win32' && !canGoUp) {
        drives = await listWindowsDrives();
      }

      // Gather subdirectories, flagging git repositories (has a .git entry)
      const dirEntries = entries.filter((e) => e.isDirectory());
      const dirs = await Promise.all(
        dirEntries.map(async (entry) => {
          const fullPath = resolve(target, entry.name);
          const isRepo = await isGitRepoDir(fullPath);
          return { name: entry.name, path: fullPath, isRepo };
        })
      );

      // Git repos first, then alphabetical (case-insensitive)
      dirs.sort((a, b) => {
        if (a.isRepo !== b.isRepo) return a.isRepo ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      res.json({
        currentPath: target,
        parentPath: canGoUp ? parent : null,
        homePath: homedir(),
        drives,
        dirs,
      });
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return res.status(404).json({ error: 'Directory not found' });
      }
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // SPA fallback - serve index.html for any unmatched route (so browser refresh works on any path)
  // 未定義的 /api/* → 回傳 JSON 404（避免被下方 SPA fallback 回傳 HTML）
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../public/index.html'));
  });

  const server = app.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  WebGit - Git Repository Viewer\n`);
    console.log(`  Repository: ${repoName}`);
    console.log(`  Path:       ${repoPath}`);
    console.log(`  Server:     ${url}`);
    console.log(`  Listening:  127.0.0.1 only\n`);

    // Open browser if requested
    if (options.open) {
      import('child_process').then(({ exec }) => {
        const platform = process.platform;
        const cmd = platform === 'darwin' ? 'open' :
                    platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${cmd} ${url}`);
      });
    }
  });

  return server;
}

/**
 * Check whether a directory is a git repository (has a .git entry).
 */
async function isGitRepoDir(dirPath) {
  try {
    await access(join(dirPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

/**
 * List available drive letters on Windows (used when browsing at drive root).
 */
async function listWindowsDrives() {
  const drives = [];
  for (let i = 65; i <= 90; i++) { // A-Z
    const letter = String.fromCharCode(i);
    try {
      await access(`${letter}:\\`);
      drives.push({ name: `${letter}:`, path: `${letter}:\\`, isRepo: false });
    } catch {
      // drive not available
    }
  }
  return drives;
}

// Allow direct execution for backward compatibility
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer();
}
