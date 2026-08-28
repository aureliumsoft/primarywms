# System Test Bug Report — Sortly Parity Audit

**Last cycle:** 2026-08-28 (cycle 2)  
**Reference:** `docs/SORTLY-LIVE-UI.md`, `docs/SORTLY-INPUTS.md`, `docs/REQUIREMENTS.md`

## Summary

| Priority | Open | Fixed this cycle |
|----------|------|------------------|
| P0       | 0    | 2                |
| P1       | 0    | 4                |
| P2       | 1    | 6                |

## Fixed (cycle 2)

| ID | Priority | Issue | Fix |
|----|----------|-------|-----|
| AUD-001 | P0 | Bulk move could fail mid-batch (folders vs items) | `bulkMoveSelection` validates all moves first; single API `move-selection`; skips items inside moved folders |
| AUD-002 | P0 | Bulk delete lacked pre-validation | `bulkDeleteItems` validates folder access before deleting |
| AUD-004 | P1 | Folder custom fields in bulk edit not saved | `bulkEditFolders` + API + `BulkEditDrawer` send `customValues` |
| AUD-008 | P1 | Single-item delete ignored reason/note | `DELETE /api/v1/items/[id]` + `DeleteItemModal` aligned with folder delete |
| AUD-009 | P1 | Mixed selection skipped folder alerts silently | Toast when folders also selected with items |
| AUD-011 | P2 | `CatalogTableView` used `confirm`/`prompt`/`alert` | Removed fallbacks; toast when handler missing |
| AUD-014 | P2 | Advanced search duplicate “Select all items” | Hidden when bulk bar visible |
| AUD-015 | P2 | Bulk edit tag mode misleading for folders | Folder-only hint: tags replace existing |
| AUD-016 | P2 | Bulk qty N+1 API calls | Single bulk `edit` with `quantityDelta` |
| AUD-017 | P2 | Item activity history missing Qty Moved | Column + `qtyMoved` in report rows |
| AUD-018 | P2 | Catalog sort missing Sortly options | Added Min Level, Price, Description |
| AUD-003 | P1 | Bulk delete reason/note (cycle 1) | Confirmed wired |
| AUD-006/007 | P1 | Advanced search bulk bar (cycle 1) | Confirmed wired |
| AUD-010 | P2 | Negative bulk qty (cycle 1) | Confirmed wired |
| AUD-012/013 | P2 | Menu variants (cycle 1) | Confirmed wired |
| AUD-019 | P2 | Import redirect (cycle 1) | Confirmed wired |

## Open

| ID | Priority | Issue | Notes |
|----|----------|-------|-------|
| AUD-020 | P2 | `ImportWizard` modal layout prop unused | Low impact; wizard works full-page |

## Verification checklist

- [x] `npx tsc --noEmit` (apps/web)
- [ ] `pnpm exec tsx apps/web/scripts/test-workflows-lib.ts` (requires DB + active user)
- [ ] Manual: bulk move items + folders mixed
- [ ] Manual: bulk edit folder custom fields
- [ ] Manual: delete item with reason/note
- [ ] Manual: `/import`, folder card/header menus, bulk bar order

## Bulk bar order (Sortly §13.2)

Edit → Update Quantity → Move → Export → Restock → Create Label → Set Alert → Clone → Add to… → Delete (+ icon shortcuts, **All**, **Select all matching**)
