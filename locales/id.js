import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Item per halaman",
    gotoPage: "Buka halaman",
    gotoFirstPage: "Halaman pertama",
    gotoPrevPage: "Halaman sebelumnya",
    gotoNextPage: "Halaman berikutnya",
    gotoLastPage: "Halaman terakhir",
    pageRange: "{from} – {to} dari {total}",
    resultCount: "Item: {count}",
    selectedCount: "Dipilih: {count}",
    selectAll: "Pilih semua baris",
    toggleActions: "Tampilkan aksi baris",
    resizeColumn: "Ubah ukuran kolom",
    noData: "Tidak ada data",
    loading: "Memuat…",
    areYouSure: "Apakah Anda yakin?",
    networkError: "Gagal memuat",
};

DataGrid.setLabels(labels);

export default labels;
