import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elemente pro Seite",
    gotoPage: "Zur Seite",
    gotoFirstPage: "Erste Seite",
    gotoPrevPage: "Vorherige Seite",
    gotoNextPage: "Nächste Seite",
    gotoLastPage: "Letzte Seite",
    pageStatus: "Seite {page} von {pages}",
    resultCount: "Elemente: {count}",
    selectedCount: "Ausgewählt: {count}",
    selectAll: "Alle Zeilen auswählen",
    selectRow: "{row} auswählen",
    toggleActions: "Zeilenaktionen anzeigen",
    showDetails: "Details für {row} anzeigen",
    hideDetails: "Details für {row} ausblenden",
    showHiddenColumns: "Zusätzliche Spalten für {row} anzeigen",
    hideHiddenColumns: "Zusätzliche Spalten für {row} ausblenden",
    resizeColumn: "Spalte vergrößern",
    noData: "Keine Daten",
    loading: "Wird geladen…",
    areYouSure: "Sind Sie sicher?",
    networkError: "Fehler beim Laden",
};

DataGrid.setLabels(labels);

export default labels;
