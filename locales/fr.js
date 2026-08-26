import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Éléments par page",
    gotoPage: "Aller à la page",
    gotoFirstPage: "Première page",
    gotoPrevPage: "Page précédente",
    gotoNextPage: "Page suivante",
    gotoLastPage: "Dernière page",
    pageStatus: "Page {page} sur {pages}",
    resultCount: "Éléments : {count}",
    selectedCount: "Sélection : {count}",
    selectAll: "Sélectionner toutes les lignes",
    selectRow: "Sélectionner {row}",
    toggleActions: "Afficher les actions de la ligne",
    showDetails: "Afficher les détails de {row}",
    hideDetails: "Masquer les détails de {row}",
    showHiddenColumns: "Afficher les colonnes supplémentaires de {row}",
    hideHiddenColumns: "Masquer les colonnes supplémentaires de {row}",
    resizeColumn: "Redimensionner la colonne",
    noData: "Aucune donnée",
    loading: "Chargement…",
    areYouSure: "Êtes-vous sûr ?",
    networkError: "Erreur lors du chargement",
    booleanTrue: "Oui",
    booleanFalse: "Non",
};

DataGrid.setLabels(labels);

export default labels;
