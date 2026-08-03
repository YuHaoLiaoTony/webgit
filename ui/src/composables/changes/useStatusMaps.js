/**
 * Pure status lookup tables for ChangesView.
 * Extracted from ChangesView.vue — Phase 1 refactor.
 */
export function useStatusMaps() {
  const statusLabelMap = { added: 'C', modified: 'U', deleted: 'D', renamed: 'M', staged: 'A' }
  const statusCssMap = {
    added: 'cv-status-added',
    modified: 'cv-status-modified',
    deleted: 'cv-status-deleted',
    renamed: 'cv-status-renamed',
    staged: 'cv-status-added',
  }
  const statusActionLabel = {
    added: 'Created',
    modified: 'Updated',
    deleted: 'Deleted',
    renamed: 'Moved',
    staged: 'Added',
  }

  return { statusLabelMap, statusCssMap, statusActionLabel }
}
