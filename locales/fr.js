import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Éléments par page",
    gotoPage: "Aller à la page",
    gotoFirstPage: "Première page",
    gotoPrevPage: "Page précédente",
    gotoNextPage: "Page suivante",
    gotoLastPage: "Dernière page",
    pageRange: "{from}–{to} sur {total}",
    pageStatus: "Page {page} sur {pages}",
    resultCount: "Total : {count}",
    loadMore: "Charger plus",
    loadedCount: "{count} sur {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Sélection : {count}",
    selectAll: "Sélectionner toutes les lignes",
    selectRow: "Sélectionner {row}",
    selectionActions: "Actions sur la sélection",
    selectAllResults: "Tout sélectionner ({total})",
    selectAllMatching: "Sélectionner tous les résultats",
    allSelected: "Tout est sélectionné",
    clearSelection: "Vider la sélection",
    toggleActions: "Afficher les actions de la ligne",
    showDetails: "Afficher les détails de {row}",
    hideDetails: "Masquer les détails de {row}",
    closeDialog: "Fermer la fenêtre",
    showHiddenColumns: "Afficher les colonnes supplémentaires de {row}",
    hideHiddenColumns: "Masquer les colonnes supplémentaires de {row}",
    resizeColumn: "Redimensionner la colonne",
    search: "Rechercher",
    noData: "Aucune donnée",
    noResults: 'Aucun résultat pour "{query}"',
    loading: "Chargement…",
    areYouSure: "Êtes-vous sûr ?",
    networkError: "Erreur lors du chargement",
    booleanTrue: "Oui",
    booleanFalse: "Non",
};

DataGrid.setLabels(labels);

export default labels;
