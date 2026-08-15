import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elemente pro Seite",
    gotoPage: "Zur Seite",
    gotoFirstPage: "Erste Seite",
    gotoPrevPage: "Vorherige Seite",
    gotoNextPage: "Nächste Seite",
    gotoLastPage: "Letzte Seite",
    pageRange: "{from} – {to} von {total}",
    resultCount: "Elemente: {count}",
    selectedCount: "Ausgewählt: {count}",
    selectAll: "Alle Zeilen auswählen",
    toggleActions: "Zeilenaktionen anzeigen",
    resizeColumn: "Spalte vergrößern",
    noData: "Keine Daten",
    loading: "Wird geladen…",
    areYouSure: "Sind Sie sicher?",
    networkError: "Fehler beim Laden",
};

DataGrid.setLabels(labels);

export default labels;
