#!/usr/bin/env node
/**
 * generate-graph-demo.js
 *
 * Generates an interactive HTML demo page with 16 graph scenarios.
 * Scenario 16 has live sliders to tune merge link curve parameters.
 *
 * Run: node tests/generate-graph-demo.js
 * Output: tests/graph-lines-demo.html
 */

import { routeLanes, getLaneX, getLaneColor, getRowGraph, LANE_COLORS } from '../ui/src/lib/graph-core.js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Helper ──────────────────────────────────────────────────
function c(id, parents, opts = {}) {
  return { id, fullHash: id, hash: id.substring(0, 6), parents: parents || [], ...opts }
}

// ─── Load graph-core.js and inject global offset support ────
let graphCoreJs = readFileSync(resolve(__dirname, '../ui/src/lib/graph-core.js'), 'utf-8')

// Strip 'export ' so it works in a normal <script> tag
graphCoreJs = graphCoreJs.replace(/^export /gm, '')

// ═══════════════════════════════════════════════════════════════
//  16 Scenarios
// ═══════════════════════════════════════════════════════════════

const scenarios = [
  { num: 1, title: '空資料', subtitle: '沒有 commit 時的邊界情況',
    desc: '當 routeLanes(null | undefined | []) 時回傳空陣列。沒有任何線條或節點。', data: [] },
  { num: 2, title: '單一提交', subtitle: '只有一個 root commit',
    desc: '一個孤立的 root commit，建立 lane 1，節點為 HEAD 空心大圓。', data: [c('A', [])] },
  { num: 3, title: '線性鏈', subtitle: 'A ← B ← C — 單純直線',
    desc: '三個 commit 在同一條 lane 上垂直串聯，每筆只有一個 parent。', data: [c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 4, title: '分支 (Fork)', subtitle: 'D 從 A 分出，主線 A→B→C',
    desc: 'D 從 A 分支，與主線 B→C 並行。兩條垂直線並列的 branch 曲線。', data: [c('D', ['A']), c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 5, title: '合併 (Merge)', subtitle: 'D = C + B 合併提交',
    desc: 'B（主線）和 C（分支）在 D 合併。mergeLinks 用虛線連接到第二個 parent 的 lane，合併節點顯示十字圓 ✚。', data: [c('D', ['C', 'B']), c('C', ['A']), c('B', ['A']), c('A', [])] },
  { num: 6, title: '多重合併 (Octopus)', subtitle: 'M 同時合併 A, B, C, D 四個 parent',
    desc: '一個 merge commit 合併超過 2 個 branch。', data: [c('M', ['A', 'B', 'C', 'D']), c('D', ['R']), c('C', ['R']), c('B', ['R']), c('A', ['R']), c('R', [])] },
  { num: 7, title: '多條分支', subtitle: 'F、E 從 C 分支，D 從 B 分支',
    desc: '同時多條 active branch 交錯顯示。', data: [c('F', ['C']), c('E', ['C']), c('D', ['B']), c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 8, title: '分支+合併同節點', subtitle: 'E → D（合併 C+B）',
    desc: 'D 既是合併點，也是 E 的 parent。', data: [c('E', ['D']), c('D', ['C', 'B']), c('C', ['A']), c('B', ['A']), c('A', [])] },
  { num: 9, title: '車道重複使用', subtitle: 'Branch 結束後釋放 lane 給新分支',
    desc: 'E 在 D 合併後結束，釋放 lane。G 可重新使用此 lane。', data: [c('G', ['F']), c('F', ['D']), c('E', ['D']), c('D', ['C', 'E']), c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 10, title: '孤兒提交 (Orphan)', subtitle: '無 parent 的孤立 commit',
    desc: 'O 沒有 parent (null)。演算法建立 path 後立即清除。', data: [c('O', []), c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 11, title: '超過 10 條車道', subtitle: '12 條 branch 測試顏色循環',
    desc: '超過 LANE_COLORS 長度 (10) 時顏色循環。', data: (() => { const d = [c('R', [])]; for (let i = 0; i < 12; i++) d.unshift(c(`B${i}`, ['R'])); return d })() },
  { num: 12, title: '左右曲線', subtitle: '合併來自不同方向的 lane',
    desc: '右向 → 直角二次貝茲 Q；左向 → S 形三次貝茲 C。', data: [c('M', ['C', 'B', 'D']), c('D', ['A']), c('C', ['A']), c('B', ['A']), c('A', [])] },
  { num: 13, title: '複雜 DAG', subtitle: '交錯分支與合併的真實情境',
    desc: 'I → H（merge G+F）→ 兩條 lineage 交錯。', data: [c('I', ['H']), c('H', ['G', 'F']), c('G', ['E']), c('F', ['C']), c('E', ['D']), c('D', ['B']), c('C', ['B']), c('B', ['A']), c('A', [])] },
  { num: 14, title: 'First-Parent 線性', subtitle: '啟用 First-Parent 篩選的線性歷史',
    desc: 'merge commit 只顯示第一個 parent，形成純線性鏈。', data: [c('E', ['D']), c('D', ['C']), c('B', ['A']), c('C', ['B']), c('A', [])] },
  { num: 15, title: '非末端分支', subtitle: 'F 從 C（非最新）分支',
    desc: 'F 從 C 分支（backport 情境），E 從 D 繼續。', data: [c('F', ['C']), c('E', ['D']), c('D', ['C']), c('C', ['B']), c('B', ['A']), c('A', [])] },
  // ═══════════════════════════════════════════════════════════
  { num: 16, title: '多分支依序合併到 release', subtitle: '5 master · 3 分支 · 依序合併',
    desc: `<strong>master</strong> 5 個線性 commit。<strong>branch01/02/03</strong> 從 M5 分支，各有 1/2/3 個 commit。
      <strong>release</strong> 從 M5 分支後，依序合併三個分支。最後合併回 master → <strong>M</strong>。`,
    data: [
      c('M',       ['M5', 'merge03']),
      c('merge03', ['merge02', 'b03-3']),
      c('merge02', ['merge01', 'b02-2']),
      c('merge01', ['RLS', 'b01-1']),
      c('b03-3',   ['b03-2']),
      c('b03-2',   ['b03-1']),
      c('b03-1',   ['M5']),
      c('b02-2',   ['b02-1']),
      c('b02-1',   ['M5']),
      c('b01-1',   ['M5']),
      c('RLS',     ['M5']),
      c('M5',      ['M4']),
      c('M4',      ['M3']),
      c('M3',      ['M2']),
      c('M2',      ['M1']),
      c('M1',      []),
    ],
  },
  // ═══════════════════════════════════════════════════════════
  {
    num: 17, title: '真實情境：2 分支 + 3 Stash', subtitle: 'master → feature/login + feature/dashboard + 3 個 stash',
    desc: `<strong>feature/login</strong>（5a6b7c8 → 7f8e9d0）和 <strong>feature/dashboard</strong>（b2c3d4e → d4e5f6a）
      皆從 master（1a2b3c4）分支。3 個 stash 分別產生於兩個分支上，各有獨立車道。
      <br><br>📦 stash@{0} On feature/dashboard: WIP: Add responsive styles for charts
      <br>📦 stash@{1} On feature/dashboard: WIP: Temporary mock data for API
      <br>📦 stash@{2} On feature/login: WIP: Refactor login form state handling`,
    data: [
      // feature/dashboard branch — stash 在 parent 上方（stash 更新）
      c('stash@{0}', ['d4e5f6a', 'index', 'untracked'], { isStash: true }), // 3 parents（fork 做法）
      c('d4e5f6a', ['b2c3d4e']),
      c('stash@{1}', ['b2c3d4e', 'index', 'untracked'], { isStash: true }),
      c('b2c3d4e', ['1a2b3c4']),     // feature/dashboard
      // feature/login branch
      c('stash@{2}', ['7f8e9d0', 'index', 'untracked'], { isStash: true }),
      c('7f8e9d0', ['5a6b7c8']),
      c('5a6b7c8', ['1a2b3c4']),
      c('1a2b3c4', []),              // master root
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
//  Static render helpers (scenarios 1-15)
// ═══════════════════════════════════════════════════════════════

function renderStandardPanel(s, si) {
  if (s.data.length === 0) {
    return `<div class="panel" id="panel-${si}"><div class="panel-title"><span class="scenario-num">${s.num}</span> ${s.title}</div>
      <div style="font-size:13px;color:#4a90e2;font-weight:600;margin-bottom:4px;">${s.subtitle}</div>
      <div class="panel-desc">${s.desc}</div>
      <div class="empty-box"><div class="empty-icon">📭</div><div>No commits</div></div></div>`
  }
  const routes = routeLanes(s.data)
  const maxLane = Math.max(...routes.flatMap(r => r.preMergeLanes), 0)
  const colWidth = Math.max(130, getLaneX(maxLane) + 20)
  let rows = ''
  for (let i = 0; i < s.data.length; i++) {
    const commit = s.data[i]; const r = routes[i]
    const svg = getRowGraph(commit, i, s.data, routes)
    const badges = [`<span class="badge badge-lane"><span class="color-dot" style="background:${getLaneColor(r.lane)}"></span> L${r.lane}</span>`]
    if (i === 0) badges.push('<span class="badge badge-head">HEAD</span>')
    if (r.isBranch) badges.push('<span class="badge badge-branch">⊞ Branch</span>')
    if (r.isMerge) badges.push('<span class="badge badge-merge">⊷ Merge</span>')
    if (r.mergeLinks.length > 0) badges.push(`<span class="badge badge-link">↦ ${r.mergeLinks.length} link(s)</span>`)
    if (commit.parents.length === 0 && !commit.id.startsWith('stash')) {
      badges.push('<span class="badge badge-orphan">● Root</span>')
    }
    if (commit.id.startsWith('stash')) {
      const from = commit.parents[0] ? ` <span class="stash-from">← ${commit.parents[0]}</span>` : ''
      badges.push('<span class="badge badge-stash">📦 stash</span>')
      rows += `<tr${r.isMerge?' class="hl"':''}><td class="col-graph">${svg}</td><td><strong>${commit.id}</strong>${from}</td><td>${badges.join(' ')}</td></tr>`
    } else {
      rows += `<tr${r.isMerge?' class="hl"':''}><td class="col-graph">${svg}</td><td><strong>${commit.id}</strong></td><td>${badges.join(' ')}</td></tr>`
    }
  }
  return `<div class="panel" id="panel-${si}"><div class="panel-title"><span class="scenario-num">${s.num}</span> ${s.title}</div>
    <div class="panel-sub">${s.subtitle}</div><div class="panel-desc">${s.desc}</div>
    <div class="graph-container"><table class="graph-table"><thead><tr><th class="col-graph" style="width:${colWidth}px">Graph</th><th>Commit</th><th>Badges</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
}

// ═══════════════════════════════════════════════════════════════
//  HTML Template
// ═══════════════════════════════════════════════════════════════

function renderHTML() {
  const tabs = scenarios.map((s, i) =>
    `<button class="tab${i===0?' active':''}" onclick="switchTab(${i})">${s.num}. ${s.title}</button>`
  ).join('\n')

  const allPanels = scenarios.map((s, i) => renderStandardPanel(s, i)).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Commit Graph — 17 種情境</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#333}
  .header{background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);color:#fff;padding:20px 24px;text-align:center}
  .header h1{font-size:22px;font-weight:700}
  .header p{font-size:13px;color:#aab;margin-top:4px}
  .header .ver{display:inline-block;background:rgba(255,255,255,0.12);padding:2px 10px;border-radius:10px;font-size:11px;color:#9cf;margin-top:6px}

  .tab-bar{display:flex;flex-wrap:wrap;gap:2px;background:#fff;padding:8px 16px 0;border-bottom:2px solid #e0e0e0;position:sticky;top:0;z-index:100}
  .tab{padding:8px 14px;font-size:12px;font-weight:600;border:1px solid transparent;border-bottom:none;background:transparent;color:#888;cursor:pointer;border-radius:6px 6px 0 0;transition:all 0.15s;white-space:nowrap}
  .tab:hover{background:#f5f5f5;color:#555}
  .tab.active{background:#fff;color:#0f3460;border-color:#e0e0e0;border-bottom:2px solid #4a90e2;margin-bottom:-2px}

  .panel{display:none;padding:20px 24px;max-width:1100px;margin:0 auto}
  .panel.active{display:block}
  .panel-title{font-size:20px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px}
  .scenario-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#0f3460;color:#fff;font-size:13px;font-weight:700}
  .panel-sub{font-size:13px;color:#4a90e2;font-weight:600;margin-bottom:4px}
  .panel-desc{font-size:13px;color:#888;margin-bottom:16px;line-height:1.6}
  .panel-desc strong{color:#333}

  .graph-container{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow-x:auto}
  .graph-table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:500px}
  .graph-table thead{position:sticky;top:0;z-index:5}
  .graph-table th{background:#fafafa;border-bottom:1px solid #ddd;font-size:11px;color:#666;text-align:left;padding:6px 8px;font-weight:600}
  .graph-table td{padding:3px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;font-size:12px;height:28px}
  .graph-table tr:hover{background:#f7f9fa}
  .graph-table tr.hl{background:#e5edf8!important}
  .graph-table td.col-graph{padding:0!important;text-align:center;vertical-align:middle;line-height:0}
  .graph-table .graph-svg{width:100%;height:28px;display:block;vertical-align:top}

  .tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-left:4px;vertical-align:middle}
  .tag-master{background:#fff3e0;color:#e65100;border:1px solid #ffcc80}
  .tag-b01{background:#fff8e1;color:#f57f17;border:1px solid #ffe082}
  .tag-b02{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}
  .tag-b03{background:#fce4ec;color:#c62828;border:1px solid #ef9a9a}
  .tag-merge{background:#f3e5f5;color:#6a1b9a;border:1px solid #ce93d8}
  .tag-final{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}
  .tag-rls{background:#e0f7fa;color:#00695c;border:1px solid #80deea}

  .badge{display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;margin-right:3px}
  .badge-branch{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}
  .badge-merge{background:#fce4ec;color:#c62828;border:1px solid #ef9a9a}
  .badge-link{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}
  .badge-head{background:#fff3e0;color:#e65100;border:1px solid #ffcc80}
  .badge-orphan{background:#f3e5f5;color:#6a1b9a;border:1px solid #ce93d8}
  .badge-lane{background:#f5f5f5;color:#555;border:1px solid #ccc}
  .badge-stash{background:#fce4ec;color:#880e4f;border:1px solid #e91e63;font-weight:700}
  .stash-from{color:#e91e63;font-size:11px;font-weight:600;margin-left:4px}
  .color-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:2px;vertical-align:middle}

  .legend{display:flex;flex-wrap:wrap;gap:12px;max-width:1100px;margin:8px auto 0;padding:10px 24px;font-size:11px;color:#666}
  .legend-item{display:flex;align-items:center;gap:4px}
  .legend-dot{display:inline-block;width:10px;height:10px;border-radius:50%}

  .empty-box{background:#fff;border-radius:8px;padding:40px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
  .empty-icon{font-size:40px;margin-bottom:12px}

  .nav{display:flex;justify-content:center;gap:8px;margin:20px 0 40px}
  .nav-btn{padding:8px 18px;font-size:12px;font-weight:600;border:1px solid #d0d0d0;background:#fff;color:#555;border-radius:6px;cursor:pointer;transition:all 0.15s}
  .nav-btn:hover{background:#f0f4f8;border-color:#4a90e2;color:#2563eb}
  .nav-btn:disabled{opacity:0.4;cursor:default}
  .nav-btn .key-h{display:inline-block;background:#e8e8e8;padding:0 5px;border-radius:3px;font-size:10px;margin-left:4px;color:#888}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Commit Graph 線條展示</h1>
  <p>DAG 路線演算法 · 17 種情境</p>
  <span class="ver">routeLanes() + getRowGraph()</span>
</div>
<div class="tab-bar">${tabs}</div>
<div class="legend">
  <span class="legend-item"><span class="legend-dot" style="background:#f5a623"></span> L0</span>
  <span class="legend-item"><span class="legend-dot" style="background:#4a90e2"></span> L1</span>
  <span class="legend-item"><span class="legend-dot" style="background:#e056fd"></span> L2</span>
  <span class="legend-item"><span class="legend-dot" style="background:#28a745"></span> L3</span>
  <span class="legend-item"><span class="legend-dot" style="background:#cb2431"></span> L4</span>
  <span class="legend-item">⬤ 一般</span>
  <span class="legend-item">◯ HEAD</span>
  <span class="legend-item">✚ 合併</span>
</div>
<div id="panels">

${allPanels}

</div><!-- /panels -->

<div class="nav">
  <button class="nav-btn" id="prevBtn" onclick="switchTab(prev())" disabled>◀ 上一頁 <span class="key-h">←</span></button>
  <button class="nav-btn" id="nextBtn" onclick="switchTab(next())">下一頁 ▶ <span class="key-h">→</span></button>
</div>

<script>
// ─── Embedded graph-core.js ──────────────────────────────────
${graphCoreJs}

// ─── Tab switching ───────────────────────────────────────────
let current=0;
const total=${scenarios.length};
function switchTab(i){
  if(i<0||i>=total)return;current=i;
  document.querySelectorAll('.tab').forEach((b,n)=>b.classList.toggle('active',n===i));
  document.querySelectorAll('.panel').forEach((p,n)=>p.classList.toggle('active',n===i));
  document.getElementById('prevBtn').disabled=i===0;
  document.getElementById('nextBtn').disabled=i===total-1;
}
function prev(){return current-1}
function next(){return current+1}
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')switchTab(current-1);if(e.key==='ArrowRight')switchTab(current+1)});
<\/script>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════
//  Generate!
// ═══════════════════════════════════════════════════════════════

const outPath = resolve(__dirname, 'graph-lines-demo.html')
writeFileSync(outPath, renderHTML(), 'utf-8')
console.log(`✅ Generated: ${outPath}`)
console.log(`   ${scenarios.length} scenarios · ${scenarios.reduce((s, x) => s + x.data.length, 0)} commits`)
