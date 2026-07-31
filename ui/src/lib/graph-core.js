/**
 * graph-core.js
 *
 * Pure functions for Commit Graph DAG lane routing and SVG rendering.
 * Extracted from CommitGraph.vue so tests and demo generators share
 * the same source code.
 *
 * Framework-agnostic: works in Node.js, Vue, or browser.
 */

// ─── Constants ────────────────────────────────────────────────
export const LANE_COLORS = ['#f5a623', '#4a90e2', '#e056fd', '#28a745', '#cb2431', '#00bcd4', '#ff5722', '#9c27b0', '#8bc34a', '#ff9800']
export const LANE_X_BASE = 6
export const LANE_X_STEP = 7
export const ROW_H = 28
export const DOT_Y = 14

export class PathHelper {
  constructor(next, lane) {
    this.next = next
    this.lane = lane
    this.color = LANE_COLORS[lane % LANE_COLORS.length]
    this.firstRow = -1
    this.lastRow = -1
  }
}

/**
 * Route lanes for a list of commits (top-to-bottom, newest first).
 *
 * @param {Array} data - Array of { id, fullHash, parents: string[] }
 * @returns {Array} Per-row result: { lane, preMergeLanes, continuingLanes, isBranch, isMerge, mergeLinks }
 */
export function routeLanes(data) {
  if (!data || !data.length) return []

  const hashToRow = new Map()
  data.forEach((c, i) => {
    if (c.fullHash) hashToRow.set(c.fullHash, i)
  })

  const paths = []
  let nextLane = 1
  const result = []

  for (let i = 0; i < data.length; i++) {
    const commit = data[i]

    // ── 1. Find "major" path and ending paths ──
    let majorPath = null
    const endingPaths = []

    for (let p = 0; p < paths.length; p++) {
      if (paths[p].next === commit.fullHash) {
        if (majorPath === null) {
          majorPath = paths[p]
        } else {
          endingPaths.push(paths[p])
        }
      }
    }

    if (majorPath) {
      majorPath.next = commit.parents[0] || null
      if (majorPath.firstRow < 0) majorPath.firstRow = i
      majorPath.lastRow = i
    } else {
      const usedLanes = new Set(paths.map(p => p.lane))
      let lane = 1
      while (usedLanes.has(lane)) lane++
      if (lane >= nextLane) nextLane = lane + 1
      majorPath = new PathHelper(commit.parents[0] || null, lane)
      majorPath.firstRow = i
      majorPath.lastRow = i
      paths.push(majorPath)
    }

    // ── 2. Handle merge parents (parents[1..n]) ──
    const mergeParents = commit.parents.slice(1).filter(ph => ph)
    const mergeLinks = []

    for (const parentHash of mergeParents) {
      const existingPath = paths.find(p => p.next === parentHash)

      if (existingPath) {
        mergeLinks.push({ fromLane: existingPath.lane, parentHash })
      } else {
        const usedLanes = new Set(paths.map(p => p.lane))
        let lane = 1
        while (usedLanes.has(lane)) lane++
        if (lane >= nextLane) nextLane = lane + 1
        // 非匹配的 merge parent（如 stash 的 index/untracked）
        // 設 next=null 讓 path 在下列就被清除，避免空轉線條
        const newPath = new PathHelper(null, lane)
        newPath.firstRow = i
        newPath.lastRow = i
        paths.push(newPath)
        mergeLinks.push({ fromLane: lane, parentHash })
      }
    }

    // ── 3. Build preMergeLanes (before ending paths removed) ──
    const preMergeLanes = [...new Set(paths.map(p => p.lane))]
    if (!preMergeLanes.includes(majorPath.lane)) preMergeLanes.push(majorPath.lane)
    preMergeLanes.sort((a, b) => a - b)

    // ── 4. Remove ending paths ──
    for (const ep of endingPaths) {
      ep.lastRow = i
      const idx = paths.indexOf(ep)
      if (idx >= 0) paths.splice(idx, 1)
    }

    // Keep orphan lanes alive so each orphan/stash gets its own lane and color.
    // Rules:
    //   - Last row: always clean up all orphan paths.
    //   - Current commit has parents AND path is stale (not this row's): clean up.
    //   - Current commit is also orphan (no parents): keep all paths alive so each
    //     consecutive stash gets a unique lane.
    for (let p = paths.length - 1; p >= 0; p--) {
      if (paths[p].next === null) {
        if (i === data.length - 1) {
          // Last row — always clean up all orphan paths
          paths[p].lastRow = i
          paths.splice(p, 1)
        } else if (commit.parents.length > 0 && paths[p].firstRow !== i) {
          // Current commit has parents AND this is a stale orphan — clean up
          paths[p].lastRow = i
          paths.splice(p, 1)
        }
        // Otherwise keep the lane alive (current commit is also orphan/stash)
      }
    }

    // ── 5. Build continuingLanes ──
    const continuingLanes = [...new Set(paths.map(p => p.lane))]
    if (paths.includes(majorPath) && !continuingLanes.includes(majorPath.lane)) {
      continuingLanes.push(majorPath.lane)
    }
    continuingLanes.sort((a, b) => a - b)

    // ── 6. Determine events ──
    const isBranch = majorPath.firstRow === i && i > 0
    const isMerge = endingPaths.length > 0

    result.push({
      id: commit.id,
      lane: majorPath.lane,
      preMergeLanes,
      continuingLanes,
      isBranch,
      isMerge,
      mergeLinks,
    })
  }

  return result
}

