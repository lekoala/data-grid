import type { FilterOperator, QueryState } from "data-grid-component/data-source";

const operator: FilterOperator = "notContains";

const query: QueryState = {
    page: 1,
    pageSize: 10,
    search: "",
    sort: [],
    filters: {
        name: { operator, value: "needle" },
    },
};

void query;
