import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "每页条数",
    gotoPage: "转到页面",
    gotoFirstPage: "第一页",
    gotoPrevPage: "上一页",
    gotoNextPage: "下一页",
    gotoLastPage: "最后一页",
    pageStatus: "第 {page} 页，共 {pages} 页",
    resultCount: "共 {count} 条",
    selectedCount: "已选 {count} 项",
    selectAll: "全选所有行",
    selectRow: "选择 {row}",
    toggleActions: "显示行操作",
    showDetails: "显示 {row} 的详细信息",
    hideDetails: "隐藏 {row} 的详细信息",
    showHiddenColumns: "显示 {row} 的其他列",
    hideHiddenColumns: "隐藏 {row} 的其他列",
    resizeColumn: "调整列宽",
    noData: "暂无数据",
    loading: "加载中…",
    areYouSure: "确定吗？",
    networkError: "加载失败",
    booleanTrue: "是",
    booleanFalse: "否",
};

DataGrid.setLabels(labels);

export default labels;