// ─── Coordinate helpers ──────────────────────────────────────
export function getLaneX(lane) {
  return LANE_X_BASE + lane * LANE_X_STEP
}

export function getLaneColor(lane) {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

/**
 * Generate SVG for one commit row.
 *
 * @param {Object} commit  - { id, fullHash, parents: string[], ... }
 * @param {number} index   - Row index (0 = top/newest)
 * @param {Array}  data    - Full commit array
 * @param {Array}  routes  - Output of routeLanes(data)
 * @param {number} [fixedWidth] - Optional fixed SVG width (px). Auto if omitted.
 * @returns {string} SVG markup
 */
export function getRowGraph(commit, index, data, routes, fixedWidth) {
  if (!data || !data.length) return ''
  if (!routes || index >= routes.length) return ''

  const r = routes[index]
  const isFirst = index === 0
  const rowTop = 0
  const rowBot = ROW_H
  const nodeY = DOT_Y

  const maxLane = fixedWidth
    ? Math.max(...routes.flatMap(rr => rr.preMergeLanes), r.lane)
    : Math.max(...routes.flatMap(rr => rr.preMergeLanes), r.lane)

  const viewW = fixedWidth || Math.max(120, getLaneX(maxLane) + 20)

  let svg = `<svg class="graph-svg" viewBox="0 0 ${viewW} ${ROW_H}" xmlns="http://www.w3.org/2000/svg">`

  const myCx = getLaneX(r.lane)

  // Lanes that end at this row → merge curves replace their top-half vertical
  const mergingLanes = index > 0
    ? routes[index - 1].continuingLanes.filter(l =>
        r.preMergeLanes.includes(l) && !r.continuingLanes.includes(l) && l !== r.lane
      )
    : []

  // ── 1. Vertical through-lines ──
  for (const lane of r.preMergeLanes) {
    const cx = getLaneX(lane)
    const color = getLaneColor(lane)
    const wasActive = index > 0 && routes[index - 1].preMergeLanes.includes(lane)
    const willBeActive = index < data.length - 1 && routes[index + 1].preMergeLanes.includes(lane)
    const isMerging = mergingLanes.includes(lane)

    if (wasActive && !isMerging) {
      svg += `<line x1="${cx}" y1="${rowTop}" x2="${cx}" y2="${nodeY}" stroke="${color}" stroke-width="2.5" />`
    }
    if (willBeActive) {
      svg += `<line x1="${cx}" y1="${nodeY}" x2="${cx}" y2="${rowBot}" stroke="${color}" stroke-width="2.5" />`
    }
  }

  // ── 2. Merge curves ──
  for (const mLane of mergingLanes) {
    const mCx = getLaneX(mLane)
    if (mCx < myCx) {
      // Rightward — right-angle quadratic
      svg += `<path d="M ${mCx} ${rowTop} Q ${myCx} ${rowTop} ${myCx} ${nodeY}" fill="none" stroke="${getLaneColor(mLane)}" stroke-width="2.5" stroke-linecap="round" />`
    } else {
      // Leftward — cubic bezier S-curve
      const midY = (rowTop + nodeY) / 2
      svg += `<path d="M ${mCx} ${rowTop} C ${mCx} ${midY + 4} ${myCx} ${midY - 4} ${myCx} ${nodeY}" fill="none" stroke="${getLaneColor(mLane)}" stroke-width="2.5" stroke-linecap="round" />`
    }
  }

  // ── 3. Merge parent links (dashed) — 跳過 stash（fork 做法）
  if (!commit.isStash) {
  for (const link of (r.mergeLinks || [])) {
    const linkCx = getLaneX(link.fromLane)
    if (linkCx !== myCx) {
      if (linkCx > myCx) {
        svg += `<path d="M ${myCx} ${nodeY} Q ${linkCx} ${nodeY} ${linkCx} ${nodeY}" fill="none" stroke="${getLaneColor(link.fromLane)}" stroke-width="2.5" stroke-dasharray="4,3" />`
      } else {
        svg += `<path d="M ${myCx} ${nodeY} C ${myCx} ${nodeY - 4} ${linkCx} ${nodeY + 4} ${linkCx} ${nodeY}" fill="none" stroke="${getLaneColor(link.fromLane)}" stroke-width="2.5" stroke-dasharray="4,3" />`
      }
    }
  }
  }

  // ── 4. Commit dot ──
  const dotCx = getLaneX(r.lane)
  const dotColor = getLaneColor(r.lane)
  const isMergeCommit = commit.parents && commit.parents.length > 1 && !commit.isStash

  if (isFirst) {
    // HEAD: large hollow ring + small solid center
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="6" fill="none" stroke="${dotColor}" stroke-width="2.5" />`
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="3" fill="${dotColor}" />`
  } else if (isMergeCommit) {
    // Merge commit: large solid dot with cross
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="5" fill="${dotColor}" />`
    svg += `<line x1="${dotCx - 4}" y1="${nodeY}" x2="${dotCx + 4}" y2="${nodeY}" stroke="white" stroke-width="1.5" />`
    svg += `<line x1="${dotCx}" y1="${nodeY - 4}" x2="${dotCx}" y2="${nodeY + 4}" stroke="white" stroke-width="1.5" />`
  } else {
    // Normal commit: solid filled circle
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="4" fill="${dotColor}" />`
  }

  svg += `</svg>`
  return svg
}
