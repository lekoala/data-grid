import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Элементов на странице",
    gotoPage: "Перейти на страницу",
    gotoFirstPage: "Первая страница",
    gotoPrevPage: "Предыдущая страница",
    gotoNextPage: "Следующая страница",
    gotoLastPage: "Последняя страница",
    pageRange: "{from}–{to} из {total}",
    pageStatus: "Страница {page} из {pages}",
    resultCount: "Всего: {count}",
    loadMore: "Загрузить ещё",
    loadedCount: "{count} из {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Выбрано: {count}",
    selectAll: "Выбрать все строки",
    selectRow: "Выбрать {row}",
    selectionActions: "Действия с выбранным",
    selectAllResults: "Выбрать все ({total})",
    selectAllMatching: "Выбрать все результаты",
    allSelected: "Выбрано всё",
    allSelectedExcept: "Выбрано всё, кроме {count}",
    clearSelection: "Снять выбор",
    toggleActions: "Показать действия строки",
    showDetails: "Показать сведения о {row}",
    hideDetails: "Скрыть сведения о {row}",
    closeDialog: "Закрыть диалог",
    showHiddenColumns: "Показать дополнительные столбцы для {row}",
    hideHiddenColumns: "Скрыть дополнительные столбцы для {row}",
    resizeColumn: "Изменить ширину столбца",
    search: "Поиск",
    noData: "Нет данных",
    noResults: 'Нет результатов для "{query}"',
    loading: "Загрузка…",
    areYouSure: "Вы уверены?",
    networkError: "Ошибка загрузки",
    booleanTrue: "Да",
    booleanFalse: "Нет",
};

DataGrid.setLabels(labels);

export default labels;
