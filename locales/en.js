import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Items per page",
    gotoPage: "Go to page",
    gotoFirstPage: "Go to first page",
    gotoPrevPage: "Go to previous page",
    gotoNextPage: "Go to next page",
    gotoLastPage: "Go to last page",
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
    noData: "No data",
    loading: "Loading…",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
    booleanTrue: "Yes",
    booleanFalse: "No",
};

DataGrid.setLabels(labels);

export default labels;
