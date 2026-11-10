import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Sayfa başına öğe",
    gotoPage: "Sayfaya git",
    gotoFirstPage: "İlk sayfa",
    gotoPrevPage: "Önceki sayfa",
    gotoNextPage: "Sonraki sayfa",
    gotoLastPage: "Son sayfa",
    pageRange: "{from}–{to} / {total}",
    pageStatus: "Sayfa {page} / {pages}",
    resultCount: "Toplam: {count}",
    loadMore: "Daha fazla yükle",
    loadedCount: "{count} / {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Seçilen: {count}",
    selectAll: "Tüm satırları seç",
    selectRow: "{row} seç",
    selectionActions: "Seçim işlemleri",
    selectAllResults: "{total} sonucun tümünü seç",
    selectAllMatching: "Eşleşenlerin tümünü seç",
    allSelected: "Tümü seçildi",
    clearSelection: "Seçimi temizle",
    toggleActions: "Satır eylemlerini göster",
    showDetails: "{row} ayrıntılarını göster",
    hideDetails: "{row} ayrıntılarını gizle",
    closeDialog: "Pencereyi kapat",
    showHiddenColumns: "{row} için ek sütunları göster",
    hideHiddenColumns: "{row} için ek sütunları gizle",
    resizeColumn: "Sütunu yeniden boyutlandır",
    search: "Ara",
    noData: "Veri yok",
    noResults: '"{query}" için sonuç yok',
    loading: "Yükleniyor…",
    areYouSure: "Emin misiniz?",
    networkError: "Yükleme hatası",
    booleanTrue: "Evet",
    booleanFalse: "Hayır",
};

DataGrid.setLabels(labels);

export default labels;
