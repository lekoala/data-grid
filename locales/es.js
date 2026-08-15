import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementos por página",
    gotoPage: "Ir a la página",
    gotoFirstPage: "Primera página",
    gotoPrevPage: "Página anterior",
    gotoNextPage: "Página siguiente",
    gotoLastPage: "Última página",
    pageRange: "{from} – {to} de {total}",
    resultCount: "Elementos: {count}",
    selectedCount: "Seleccionados: {count}",
    selectAll: "Seleccionar todas las filas",
    selectRow: "Seleccionar {row}",
    toggleActions: "Mostrar acciones de fila",
    resizeColumn: "Redimensionar columna",
    noData: "Sin datos",
    loading: "Cargando…",
    areYouSure: "¿Estás seguro?",
    networkError: "Error al cargar",
};

DataGrid.setLabels(labels);

export default labels;
