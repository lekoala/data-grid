import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementi per pagina",
    gotoPage: "Vai alla pagina",
    gotoFirstPage: "Prima pagina",
    gotoPrevPage: "Pagina precedente",
    gotoNextPage: "Pagina successiva",
    gotoLastPage: "Ultima pagina",
    pageStatus: "Pagina {page} di {pages}",
    resultCount: "Elementi: {count}",
    selectedCount: "Selezionati: {count}",
    selectAll: "Seleziona tutte le righe",
    selectRow: "Seleziona {row}",
    toggleActions: "Mostra le azioni della riga",
    showDetails: "Mostra i dettagli di {row}",
    hideDetails: "Nascondi i dettagli di {row}",
    showHiddenColumns: "Mostra colonne aggiuntive per {row}",
    hideHiddenColumns: "Nascondi colonne aggiuntive per {row}",
    resizeColumn: "Ridimensiona colonna",
    noData: "Nessun dato",
    loading: "Caricamento…",
    areYouSure: "Sei sicuro?",
    networkError: "Errore durante il caricamento",
    booleanTrue: "Sì",
    booleanFalse: "No",
};

DataGrid.setLabels(labels);

export default labels;
