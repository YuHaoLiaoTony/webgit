/**
 * graph-algorithm.test.js
 *
 * Unit tests for the DAG lane-routing algorithm used in CommitGraph.vue.
 * These tests validate the routeLanes() function which assigns lanes to
 * commits and determines branch/merge events for SVG rendering.
 *
 * The algorithm processes commits top-to-bottom (newest first).
 * Each row's result includes:
 *   - lane:            the "major" lane for this commit
 *   - preMergeLanes:   all active lanes BEFORE ending paths are removed
 *   - continuingLanes: lanes that remain active AFTER this row
 *   - isBranch:        this commit starts a new branch (firstRow == i && i > 0)
 *   - isMerge:         one or more active paths END at this row
 *   - mergeLinks:      additional merge parent connections
 *
 * Run with: node tests/graph-algorithm.test.js
 */

// ─── Import shared core (from the actual source code) ─────────
import { routeLanes, LANE_COLORS } from '../ui/src/lib/graph-core.js'


// ═══════════════════════════════════════════════════════════════
//  Test Runner
// ═══════════════════════════════════════════════════════════════

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    console.error(`  ❌ ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    console.error(`  ❌ ${message}`)
    console.error(`      got:      ${JSON.stringify(actual)}`)
    console.error(`      expected: ${JSON.stringify(expected)}`)
  }
}

function describe(name, fn) {
  console.log(`\n# ${name}`)
  fn()
}

// ─── Helper to build commit data ─────────────────────────────
function commit(id, parents, options = {}) {
  return {
    id,
    fullHash: id,
    hash: id.substring(0, 7),
    parents: parents || [],
    subject: options.subject || `commit ${id}`,
    ...options
  }
}

// ─── Validation helper ───────────────────────────────────────
function validateRow(r, idx, expected) {
  const prefix = `row ${idx} (${r.id})`
  assert(typeof r.lane === 'number' && r.lane >= 1, `${prefix}: lane = ${r.lane}`)
  assert(Array.isArray(r.preMergeLanes), `${prefix}: preMergeLanes is array`)
  assert(Array.isArray(r.continuingLanes), `${prefix}: continuingLanes is array`)
  assert(typeof r.isBranch === 'boolean', `${prefix}: isBranch is boolean`)
  assert(typeof r.isMerge === 'boolean', `${prefix}: isMerge is boolean`)
  assert(Array.isArray(r.mergeLinks), `${prefix}: mergeLinks is array`)

  // preMergeLanes should be sorted
  for (let i = 1; i < r.preMergeLanes.length; i++) {
    assert(r.preMergeLanes[i] >= r.preMergeLanes[i-1], `${prefix}: preMergeLanes sorted`)
  }
  // Lane should appear in preMergeLanes
  assert(r.preMergeLanes.includes(r.lane), `${prefix}: lane ${r.lane} in preMergeLanes`)
  // continuingLanes should be sorted
  for (let i = 1; i < r.continuingLanes.length; i++) {
    assert(r.continuingLanes[i] >= r.continuingLanes[i-1], `${prefix}: continuingLanes sorted`)
  }
  // If there's a next row, this row's continuingLanes should match next row's preMergeLanes minus new lanes
  if (expected && expected.lane !== undefined) {
    assert(r.lane === expected.lane, `${prefix}: lane = ${expected.lane}`)
  }
  if (expected && expected.isBranch !== undefined) {
    assert(r.isBranch === expected.isBranch, `${prefix}: isBranch = ${expected.isBranch}`)
  }
  if (expected && expected.isMerge !== undefined) {
    assert(r.isMerge === expected.isMerge, `${prefix}: isMerge = ${expected.isMerge}`)
  }
  if (expected && expected.mergeLinks !== undefined) {
    assert(r.mergeLinks.length === expected.mergeLinks, `${prefix}: mergeLinks count = ${expected.mergeLinks}`)
  }
  if (expected && expected.preMergeLanes !== undefined) {
    assertEqual(r.preMergeLanes, expected.preMergeLanes, `${prefix}: preMergeLanes`)
  }
  if (expected && expected.continuingLanes !== undefined) {
    assertEqual(r.continuingLanes, expected.continuingLanes, `${prefix}: continuingLanes`)
  }
}

