// --- 1. Resizable Sidebar (Vertical Drag) ---
const sidebar = document.getElementById('sidebar');
const resizerV = document.getElementById('resizerV');
let isDraggingV = false;

resizerV.addEventListener('mousedown', (e) => {
  isDraggingV = true;
  resizerV.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

// --- 2. Resizable Details Panel (Horizontal Drag) ---
const detailsPanel = document.getElementById('detailsPanel');
const resizerH = document.getElementById('resizerH');
let isDraggingH = false;
let startY = 0;
let startHeight = 0;

resizerH.addEventListener('mousedown', (e) => {
  isDraggingH = true;
  startY = e.clientY;
  startHeight = detailsPanel.offsetHeight;
  resizerH.classList.add('dragging');
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
});

// Global Mouse Move & Up Handler
document.addEventListener('mousemove', (e) => {
  if (isDraggingV) {
    const newWidth = e.clientX;
    if (newWidth >= 140 && newWidth <= 450) {
      sidebar.style.width = newWidth + 'px';
    }
  }

  if (isDraggingH) {
    const deltaY = startY - e.clientY;
    const newHeight = startHeight + deltaY;
    if (newHeight >= 80) {
      detailsPanel.style.height = newHeight + 'px';
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingV) {
    isDraggingV = false;
    resizerV.classList.remove('dragging');
  }
  if (isDraggingH) {
    isDraggingH = false;
    resizerH.classList.remove('dragging');
  }
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// --- CV Group Resizer (Unstaged / Staged vertical split) ---
var cvResizerH = document.getElementById('cvResizerH');
var isDraggingCVH = false;
var cvStartY = 0;
var cvStartHeight = 0;

if (cvResizerH) {
  cvResizerH.addEventListener('mousedown', function(e) {
    isDraggingCVH = true;
    cvStartY = e.clientY;
    var staged = document.getElementById('group-staged');
    cvStartHeight = staged.offsetHeight;
    cvResizerH.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
}

document.addEventListener('mousemove', function(e) {
  if (isDraggingCVH) {
    var deltaY = cvStartY - e.clientY;
    var newHeight = cvStartHeight + deltaY;
    if (newHeight >= 60) {
      document.getElementById('group-staged').style.height = newHeight + 'px';
    }
  }
});

document.addEventListener('mouseup', function() {
  if (isDraggingCVH) {
    isDraggingCVH = false;
    if (cvResizerH) cvResizerH.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- 3. Collapsible Commit Graph Branch ---
function toggleBranch(td, groupClass, extraLineClass) {
  const rows = document.querySelectorAll('.' + groupClass);
  const chevron = td.querySelector('.toggle-chevron');
  const branchLine = td.querySelector('.toggle-branch-line');
  const extraLines = extraLineClass ? document.querySelectorAll('.' + extraLineClass) : [];
  let isCollapsed = td.getAttribute('data-collapsed') === 'true';

  if (isCollapsed) {
    rows.forEach(row => row.classList.remove('collapsed-child'));
    if (chevron) chevron.setAttribute('d', 'M 22 12 L 25 17 L 28 12');
    if (branchLine) branchLine.style.opacity = '1';
    extraLines.forEach(el => el.style.opacity = '1');
    td.setAttribute('data-collapsed', 'false');
  } else {
    rows.forEach(row => row.classList.add('collapsed-child'));
    if (chevron) chevron.setAttribute('d', 'M 23 11 L 28 14 L 23 17');
    if (branchLine) branchLine.style.opacity = '0';
    extraLines.forEach(el => el.style.opacity = '0');
    td.setAttribute('data-collapsed', 'true');
  }
}

// --- 4. Expandable Changed Files ---
function toggleFileDiff(header) {
  const wrapper = header.closest('.file-diff-wrapper');
  if (!wrapper) return;
  const content = wrapper.querySelector('.file-diff-content');
  const icon = header.querySelector('.file-expand-icon');

  if (content.classList.contains('visible')) {
    content.classList.remove('visible');
    if (icon) icon.classList.remove('expanded');
  } else {
    content.classList.add('visible');
    if (icon) icon.classList.add('expanded');
  }
}

function expandAllFiles() {
  const contents = document.querySelectorAll('.file-diff-content');
  const icons = document.querySelectorAll('.file-expand-icon');
  const allVisible = Array.from(contents).every(c => c.classList.contains('visible'));

  contents.forEach(c => {
    if (allVisible) {
      c.classList.remove('visible');
    } else {
      c.classList.add('visible');
    }
  });
  icons.forEach(icon => {
    if (allVisible) {
      icon.classList.remove('expanded');
    } else {
      icon.classList.add('expanded');
    }
  });
}

// --- 5. Details Tab Switching ---
function switchDetailsTab(tabEl, tabName) {
  document.querySelectorAll('.details-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  document.querySelectorAll('.details-content').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + tabName);
  panel.style.display = (tabName === 'changes' || tabName === 'filetree') ? 'flex' : 'block';
}

// --- 6. Changes Tab Filter ---
function setChangesFilter(filterEl, filterType) {
  document.querySelectorAll('.changes-filter').forEach(f => f.classList.remove('active'));
  filterEl.classList.add('active');

  const allItems = document.querySelectorAll('#panel-changes .changes-file-item');

  allItems.forEach(item => {
    if (filterType === 'all') {
      item.style.display = '';
    } else {
      item.style.display = item.dataset.changeType === filterType ? '' : 'none';
    }
  });

  // Re-expand all folders when showing all
  if (filterType === 'all') {
    document.querySelectorAll('#panel-changes [data-path] .tree-toggle').forEach(t => {
      const folderEl = t.closest('[data-path]');
      if (folderEl) expandChangesNode(folderEl);
    });
  }
}

// --- 7. Changes Tree Node Toggle (expand/collapse) ---
function toggleChangesTreeNode(el) {
  const container = el.closest('div').querySelector('.changes-tree-children');
  if (!container) return;
  const toggle = el.querySelector('.tree-toggle');
  const isCollapsed = container.classList.contains('collapsed');

  if (isCollapsed) {
    container.classList.remove('collapsed');
    toggle.classList.add('expanded');
  } else {
    container.classList.add('collapsed');
    toggle.classList.remove('expanded');
  }
}

function expandChangesNode(el) {
  const container = el.closest('div').querySelector('.changes-tree-children');
  if (!container) return;
  const toggle = el.querySelector('.tree-toggle');
  container.classList.remove('collapsed');
  if (toggle) toggle.classList.add('expanded');
}

// --- 8. Changes File Selection (click file → show diff in right panel) ---
function selectChangesFile(el, diffTargetId) {
  // Deselect all files
  document.querySelectorAll('#panel-changes .changes-file-item').forEach(i => i.classList.remove('selected'));
  // Select this file
  el.classList.add('selected');

  // Load diff content into right panel
  const diffPanel = document.getElementById('changesDiffPanel');
  const template = document.getElementById('diff-template-' + diffTargetId);
  if (template) {
    diffPanel.innerHTML = template.innerHTML;
  }
}

// --- 9. Changes Tab Horizontal Resizer (left/right split) ---
const changesTreePanel = document.getElementById('changesTreePanel');
const changesResizerH = document.getElementById('changesResizerH');
let isDraggingChangesH = false;

changesResizerH.addEventListener('mousedown', (e) => {
  isDraggingChangesH = true;
  changesResizerH.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingChangesH) {
    const newWidth = e.clientX - changesTreePanel.getBoundingClientRect().left;
    if (newWidth >= 140 && newWidth <= 500) {
      changesTreePanel.style.width = newWidth + 'px';
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingChangesH) {
    isDraggingChangesH = false;
    changesResizerH.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- 10. File Tree Folder Toggle (for old File Tree Tab - kept for compat) ---
function toggleFolder(folderLabel) {
  const folder = folderLabel.closest('.ft-folder');
  const children = Array.from(folder.children).filter(c => c !== folderLabel);
  const isCollapsed = folderLabel.textContent.trim().startsWith('▸');

  children.forEach(child => {
    child.style.display = isCollapsed ? '' : 'none';
  });

  folderLabel.innerHTML = folderLabel.innerHTML.replace(
    isCollapsed ? '▸' : '▾',
    isCollapsed ? '▾' : '▸'
  );
}

// ========== New File Tree Tab (All Files / Code Viewer) ==========

// --- 11. File Tree Node Toggle (expand/collapse) ---
function toggleFileTreeFolder(el) {
  const container = el.closest('div').querySelector('.changes-tree-children');
  if (!container) return;
  const toggle = el.querySelector('.tree-toggle');
  const isCollapsed = container.classList.contains('collapsed');

  if (isCollapsed) {
    container.classList.remove('collapsed');
    toggle.classList.add('expanded');
  } else {
    container.classList.add('collapsed');
    toggle.classList.remove('expanded');
  }
}

function expandFileTreeFolder(el) {
  const container = el.closest('div').querySelector('.changes-tree-children');
  if (!container) return;
  const toggle = el.querySelector('.tree-toggle');
  container.classList.remove('collapsed');
  if (toggle) toggle.classList.add('expanded');
}

// --- 12. File Tree File Selection (click file → show content in right panel) ---
function selectFileTreeFile(el, contentId) {
  // Deselect all files in file tree
  document.querySelectorAll('#panel-filetree .ft-file-item').forEach(i => i.classList.remove('selected'));
  // Select this file
  el.classList.add('selected');

  // Load file content into right panel
  const contentPanel = document.getElementById('filetreeContentPanel');
  const template = document.getElementById('ft-content-' + contentId);
  if (template) {
    contentPanel.innerHTML = template.innerHTML;
  }
}

// --- 13. File Tree Horizontal Resizer ---
const filetreeTreePanel = document.getElementById('filetreeTreePanel');
const filetreeResizerH = document.getElementById('filetreeResizerH');
let isDraggingFileTreeH = false;

filetreeResizerH.addEventListener('mousedown', (e) => {
  isDraggingFileTreeH = true;
  filetreeResizerH.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingFileTreeH) {
    const rect = filetreeTreePanel.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;
    if (newWidth >= 140 && newWidth <= 500) {
      filetreeTreePanel.style.width = newWidth + 'px';
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingFileTreeH) {
    isDraggingFileTreeH = false;
    filetreeResizerH.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- 14. File Tree Filter ---
function filterFileTree(query) {
  const q = query.toLowerCase().trim();
  const allItems = document.querySelectorAll('#panel-filetree .ft-file-item');
  const allFolders = document.querySelectorAll('#panel-filetree [data-ft-path]');

  if (!q) {
    // Show everything, re-expand
    allItems.forEach(item => { item.style.display = ''; });
    allFolders.forEach(f => {
      if (f.dataset.ftPath !== 'root') expandFileTreeFolder(f);
    });
    return;
  }

  // Show only matching files, hide non-matching
  allItems.forEach(item => {
    const path = (item.dataset.ftPath || '').toLowerCase();
    item.style.display = path.includes(q) ? '' : 'none';
  });

  // Show folders that have visible descendants
  allFolders.forEach(f => {
    if (f.dataset.ftPath === 'root') return;
    const childrenContainer = f.closest('div').querySelector('.changes-tree-children');
    if (!childrenContainer) { f.style.display = 'none'; return; }
    const hasVisible = Array.from(childrenContainer.querySelectorAll('.ft-file-item')).some(
      i => i.style.display !== 'none'
    );
    f.style.display = hasVisible ? '' : 'none';
    if (hasVisible) expandFileTreeFolder(f);
  });
}

// ========== Changes View (Working Directory) Business Logic ==========

// --- 15. Sidebar Mode Switch: Changes vs All Commits ---
function switchSidebarMode(mode) {
  const elChanges = document.getElementById('sidebarChanges');
  const elCommits = document.getElementById('sidebarCommits');
  const changesView = document.getElementById('changesView');
  const commitList = document.querySelector('.commit-list-container');

  if (mode === 'changes') {
    elChanges.classList.add('selected');
    elCommits.classList.remove('selected');
    changesView.style.display = 'flex';
    commitList.style.display = 'none';
    updateActionButtons();
    // Reset details panel to Commit tab
    const commitTab = document.querySelector('.details-tab');
    if (commitTab) switchDetailsTab(commitTab, 'commit');
  } else {
    elCommits.classList.add('selected');
    elChanges.classList.remove('selected');
    changesView.style.display = 'none';
    commitList.style.display = '';
  }
}

// --- 18. Select File in Changes View (show diff in right panel) ---
function selectChangesViewFile(el, diffId) {
  // Deselect all files
  document.querySelectorAll('.changes-view-files .changes-file-item').forEach(function(f) { f.classList.remove('selected'); });
  // Select this file
  el.classList.add('selected');

  // Load diff content into right panel
  var diffPanel = document.getElementById('changesViewDiff');
  var template = document.getElementById('cv-diff-' + diffId);
  if (template) {
    diffPanel.innerHTML = template.innerHTML;
  } else {
    // Placeholder diff for demo
    var pathSpan = el.querySelector('span:nth-child(3)');
    var path = pathSpan ? pathSpan.textContent : 'file';
    var status = el.getAttribute('data-change-type');
    var statusLabel = status === 'modified' ? '修改' : status === 'added' ? '新增' : status === 'deleted' ? '刪除' : status === 'renamed' ? '移動' : '修改';
    diffPanel.innerHTML = '<div class="cv-diff-content"><div class="diff-file-header"><span class="file-status-badge file-status-modified">' +
      statusLabel + '</span><span>' + path + '</span></div><div class="diff-hunk-header">@@ -1,5 +1,8 @@</div>' +
      '<div class="diff-line diff-context"><span class="diff-line-number">1</span>  /* file preview */</div>' +
      '<div class="diff-line diff-context"><span class="diff-line-number">2</span>  // Changes view mode</div>' +
      '<div class="diff-line diff-del"><span class="diff-line-number">3</span>-old line content</div>' +
      '<div class="diff-line diff-add"><span class="diff-line-number">3</span>+new line content</div>' +
      '<div class="diff-line diff-context"><span class="diff-line-number">4</span>  // more context</div></div>';
  }
}

// --- 19. Disable toolbar Stage/Unstage (checkboxes removed) ---
function updateActionButtons() {
  var btnStage = document.getElementById('btnStage');
  var btnUnstage = document.getElementById('btnUnstage');
  if (btnStage) btnStage.disabled = true;
  if (btnUnstage) btnUnstage.disabled = true;
}

// --- 20. Stage Selected → delegates to header button ---
function stageSelected() {
  stageGroup('unstaged');
}

// --- 21. Unstage Selected → delegates to header button ---
function unstageSelected() {
  unstageGroup('staged');
}

// --- 22. Stage All → delegates to header button ---
function stageAll() {
  stageGroup('unstaged');
}

// --- 23. Update Group Counts ---
function updateCounts() {
  var unstagedCount = document.querySelectorAll('#body-unstaged .changes-file-item').length;
  var stagedCount = document.querySelectorAll('#body-staged .changes-file-item').length;

  document.getElementById('count-unstaged').textContent = unstagedCount;
  document.getElementById('count-staged').textContent = stagedCount;

  var total = unstagedCount + stagedCount;
  var badge = document.querySelector('.changes-view-badge');
  if (badge) badge.textContent = total + ' files changed';
}

// --- 24. Commit Changes ---
function commitChanges() {
  var stagedCount = document.querySelectorAll('#body-staged .changes-file-item').length;
  if (stagedCount === 0) {
    alert('Please stage changes before committing.');
    return;
  }

  const msg = prompt('Commit message:', '');
  if (msg === null) return; // cancelled
  if (msg.trim() === '') {
    alert('Commit message cannot be empty.');
    return;
  }

  // Simulate commit: clear staged files
  const stagedBody = document.getElementById('body-staged');
  stagedBody.innerHTML = '';
  updateCounts();
  updateActionButtons();

  // Show feedback
  const diffPanel = document.getElementById('changesViewDiff');
  diffPanel.innerHTML = '<div class="changes-view-diff-placeholder" style="color:#28a745;">✔ Committed ' + stagedCount + ' file(s): ' + msg + '</div>';
}

// --- 25. Graph Panel Resizer ---
const graphResizer = document.getElementById('graphResizer');
const graphPanel = document.getElementById('graphPanel');
let isDraggingGraph = false;
let graphStartX = 0;
let graphStartWidth = 0;

if (graphResizer) {
  graphResizer.addEventListener('mousedown', function(e) {
    isDraggingGraph = true;
    graphStartX = e.clientX;
    graphStartWidth = graphPanel.offsetWidth;
    graphResizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
}

document.addEventListener('mousemove', function(e) {
  if (isDraggingGraph) {
    var deltaX = graphStartX - e.clientX;
    var newWidth = graphStartWidth + deltaX;
    if (newWidth >= 140 && newWidth <= 500) {
      graphPanel.style.width = newWidth + 'px';
    }
  }
});

document.addEventListener('mouseup', function() {
  if (isDraggingGraph) {
    isDraggingGraph = false;
    if (graphResizer) graphResizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- 26. Draw Commit Graph Overview (Lane Routing) ---
//
//  Logic:
//    1) Lane assignment: trunk=lane0, branch=lanes 1..n
//    2) Track active lanes per row (a lane is active from first to last occurrence)
//    3) Draw vertical through-lines for each active lane in its own color
//    4) Branch-out: curve from trunk to new lane; Merge-in: curve back to trunk
//    5) Each lane has ONE consistent color throughout
//
function drawGraphOverview() {
  var svg = document.getElementById('graphOverviewSvg');
  if (!svg) return;

  var rows = document.querySelectorAll('.commit-table tbody tr');
  var commits = Array.from(rows).map(function(row) {
    return {
      hash: (row.cells[3] || {}).textContent || '',
      subject: (row.cells[1] || {}).textContent || '',
    };
  });

  if (commits.length === 0) return;

  var laneColors = ['#f5a623', '#4a90e2', '#e056fd', '#28a745', '#cb2431'];
  var nodeHeight = 28;
  var totalHeight = commits.length * nodeHeight + 40;

  svg.setAttribute('viewBox', '0 0 220 ' + totalHeight);

  // ── 1. Lane assignment ──
  //  Static data: row 0-3 lane0; row 4-6 branch (lane1); row 7-9 lane0;
  //  row 10-11 branch (lane2); row 12-14 lane0.
  var laneOf = commits.map(function(c, idx) {
    if (idx >= 4 && idx <= 6) return 1;  // first branch
    if (idx >= 10 && idx <= 11) return 2; // second branch
    return 0;                             // trunk
  });

  // ── 2. Active lanes per row ──
  //  A lane is active from its first occurrence to its last.
  var firstIdx = {}, lastIdx = {};
  laneOf.forEach(function(lane, idx) {
    if (firstIdx[lane] === undefined) firstIdx[lane] = idx;
    lastIdx[lane] = idx;
  });
  // Lane 0 (trunk) spans all rows
  firstIdx[0] = 0;
  lastIdx[0] = commits.length - 1;

  var maxLane = Math.max.apply(null, Object.keys(firstIdx).map(Number));

  // Lane X positions (consistent)
  var laneX = {};
  for (var l = 0; l <= maxLane; l++) {
    laneX[l] = 30 + l * 60;
  }

  // ── 3. Build nodes ──
  var nodes = commits.map(function(c, idx) {
    var lane = laneOf[idx];
    return {
      idx: idx,
      x: laneX[lane],
      y: 20 + idx * nodeHeight + nodeHeight / 2,
      lane: lane,
      color: laneColors[lane % laneColors.length],
    };
  });

  // ── 4. Draw segments (top→bottom, row by row) ──
  for (var i = 0; i < commits.length; i++) {
    var node = nodes[i];
    var isLast = i === commits.length - 1;

    // Determine active lanes at this row
    var active = [];
    for (var l = 0; l <= maxLane; l++) {
      if (i >= firstIdx[l] && i <= lastIdx[l]) {
        active.push(l);
      }
    }

    // Draw downward segment for each active lane that continues
    active.forEach(function(lane) {
      var continues = !isLast && (i + 1) >= firstIdx[lane] && (i + 1) <= lastIdx[lane];
      if (!continues) return;

      var x = laneX[lane];
      var color = laneColors[lane % laneColors.length];
      var nextY = 20 + (i + 1) * nodeHeight + nodeHeight / 2;

      var isNewLane = i === firstIdx[lane] && lane !== 0;
      var isEndLane = i === lastIdx[lane] && lane !== 0;

      if (isNewLane) {
        // Branch OUT: curve from trunk to new lane
        var trunkX = laneX[0];
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M ' + trunkX + ' ' + node.y + ' Q ' + ((trunkX + x) / 2) + ' ' + node.y + ' ' + x + ' ' + nextY);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);
      } else if (isEndLane) {
        // Merge IN: curve from branch lane back to trunk
        var trunkX = laneX[0];
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M ' + x + ' ' + node.y + ' Q ' + ((trunkX + x) / 2) + ' ' + nextY + ' ' + trunkX + ' ' + nextY);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);
      } else {
        // Normal vertical through-line
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x); line.setAttribute('y1', node.y);
        line.setAttribute('x2', x); line.setAttribute('y2', nextY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
      }
    });
  }

  // ── 5. No circles — lines only
}

// Initialize: action buttons start disabled + draw graph
document.addEventListener('DOMContentLoaded', function() {
  updateActionButtons();
  drawGraphOverview();
});
