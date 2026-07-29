/**
 * Shared test helpers and selectors for WebGit Playwright tests.
 */

// ─── Sidebar ───────────────────────────────────────────────────────────
export const Sidebar = {
  changesItem: () => page.locator('.sidebar-item', { hasText: 'Changes' }),
  commitsItem: () => page.locator('.sidebar-item', { hasText: 'All Commits' }),
  branchList: () => page.locator('.sidebar-item span:has(🌿)'),
  currentBranch: () => page.locator('.sidebar-group-title:has-text("Branches") ~ .sidebar-item.selected'),
};

// ─── Toolbar ───────────────────────────────────────────────────────────
export const Toolbar = {
  fetchBtn: () => page.locator('.toolbar-btn', { hasText: 'Fetch' }),
  pullBtn: () => page.locator('.toolbar-btn', { hasText: 'Pull' }),
  pushBtn: () => page.locator('.toolbar-btn', { hasText: 'Push' }),
  newBranchBtn: () => page.locator('.toolbar-btn', { hasText: 'New Branch' }),
  statusLabel: () => page.locator('.toolbar div[style*="text-align: center"]'),
};

// ─── Changes View ──────────────────────────────────────────────────────
export const ChangesView = {
  title: () => page.locator('.changes-view-title'),
  badge: () => page.locator('.changes-view-badge'),
  stageBtn: () => page.locator('.changes-view-btn', { hasText: /^Stage$/ }).first(),
  stageAllBtn: () => page.locator('.changes-view-btn', { hasText: 'Stage All' }),
  unstageBtn: () => page.locator('.changes-view-btn', { hasText: 'Unstage' }),
  commitBtn: () => page.locator('.changes-view-btn', { hasText: 'Commit' }),
  unstagedGroup: () => page.locator('#group-unstaged'),
  stagedGroup: () => page.locator('#group-staged'),
  unstagedCount: () => page.locator('#group-unstaged .cv-group-count'),
  stagedCount: () => page.locator('#group-staged .cv-group-count'),
  fileItem: (fileName) => page.locator('.changes-file-item', { hasText: fileName }),
  unstagedFileItem: (fileName) => page.locator('#group-unstaged .changes-file-item', { hasText: fileName }),
  stagedFileItem: (fileName) => page.locator('#group-staged .changes-file-item', { hasText: fileName }),
  fileStatusBadges: () => page.locator('.cv-file-status'),
  diffPlaceholder: () => page.locator('.changes-view-diff-placeholder'),
};

// ─── Diff Viewer ───────────────────────────────────────────────────────
export const DiffViewer = {
  fileHeader: () => page.locator('.diff-file-header'),
  filePath: () => page.locator('.diff-file-path'),
  fileStatusBadge: () => page.locator('.file-status-badge'),
  inlineToggle: () => page.locator('.diff-mode-toggle span', { hasText: 'Inline' }),
  sideBySideToggle: () => page.locator('.diff-mode-toggle span', { hasText: 'Side-by-Side' }),
  hunkHeaders: () => page.locator('.diff-hunk-header'),
  hunkLines: () => page.locator('.diff-line'),
  addLines: () => page.locator('.diff-line.diff-add'),
  delLines: () => page.locator('.diff-line.diff-del'),
  contextLines: () => page.locator('.diff-line.diff-context'),
  sbsCells: () => page.locator('.diff-sbs-cell'),
  statsAdd: () => page.locator('.diff-stats-add'),
  statsDel: () => page.locator('.diff-stats-del'),
};

// ─── Commit Graph ──────────────────────────────────────────────────────
export const CommitGraph = {
  table: () => page.locator('.commit-table'),
  headers: () => page.locator('.commit-table th'),
  rows: () => page.locator('.commit-table tbody tr'),
  row: (index) => page.locator('.commit-table tbody tr').nth(index),
  selectedRow: () => page.locator('.commit-table tbody tr.selected'),
  graphCells: () => page.locator('.graph-col'),
  subjectCells: () => page.locator('.commit-table tbody tr td:nth-child(2)'),
  authorCells: () => page.locator('.commit-table tbody tr td:nth-child(3)'),
  hashCells: () => page.locator('.commit-table tbody tr td:nth-child(4)'),
  dateCells: () => page.locator('.commit-table tbody tr td:nth-child(5)'),
  svgGraph: () => page.locator('.graph-svg'),
  toggleRing: () => page.locator('.toggle-ring'),
};

// ─── Details Panel ─────────────────────────────────────────────────────
export const DetailsPanel = {
  metadata: () => page.locator('.commit-metadata'),
  emptyState: () => page.locator('.metadata-empty'),
  authorName: () => page.locator('.author-name'),
  shaValue: () => page.locator('.sha-value'),
  commitTitle: () => page.locator('.commit-msg-title'),
  commitBody: () => page.locator('.commit-msg-body'),
  tabs: () => page.locator('.details-tab'),
  changesTab: () => page.locator('.details-tab', { hasText: 'Changes' }),
  fileTreeTab: () => page.locator('.details-tab', { hasText: 'File Tree' }),
  historyTab: () => page.locator('.details-tab', { hasText: 'History' }),
  changesFileItem: () => page.locator('.changes-file-item'),
  fileChangeSummary: () => page.locator('.file-change-summary'),
  changesFilterAll: () => page.locator('.changes-filter', { hasText: 'All' }),
};

// ─── Health Check ──────────────────────────────────────────────────────
export const HealthCheck = {
  endpoint: '/health',
};
