import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Item per halaman",
    gotoPage: "Buka halaman",
    gotoFirstPage: "Halaman pertama",
    gotoPrevPage: "Halaman sebelumnya",
    gotoNextPage: "Halaman berikutnya",
    gotoLastPage: "Halaman terakhir",
    pageRange: "{from}–{to} dari {total}",
    pageStatus: "Halaman {page} dari {pages}",
    resultCount: "Total: {count}",
    loadMore: "Muat lebih banyak",
    loadedCount: "{count} dari {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Dipilih: {count}",
    selectAll: "Pilih semua baris",
    selectRow: "Pilih {row}",
    selectionActions: "Tindakan pilihan",
    selectAllResults: "Pilih semua {total}",
    selectAllMatching: "Pilih semua hasil",
    allSelected: "Semua dipilih",
    clearSelection: "Hapus pilihan",
    toggleActions: "Tampilkan aksi baris",
    showDetails: "Tampilkan detail {row}",
    hideDetails: "Sembunyikan detail {row}",
    closeDialog: "Tutup dialog",
    showHiddenColumns: "Tampilkan kolom tambahan untuk {row}",
    hideHiddenColumns: "Sembunyikan kolom tambahan untuk {row}",
    resizeColumn: "Ubah ukuran kolom",
    search: "Cari",
    noData: "Tidak ada data",
    noResults: 'Tidak ada hasil untuk "{query}"',
    loading: "Memuat…",
    areYouSure: "Apakah Anda yakin?",
    networkError: "Gagal memuat",
    booleanTrue: "Ya",
    booleanFalse: "Tidak",
};

DataGrid.setLabels(labels);

export default labels;
