import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Aantal per pagina",
    gotoPage: "Ga naar pagina",
    gotoFirstPage: "Eerste pagina",
    gotoPrevPage: "Vorige pagina",
    gotoNextPage: "Volgende pagina",
    gotoLastPage: "Laatste pagina",
    pageRange: "{from}–{to} van {total}",
    pageStatus: "Pagina {page} van {pages}",
    resultCount: "Totaal: {count}",
    loadMore: "Meer laden",
    loadedCount: "{count} van {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Geselecteerd: {count}",
    selectAll: "Alle rijen selecteren",
    selectRow: "{row} selecteren",
    selectionActions: "Acties voor selectie",
    selectAllResults: "Alle {total} selecteren",
    selectAllMatching: "Alle resultaten selecteren",
    allSelected: "Alles geselecteerd",
    clearSelection: "Selectie wissen",
    toggleActions: "Rijacties weergeven",
    showDetails: "Details voor {row} tonen",
    hideDetails: "Details voor {row} verbergen",
    closeDialog: "Sluit dialoog",
    showHiddenColumns: "Extra kolommen voor {row} tonen",
    hideHiddenColumns: "Extra kolommen voor {row} verbergen",
    resizeColumn: "Kolom aanpassen",
    search: "Zoeken",
    noData: "Geen gegevens",
    noResults: 'Geen resultaten voor "{query}"',
    loading: "Laden…",
    areYouSure: "Weet je het zeker?",
    networkError: "Fout bij het laden",
    booleanTrue: "Ja",
    booleanFalse: "Nee",
};

DataGrid.setLabels(labels);

export default labels;