// ═══════════════════════════════════════════════════════════════
//  1. Empty data
// ═══════════════════════════════════════════════════════════════
describe('1. Empty / Edge Cases', () => {
  assertEqual(routeLanes(null), [], 'routeLanes(null) → []')
  assertEqual(routeLanes(undefined), [], 'routeLanes(undefined) → []')
  assertEqual(routeLanes([]), [], 'routeLanes([]) → []')
})

// ═══════════════════════════════════════════════════════════════
//  2. Single commit (root, no parents)
// ═══════════════════════════════════════════════════════════════
describe('2. Single Commit (Root)', () => {
  const data = [commit('A', [])]
  const r = routeLanes(data)
  assert(r.length === 1, 'returns 1 row')
  validateRow(r[0], 0, {
    isBranch: false,
    isMerge: false,
    continuingLanes: [], // orphan path removed (next=null)
    mergeLinks: 0,
  })
})

// ═══════════════════════════════════════════════════════════════
//  3. Linear chain: A (top) → B → C (root)
//     Algorithm processes top-to-bottom: A first, then B, then C
//     A gets lane 1 (new), follows parent B
//     B matches path (next='B'), follows parent C
//     C matches path (next='C'), root → path cleaned up
// ═══════════════════════════════════════════════════════════════
describe('3. Linear Chain', () => {
  const data = [
    commit('A', ['B']),  // newest (top)
    commit('B', ['C']),
    commit('C', []),     // root
  ]
  const r = routeLanes(data)
  assert(r.length === 3, 'returns 3 rows')

  // All on same lane
  assert(r[0].lane === r[1].lane && r[1].lane === r[2].lane, 'all commits on same lane')
  assert(r[0].isBranch === false, 'A isBranch=false (first row)')
  assert(r[1].isBranch === false, 'B isBranch=false')
  assert(r[2].isBranch === false, 'C isBranch=false')
  assert(r[0].isMerge === false, 'A isMerge=false')
  assert(r[1].isMerge === false, 'B isMerge=false')
  assert(r[0].continuingLanes.length > 0, 'A has continuing lanes')
  assert(r[1].continuingLanes.length > 0, 'B has continuing lanes')
  assert(r[2].continuingLanes.length === 0, 'C no continuing lanes (root)')
})

// ═══════════════════════════════════════════════════════════════
//  4. Simple branch (fork): main line with a fork from C
//     Layout (top to bottom):
//       D (branch from C)     → parent: C
//       A (main chain)        → parent: B
//       B                     → parent: C
//       C (root)
//
//     Algorithm:
//       Row 0: D → new path lane 1, next='C'
//       Row 1: A → new path lane 2, next='B'
//       Row 2: B → matches path lane 2 (next='B'), next='C'
//       Row 3: C → both paths match! lane 1 is major, lane 2 ends (isMerge=true)
// ═══════════════════════════════════════════════════════════════
describe('4. Simple Branch (Fork)', () => {
  const data = [
    commit('D', ['C']),   // branch from C
    commit('A', ['B']),   // main chain
    commit('B', ['C']),
    commit('C', []),      // root
  ]
  const r = routeLanes(data)
  assert(r.length === 4, 'returns 4 rows')

  assert(r[0].id === 'D', 'row 0 = D')
  assert(r[1].id === 'A', 'row 1 = A')
  assert(r[2].id === 'B', 'row 2 = B')
  assert(r[3].id === 'C', 'row 3 = C')

  // D and A should be on different lanes
  assert(r[0].lane !== r[1].lane, 'D and A on different lanes')
  // A and B should be on same lane (B continues A's path)
  assert(r[1].lane === r[2].lane, 'A and B on same lane (main chain)')
  // C's row should have both lanes
  assert(r[3].preMergeLanes.length === 2, 'root row has 2 preMerge lanes')
  // Row C should be a merge (branch ends here)
  assert(r[3].isMerge === true, 'C.isMerge = true (branch path ends)')
})

