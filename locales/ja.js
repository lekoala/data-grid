import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "1ページあたりの件数",
    gotoPage: "ページへ移動",
    gotoFirstPage: "最初のページ",
    gotoPrevPage: "前のページ",
    gotoNextPage: "次のページ",
    gotoLastPage: "最後のページ",
    pageRange: "{from} – {to} 件（全 {total} 件）",
    resultCount: "{count} 件",
    selectedCount: "選択中: {count} 件",
    selectAll: "すべての行を選択",
    selectRow: "{row} を選択",
    toggleActions: "行のアクションを表示",
    resizeColumn: "列の幅を変更",
    noData: "データがありません",
    loading: "読み込み中…",
    areYouSure: "よろしいですか？",
    networkError: "読み込みに失敗しました",
};

DataGrid.setLabels(labels);

export default labels;
