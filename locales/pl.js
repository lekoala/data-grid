import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "Elementów na stronę",
    gotoPage: "Przejdź do strony",
    gotoFirstPage: "Pierwsza strona",
    gotoPrevPage: "Poprzednia strona",
    gotoNextPage: "Następna strona",
    gotoLastPage: "Ostatnia strona",
    pageRange: "{from}–{to} z {total}",
    pageStatus: "Strona {page} z {pages}",
    resultCount: "Łącznie: {count}",
    loadMore: "Załaduj więcej",
    loadedCount: "{count} z {total}",
    loadedCountUnknown: "{count}",
    selectedCount: "Wybrano: {count}",
    selectAll: "Zaznacz wszystkie wiersze",
    selectRow: "Wybierz {row}",
    selectionActions: "Działania na zaznaczeniu",
    selectAllResults: "Zaznacz wszystkie ({total})",
    selectAllMatching: "Zaznacz wszystkie wyniki",
    allSelected: "Zaznaczono wszystko",
    allSelectedExcept: "Zaznaczono wszystko z wyjątkiem {count}",
    clearSelection: "Wyczyść zaznaczenie",
    toggleActions: "Pokaż akcje wiersza",
    showDetails: "Pokaż szczegóły {row}",
    hideDetails: "Ukryj szczegóły {row}",
    closeDialog: "Zamknij okno dialogowe",
    showHiddenColumns: "Pokaż dodatkowe kolumny dla {row}",
    hideHiddenColumns: "Ukryj dodatkowe kolumny dla {row}",
    resizeColumn: "Zmień szerokość kolumny",
    search: "Szukaj",
    noData: "Brak danych",
    noResults: 'Brak wyników dla "{query}"',
    loading: "Wczytywanie…",
    areYouSure: "Czy na pewno?",
    networkError: "Błąd wczytywania",
    booleanTrue: "Tak",
    booleanFalse: "Nie",
};

DataGrid.setLabels(labels);

export default labels;
