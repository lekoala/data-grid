import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Item per halaman",
    gotoPage: "Buka halaman",
    gotoFirstPage: "Halaman pertama",
    gotoPrevPage: "Halaman sebelumnya",
    gotoNextPage: "Halaman berikutnya",
    gotoLastPage: "Halaman terakhir",
    pageStatus: "Halaman {page} dari {pages}",
    resultCount: "Item: {count}",
    selectedCount: "Dipilih: {count}",
    selectAll: "Pilih semua baris",
    selectRow: "Pilih {row}",
    toggleActions: "Tampilkan aksi baris",
    showDetails: "Tampilkan detail {row}",
    hideDetails: "Sembunyikan detail {row}",
    showHiddenColumns: "Tampilkan kolom tambahan untuk {row}",
    hideHiddenColumns: "Sembunyikan kolom tambahan untuk {row}",
    resizeColumn: "Ubah ukuran kolom",
    noData: "Tidak ada data",
    loading: "Memuat…",
    areYouSure: "Apakah Anda yakin?",
    networkError: "Gagal memuat",
    booleanTrue: "Ya",
    booleanFalse: "Tidak",
};

DataGrid.setLabels(labels);

export default labels;
