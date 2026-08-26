import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Элементов на странице",
    gotoPage: "Перейти на страницу",
    gotoFirstPage: "Первая страница",
    gotoPrevPage: "Предыдущая страница",
    gotoNextPage: "Следующая страница",
    gotoLastPage: "Последняя страница",
    pageStatus: "Страница {page} из {pages}",
    resultCount: "Элементы: {count}",
    selectedCount: "Выбрано: {count}",
    selectAll: "Выбрать все строки",
    selectRow: "Выбрать {row}",
    toggleActions: "Показать действия строки",
    showDetails: "Показать сведения о {row}",
    hideDetails: "Скрыть сведения о {row}",
    showHiddenColumns: "Показать дополнительные столбцы для {row}",
    hideHiddenColumns: "Скрыть дополнительные столбцы для {row}",
    resizeColumn: "Изменить ширину столбца",
    noData: "Нет данных",
    loading: "Загрузка…",
    areYouSure: "Вы уверены?",
    networkError: "Ошибка загрузки",
    booleanTrue: "Да",
    booleanFalse: "Нет",
};

DataGrid.setLabels(labels);

export default labels;
