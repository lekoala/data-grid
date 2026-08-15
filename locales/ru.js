import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Элементов на странице",
    gotoPage: "Перейти на страницу",
    gotoFirstPage: "Первая страница",
    gotoPrevPage: "Предыдущая страница",
    gotoNextPage: "Следующая страница",
    gotoLastPage: "Последняя страница",
    pageRange: "{from} – {to} из {total}",
    resultCount: "Элементы: {count}",
    selectedCount: "Выбрано: {count}",
    selectAll: "Выбрать все строки",
    toggleActions: "Показать действия строки",
    resizeColumn: "Изменить ширину столбца",
    noData: "Нет данных",
    loading: "Загрузка…",
    areYouSure: "Вы уверены?",
    networkError: "Ошибка загрузки",
};

DataGrid.setLabels(labels);

export default labels;
