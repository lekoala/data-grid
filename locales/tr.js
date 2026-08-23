import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Sayfa başına öğe",
    gotoPage: "Sayfaya git",
    gotoFirstPage: "İlk sayfa",
    gotoPrevPage: "Önceki sayfa",
    gotoNextPage: "Sonraki sayfa",
    gotoLastPage: "Son sayfa",
    pageStatus: "Sayfa {page} / {pages}",
    resultCount: "Öğeler: {count}",
    selectedCount: "Seçilen: {count}",
    selectAll: "Tüm satırları seç",
    selectRow: "{row} seç",
    toggleActions: "Satır eylemlerini göster",
    showDetails: "{row} ayrıntılarını göster",
    hideDetails: "{row} ayrıntılarını gizle",
    resizeColumn: "Sütunu yeniden boyutlandır",
    noData: "Veri yok",
    loading: "Yükleniyor…",
    areYouSure: "Emin misiniz?",
    networkError: "Yükleme hatası",
};

DataGrid.setLabels(labels);

export default labels;