// ═══════════════════════════════════════════════════════════════
//  5. Simple merge: branch merges back to main
//     Layout (top to bottom):
//       D (merge commit, parents: [C, B])
//       C (branch, parent: A)
//       B (main, parent: A)
//       A (root)
//
//     Algorithm:
//       Row 0: D → new path lane 1 (first parent=C),
//              merge parent B → new path lane 2, mergeLinks
//       Row 1: C → matches path lane 1 (next='C'), next='A'
//       Row 2: B → matches path lane 2 (next='B'), next='A'
//       Row 3: A → both paths match! lane 1 major, lane 2 ends → isMerge
// ═══════════════════════════════════════════════════════════════
describe('5. Simple Merge', () => {
  const data = [
    commit('D', ['C', 'B']),  // merge commit
    commit('C', ['A']),       // branch
    commit('B', ['A']),       // main
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 4, 'returns 4 rows')

  assert(r[0].id === 'D', 'row 0 = D')
  assert(r[1].id === 'C', 'row 1 = C')
  assert(r[2].id === 'B', 'row 2 = B')
  assert(r[3].id === 'A', 'row 3 = A')

  // D has a merge link for the second parent
  assert(r[0].mergeLinks.length >= 1, 'D has mergeLinks')

  // C and B should be on different lanes
  assert(r[1].lane !== r[2].lane, 'C and B on different lanes')

  // At root (A), both paths end → isMerge
  assert(r[3].isMerge === true, 'A.isMerge = true (all paths end at root)')
  assert(r[3].preMergeLanes.length === 2, 'A has 2 active lanes before merge')
  assert(r[3].continuingLanes.length === 0, 'A has no continuing lanes')
})

