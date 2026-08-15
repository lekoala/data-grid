import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Éléments par page",
    gotoPage: "Aller à la page",
    gotoFirstPage: "Première page",
    gotoPrevPage: "Page précédente",
    gotoNextPage: "Page suivante",
    gotoLastPage: "Dernière page",
    pageRange: "{from} – {to} sur {total}",
    resultCount: "Éléments : {count}",
    selectedCount: "Sélection : {count}",
    selectAll: "Sélectionner toutes les lignes",
    toggleActions: "Afficher les actions de la ligne",
    resizeColumn: "Redimensionner la colonne",
    noData: "Aucune donnée",
    loading: "Chargement…",
    areYouSure: "Êtes-vous sûr ?",
    networkError: "Erreur lors du chargement",
};

DataGrid.setLabels(labels);

export default labels;
