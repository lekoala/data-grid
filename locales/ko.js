import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "페이지당 항목 수",
    gotoPage: "페이지 이동",
    gotoFirstPage: "첫 페이지",
    gotoPrevPage: "이전 페이지",
    gotoNextPage: "다음 페이지",
    gotoLastPage: "마지막 페이지",
    pageStatus: "{page} / {pages} 페이지",
    resultCount: "항목: {count}",
    selectedCount: "선택됨: {count}",
    selectAll: "모든 행 선택",
    selectRow: "{row} 선택",
    toggleActions: "행 작업 표시",
    showDetails: "{row} 세부 정보 표시",
    hideDetails: "{row} 세부 정보 숨기기",
    resizeColumn: "열 너비 조정",
    noData: "데이터 없음",
    loading: "로딩 중…",
    areYouSure: "확실합니까?",
    networkError: "불러오기 실패",
};

DataGrid.setLabels(labels);

export default labels;
