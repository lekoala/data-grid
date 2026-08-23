import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Aantal per pagina",
    gotoPage: "Ga naar pagina",
    gotoFirstPage: "Eerste pagina",
    gotoPrevPage: "Vorige pagina",
    gotoNextPage: "Volgende pagina",
    gotoLastPage: "Laatste pagina",
    pageStatus: "Pagina {page} van {pages}",
    resultCount: "Items: {count}",
    selectedCount: "Geselecteerd: {count}",
    selectAll: "Alle rijen selecteren",
    selectRow: "{row} selecteren",
    toggleActions: "Rijacties weergeven",
    showDetails: "Details voor {row} tonen",
    hideDetails: "Details voor {row} verbergen",
    resizeColumn: "Kolom aanpassen",
    noData: "Geen gegevens",
    loading: "Laden…",
    areYouSure: "Weet je het zeker?",
    networkError: "Fout bij het laden",
};

DataGrid.setLabels(labels);

export default labels;
