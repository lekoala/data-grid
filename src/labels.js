/**
 * Canonical default labels for DataGrid.
 * Single source of truth for the runtime defaults and the locale gate
 * (`scripts/check-locales.js`). Pure module: no DOM access on import.
 * @typedef {import("./data-grid.js").Labels} Labels
 */

/**
 * @type {Labels}
 */
export const DEFAULT_LABELS = {
    itemsPerPage: "Items per page",
    gotoPage: "Go to page",
    gotoFirstPage: "Go to first page",
    gotoPrevPage: "Go to previous page",
    gotoNextPage: "Go to next page",
    gotoLastPage: "Go to last page",
    pageRange: "{from}–{to} / {total}",
    pageStatus: "Page {page} of {pages}",
    resultCount: "{count} items",
    selectedCount: "{count} selected",
    selectAll: "Select all rows",
    selectRow: "Select {row}",
    toggleActions: "Toggle row actions",
    showDetails: "Show details for {row}",
    hideDetails: "Hide details for {row}",
    showHiddenColumns: "Show additional columns for {row}",
    hideHiddenColumns: "Hide additional columns for {row}",
    resizeColumn: "Resize column",
    search: "Search",
    noData: "No data",
    loading: "Loading…",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
    booleanTrue: "Yes",
    booleanFalse: "No",
};
