import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Itens por página",
    gotoPage: "Ir para a página",
    gotoFirstPage: "Primeira página",
    gotoPrevPage: "Página anterior",
    gotoNextPage: "Próxima página",
    gotoLastPage: "Última página",
    pageRange: "{from} – {to} de {total}",
    resultCount: "Itens: {count}",
    selectedCount: "Selecionados: {count}",
    selectAll: "Selecionar todas as linhas",
    toggleActions: "Mostrar ações da linha",
    resizeColumn: "Redimensionar coluna",
    noData: "Sem dados",
    loading: "Carregando…",
    areYouSure: "Tem certeza?",
    networkError: "Erro ao carregar",
};

DataGrid.setLabels(labels);

export default labels;
