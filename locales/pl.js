import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementów na stronę",
    gotoPage: "Przejdź do strony",
    gotoFirstPage: "Pierwsza strona",
    gotoPrevPage: "Poprzednia strona",
    gotoNextPage: "Następna strona",
    gotoLastPage: "Ostatnia strona",
    pageStatus: "Strona {page} z {pages}",
    resultCount: "Elementy: {count}",
    selectedCount: "Wybrano: {count}",
    selectAll: "Zaznacz wszystkie wiersze",
    selectRow: "Wybierz {row}",
    toggleActions: "Pokaż akcje wiersza",
    showDetails: "Pokaż szczegóły {row}",
    hideDetails: "Ukryj szczegóły {row}",
    showHiddenColumns: "Pokaż dodatkowe kolumny dla {row}",
    hideHiddenColumns: "Ukryj dodatkowe kolumny dla {row}",
    resizeColumn: "Zmień szerokość kolumny",
    noData: "Brak danych",
    loading: "Wczytywanie…",
    areYouSure: "Czy na pewno?",
    networkError: "Błąd wczytywania",
    booleanTrue: "Tak",
    booleanFalse: "Nie",
};

DataGrid.setLabels(labels);

export default labels;
