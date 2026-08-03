/**
 * Parses a `git log --decorate=full` refs string into structured label categories.
 *
 * @param {string} refsStr - The refs string from git log, e.g.
 *   "HEAD -> refs/heads/main, refs/remotes/origin/main, refs/tags/v1.0"
 * @returns {{ local: string[], remote: string[], tags: string[], stash: string[] }}
 *   An object with arrays of cleaned label names:
 *   - `local`: local branch names (no `refs/heads/` prefix)
 *   - `remote`: remote tracking branch names (no `refs/remotes/` prefix)
 *   - `tags`: tag names (no `refs/tags/` prefix)
 *   - `stash`: stash entries (e.g. `"stash"`)
 */
export function parseRefs(refsStr) {
  const labels = { local: [], remote: [], tags: [], stash: [] }
  if (!refsStr) return labels

  // Parse --decorate=full format:
  // "HEAD -> refs/heads/main, refs/remotes/origin/main, refs/tags/v1.0"
  refsStr.split(',').forEach(part => {
    const name = part.trim()
    if (!name) return

    // Strip 'HEAD -> ' prefix
    let clean = name.replace(/^HEAD -> /, '').trim()
    // Strip 'tag: ' prefix (git --decorate=full format)
    clean = clean.replace(/^tag:\s*/, '').trim()
    if (!clean) return

    if (clean.startsWith('refs/remotes/')) {
      labels.remote.push(clean.replace('refs/remotes/', ''))
    } else if (clean.startsWith('refs/heads/')) {
      labels.local.push(clean.replace('refs/heads/', ''))
    } else if (clean.startsWith('refs/tags/')) {
      labels.tags.push(clean.replace('refs/tags/', ''))
    } else if (clean.startsWith('refs/stash')) {
      labels.stash.push(clean.replace('refs/', ''))
    } else if (clean.startsWith('origin/')) {
      labels.remote.push(clean)
    } else if (/^v?\d+\./.test(clean)) {
      labels.tags.push(clean)
    } else if (clean !== 'HEAD') {
      // Plain branch name (no refs/ prefix)
      // Could be local or remote
      if (clean.includes('/')) {
        labels.remote.push(clean)
      } else {
        labels.local.push(clean)
      }
    }
  })
  return labels
}
