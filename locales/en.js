import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Items per page",
    gotoPage: "Go to page",
    gotoFirstPage: "Go to first page",
    gotoPrevPage: "Go to previous page",
    gotoNextPage: "Go to next page",
    gotoLastPage: "Go to last page",
    pageRange: "{from} - {to} of {total} items",
    resultCount: "{count} items",
    selectedCount: "{count} selected",
    selectAll: "Select all rows",
    selectRow: "Select {row}",
    toggleActions: "Toggle row actions",
    resizeColumn: "Resize column",
    noData: "No data",
    loading: "Loading…",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
};

DataGrid.setLabels(labels);

export default labels;
