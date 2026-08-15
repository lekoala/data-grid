import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Aantal per pagina",
    gotoPage: "Ga naar pagina",
    gotoFirstPage: "Eerste pagina",
    gotoPrevPage: "Vorige pagina",
    gotoNextPage: "Volgende pagina",
    gotoLastPage: "Laatste pagina",
    pageRange: "{from} – {to} van {total}",
    resultCount: "Items: {count}",
    selectedCount: "Geselecteerd: {count}",
    selectAll: "Alle rijen selecteren",
    selectRow: "{row} selecteren",
    toggleActions: "Rijacties weergeven",
    resizeColumn: "Kolom aanpassen",
    noData: "Geen gegevens",
    loading: "Laden…",
    areYouSure: "Weet je het zeker?",
    networkError: "Fout bij het laden",
};

DataGrid.setLabels(labels);

export default labels;
