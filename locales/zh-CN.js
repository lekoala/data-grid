import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "每页条数",
    gotoPage: "转到页面",
    gotoFirstPage: "第一页",
    gotoPrevPage: "上一页",
    gotoNextPage: "下一页",
    gotoLastPage: "最后一页",
    pageRange: "第 {from} – {to} 条，共 {total} 条",
    resultCount: "共 {count} 条",
    selectedCount: "已选 {count} 项",
    selectAll: "全选所有行",
    toggleActions: "显示行操作",
    resizeColumn: "调整列宽",
    noData: "暂无数据",
    loading: "加载中…",
    areYouSure: "确定吗？",
    networkError: "加载失败",
};

DataGrid.setLabels(labels);

export default labels;
