import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Itens por página",
    gotoPage: "Ir para a página",
    gotoFirstPage: "Primeira página",
    gotoPrevPage: "Página anterior",
    gotoNextPage: "Próxima página",
    gotoLastPage: "Última página",
    pageStatus: "Página {page} de {pages}",
    resultCount: "Itens: {count}",
    selectedCount: "Selecionados: {count}",
    selectAll: "Selecionar todas as linhas",
    selectRow: "Selecionar {row}",
    toggleActions: "Mostrar ações da linha",
    showDetails: "Mostrar detalhes de {row}",
    hideDetails: "Ocultar detalhes de {row}",
    showHiddenColumns: "Mostrar colunas adicionais de {row}",
    hideHiddenColumns: "Ocultar colunas adicionais de {row}",
    resizeColumn: "Redimensionar coluna",
    noData: "Sem dados",
    loading: "Carregando…",
    areYouSure: "Tem certeza?",
    networkError: "Erro ao carregar",
    booleanTrue: "Sim",
    booleanFalse: "Não",
};

DataGrid.setLabels(labels);

export default labels;
