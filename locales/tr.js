import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Sayfa başına öğe",
    gotoPage: "Sayfaya git",
    gotoFirstPage: "İlk sayfa",
    gotoPrevPage: "Önceki sayfa",
    gotoNextPage: "Sonraki sayfa",
    gotoLastPage: "Son sayfa",
    pageRange: "{from} – {to} / toplam {total}",
    resultCount: "Öğeler: {count}",
    selectedCount: "Seçilen: {count}",
    selectAll: "Tüm satırları seç",
    toggleActions: "Satır eylemlerini göster",
    resizeColumn: "Sütunu yeniden boyutlandır",
    noData: "Veri yok",
    loading: "Yükleniyor…",
    areYouSure: "Emin misiniz?",
    networkError: "Yükleme hatası",
};

DataGrid.setLabels(labels);

export default labels;
