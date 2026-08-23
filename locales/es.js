import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementos por página",
    gotoPage: "Ir a la página",
    gotoFirstPage: "Primera página",
    gotoPrevPage: "Página anterior",
    gotoNextPage: "Página siguiente",
    gotoLastPage: "Última página",
    pageStatus: "Página {page} de {pages}",
    resultCount: "Elementos: {count}",
    selectedCount: "Seleccionados: {count}",
    selectAll: "Seleccionar todas las filas",
    selectRow: "Seleccionar {row}",
    toggleActions: "Mostrar acciones de fila",
    showDetails: "Mostrar detalles de {row}",
    hideDetails: "Ocultar detalles de {row}",
    showHiddenColumns: "Mostrar columnas adicionales de {row}",
    hideHiddenColumns: "Ocultar columnas adicionales de {row}",
    resizeColumn: "Redimensionar columna",
    noData: "Sin datos",
    loading: "Cargando…",
    areYouSure: "¿Estás seguro?",
    networkError: "Error al cargar",
};

DataGrid.setLabels(labels);

export default labels;
