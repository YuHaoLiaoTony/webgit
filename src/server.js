import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { createRepoManager } from './repoManager.js';
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
  const repoManager = createRepoManager();
  const defaultRepo = await repoManager.openRepo(repoPath);

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

  app.post('/api/ai-commit-generate', csrfProtection, async (req, res) => {
    try {
      const { stagedFiles, customPrompt } = req.body;

      if (!stagedFiles || stagedFiles.length === 0) {
        return res.status(400).json({ error: 'No staged files' });
      }

      if (!process.env.OPENCODE_API_KEY) {
        return res.status(400).json({ error: 'OpenCode API key not configured' });
      }

      const gitAPI = getGitAPI(req);

      // If no prompt was provided, fall back to the prompt saved in git config
      let prompt = customPrompt;
      if (!prompt || !prompt.trim()) {
        const config = await gitAPI.getConfig();
        prompt = config.aiPrompt || undefined;
      }

      const result = await generateCommitMessage(gitAPI, stagedFiles, repoPath, prompt);
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

  // ── Repository management routes (no CSRF needed) ──────────────────────

  // GET /api/repos — list all open repos
  app.get('/api/repos', async (req, res) => {
    try {
      const repos = await repoManager.getAllRepos();
      res.json(repos);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // POST /api/repos/open — open an existing git repo
  app.post('/api/repos/open', async (req, res) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }
      const result = await repoManager.openRepo(path);
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

  // DELETE /api/repos/:id — close/remove a repo
  app.delete('/api/repos/:id', async (req, res) => {
    try {
      repoManager.removeRepo(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // SPA fallback - serve index.html for any unmatched route (so browser refresh works on any path)
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

// Allow direct execution for backward compatibility
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer();
}
