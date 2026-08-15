import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementów na stronę",
    gotoPage: "Przejdź do strony",
    gotoFirstPage: "Pierwsza strona",
    gotoPrevPage: "Poprzednia strona",
    gotoNextPage: "Następna strona",
    gotoLastPage: "Ostatnia strona",
    pageRange: "{from} – {to} z {total}",
    resultCount: "Elementy: {count}",
    selectedCount: "Wybrano: {count}",
    selectAll: "Zaznacz wszystkie wiersze",
    toggleActions: "Pokaż akcje wiersza",
    resizeColumn: "Zmień szerokość kolumny",
    noData: "Brak danych",
    loading: "Wczytywanie…",
    areYouSure: "Czy na pewno?",
    networkError: "Błąd wczytywania",
};

DataGrid.setLabels(labels);

export default labels;