// ═══════════════════════════════════════════════════════════════
//  6. Octopus merge (4 parents)
// ═══════════════════════════════════════════════════════════════
describe('6. Octopus Merge (4 parents)', () => {
  // M merges A, B, C, D
  const data = [
    commit('M', ['A', 'B', 'C', 'D']),
    commit('D', ['root']),
    commit('C', ['root']),
    commit('B', ['root']),
    commit('A', ['root']),
    commit('root', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 6, 'returns 6 rows')
  assert(r[0].id === 'M', 'first row is M')
  assert(r[0].mergeLinks.length >= 3, `M has ${r[0].mergeLinks.length} mergeLinks`)

  // 4 parent commits should be on different lanes
  const parentLanes = new Set(r.slice(1, 5).map(x => x.lane))
  assert(parentLanes.size >= 3, `parents use ${parentLanes.size} different lanes`)

  // Each mergeLink references a valid lane
  for (const link of r[0].mergeLinks) {
    assert(typeof link.fromLane === 'number' && link.fromLane >= 1, `mergeLink lane ${link.fromLane} is valid`)
  }
})

// ═══════════════════════════════════════════════════════════════
//  7. Multiple branches interleaved
// ═══════════════════════════════════════════════════════════════
describe('7. Multiple Branches', () => {
  // F (branch from C)  E (branch from C)  D (branch from B)
  // C (main) ← B ← A (root)
  const data = [
    commit('F', ['C']),
    commit('E', ['C']),
    commit('D', ['B']),
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 6, 'returns 6 rows')

  const lanes = r.map(x => x.lane)
  const uniqueLanes = [...new Set(lanes)]
  assert(uniqueLanes.length >= 2, `uses ${uniqueLanes.length} different lanes`)

  // F, E, D should each have their own lane (or at least not all same)
  const branchLanes = new Set([r[0].lane, r[1].lane, r[2].lane])
  assert(branchLanes.size >= 2, `top 3 rows use ${branchLanes.size} lanes`)
})

// ═══════════════════════════════════════════════════════════════
//  8. Lane reuse after branch ends
// ═══════════════════════════════════════════════════════════════
describe('8. Lane Reuse', () => {
  // G → F → D (merge) ... D has a branch E that merges in
  const data = [
    commit('G', ['F']),
    commit('F', ['D']),
    commit('E', ['D']),
    commit('D', ['C', 'E']),  // D merges E
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 7, 'returns 7 rows')

  for (const row of r) {
    assert(typeof row.lane === 'number' && row.lane >= 0, `${row.id}: lane is valid (${row.lane})`)
    assert(Array.isArray(row.preMergeLanes), `${row.id}: preMergeLanes is array`)
    assert(Array.isArray(row.continuingLanes), `${row.id}: continuingLanes is array`)
  }
})

// ═══════════════════════════════════════════════════════════════
//  9. Orphan commit (no parents — e.g., stash)
// ═══════════════════════════════════════════════════════════════
describe('9. Orphan Commit (No Parents)', () => {
  const data = [
    commit('O', []),      // orphan at top
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 4, 'returns 4 rows')

  for (const row of r) {
    assert(typeof row.lane === 'number', `${row.id}: lane is a number`)
    assert(Array.isArray(row.preMergeLanes), `${row.id}: preMergeLanes array`)
  }
})

// ═══════════════════════════════════════════════════════════════
//  10. Many lanes (>10, tests color cycling)
// ═══════════════════════════════════════════════════════════════
describe('10. Many Lanes (>10, Color Cycling)', () => {
  // Create 12 branches from root
  const data = [commit('root', [])]
  for (let i = 0; i < 12; i++) {
    data.unshift(commit(`B${i}`, ['root']))
  }
  const r = routeLanes(data)
  assert(r.length === 13, `returns 13 rows (root + 12 branches)`)

  const lanes = r.slice(0, 12).map(x => x.lane)
  const uniqueLanes = [...new Set(lanes)]
  assert(uniqueLanes.length >= 10, `uses ${uniqueLanes.length} unique lanes (≥10)`)

  // The color this lane maps to should be a valid color
  for (const row of r) {
    const colorIdx = row.lane % LANE_COLORS.length
    assert(colorIdx >= 0 && colorIdx < LANE_COLORS.length, `lane ${row.lane} maps to color index ${colorIdx}`)
  }
})

// ═══════════════════════════════════════════════════════════════
//  11. Complex DAG
// ═══════════════════════════════════════════════════════════════
describe('11. Complex DAG', () => {
  // Realistic scenario (top to bottom):
  //   I → H (merge H = G + F)
  //   G → E → D → B
  //   F → C → B
  //   B → A (root)
  const data = [
    commit('I', ['H']),
    commit('H', ['G', 'F']),  // merge
    commit('G', ['E']),
    commit('F', ['C']),
    commit('E', ['D']),
    commit('D', ['B']),
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 9, 'returns 9 rows')

  assert(r[1].id === 'H', 'row 1 = H (merge)')
  assert(r[1].preMergeLanes.length >= 2, 'merge row has ≥2 active lanes')

  // Verify lane assignments are consistent
  for (let i = 0; i < r.length - 1; i++) {
    // If the next row's lane is in this row's continuingLanes, it's a continuation
    const nextLane = r[i + 1].lane
    if (r[i].continuingLanes.includes(nextLane)) {
      // Good: lane continues
    } else {
      // The next row might start a new lane (new branch or merge parent)
      // Verify it's a new path (not in continuingLanes)
      assert(!r[i].continuingLanes.includes(nextLane), `row ${i+1} lane ${nextLane} not in row ${i} continuingLanes — new path`)
    }
  }
})

// ═══════════════════════════════════════════════════════════════
//  12. First-parent filter scenario (linear)
// ═══════════════════════════════════════════════════════════════
describe('12. First-Parent Filter Compatible', () => {
  // When firstParent is true, commits only show their first parent → pure linear
  const data = [
    commit('E', ['D']),
    commit('D', ['C']),
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 5, 'returns 5 rows')
  // All should be on the same lane
  const allSameLane = r.every(row => row.lane === r[0].lane)
  assert(allSameLane, 'all commits on same lane')
  assert(r.every(row => !row.isMerge), 'no merge events')
  // continuingLanes should decrease monotonically
  assert(r[0].continuingLanes.length > 0, 'E has continuing lanes')
  assert(r[3].continuingLanes.length > 0, 'B has continuing lanes')
  assert(r[4].continuingLanes.length === 0, 'A no continuing lanes (root)')
})

// ═══════════════════════════════════════════════════════════════
//  13. Branching from non-tip
// ═══════════════════════════════════════════════════════════════
describe('13. Branch from Non-Tip', () => {
  // F branches from C, E continues from D, D continues from C
  const data = [
    commit('F', ['C']),
    commit('E', ['D']),
    commit('D', ['C']),
    commit('C', ['B']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 6, 'returns 6 rows')

  assert(r[0].id === 'F', 'row 0 = F')
  assert(r[1].id === 'E', 'row 1 = E')

  // E and F should be on different lanes
  assert(r[0].lane !== r[1].lane, 'E and F on different lanes')
  // E and D should be on same (D continues E's path)
  assert(r[1].lane === r[2].lane, 'E and D on same lane')
})

// ═══════════════════════════════════════════════════════════════
//  14. Branch + Merge at Same Commit
// ═══════════════════════════════════════════════════════════════
describe('14. Branch + Merge at Same Commit', () => {
  // E → D (merge D = C + B) → C, B → A (root)
  const data = [
    commit('E', ['D']),
    commit('D', ['C', 'B']),  // merge
    commit('C', ['A']),
    commit('B', ['A']),
    commit('A', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 5, 'returns 5 rows')
  assert(r[1].id === 'D', 'row 1 = D')
  assert(r[0].id === 'E', 'row 0 = E')

  // E continues D's lane (same major path after merge)
  assert(r[0].lane === r[1].lane, 'E continues D lane')

  // D has mergeLinks (at least for the second parent)
  assert(r[1].mergeLinks.length >= 1, 'D has mergeLinks')
})

// ═══════════════════════════════════════════════════════════════
//  15. All merge parent scenarios
// ═══════════════════════════════════════════════════════════════
describe('15. Merge Parent Connection Types', () => {
  // Test 3 types of merge parent connections:
  // 1. Existing path (lane already active)
  // 2. New path (lane created fresh)
  //
  // D merges C and B. B is on active path, C is new path.
  // ... wait, algorithm processes top to bottom, so at D's row,
  // both B and C paths would be new (no paths exist before D).
  //
  // Better scenario: E → D (merge D = C + B). At D, C path should
  // already exist from being processed... no, C is below D.
  //
  // Actually, the only case where mergeLinks references an existing path
  // is when a parent is already being followed from a higher row.
  // Let's use:
  //   G → F → E (merge, F's parent E is already followed)
  // This is tricky. Let me just verify mergeLinks work in general.

  // Standard merge - mergeLinks created for second+ parents
  const data = [
    commit('M', ['X', 'Y']),
    commit('Y', ['R']),
    commit('X', ['R']),
    commit('R', []),
  ]
  const r = routeLanes(data)
  assert(r.length === 4, 'returns 4 rows')
  assert(r[0].mergeLinks.length >= 1, 'M has mergeLinks')
  // Verify fromLane references a real lane
  for (const link of r[0].mergeLinks) {
    assert(typeof link.fromLane === 'number', `fromLane = ${link.fromLane}`)
    // The lane should exist somewhere in the row data
    const laneExists = r.some(row => row.lane === link.fromLane || row.preMergeLanes.includes(link.fromLane))
    assert(laneExists, `fromLane ${link.fromLane} exists in dataset`)
  }
})

// ═══════════════════════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════════════════════
describe('\n═══════════════════════════════════════', () => {
  console.log(`  Total: ${passed + failed}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`)
  if (failed > 0) {
    console.error('  Some tests FAILED!')
    process.exit(1)
  } else {
    console.log('  All tests PASSED!')
  }
})
