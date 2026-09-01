import DataGrid, {
    type ActionContext,
    type ActionRenderContext,
    type CellContext,
    type EditContext,
    type RowDetailsContext,
} from "data-grid-component";
import type { RenderContext } from "data-grid-component/plugin";
import BasePlugin from "data-grid-component/plugin";
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

const grid = new DataGrid({
    sortable: true,
    columns: [
        {
            field: "name",
            renderHeaderCell(th, ctx) {
                th.textContent = ctx.column.title ?? ctx.column.field ?? "";
            },
            renderCell(ctx) {
                const typedContext: CellContext = ctx;
                return typedContext.value ?? "";
            },
            validate(value, ctx) {
                const typedContext: EditContext = ctx;
                void typedContext;
                return value === "" ? "Required" : true;
            },
        },
    ],
    actions: [
        {
            name: "view",
            intent: "primary",
            href(row, ctx) {
                const typedContext: ActionContext = ctx;
                return `/users/${typedContext.rowKey || row.id}`;
            },
            visible(row, ctx) {
                return Boolean(row.id && ctx.action.name);
            },
            render(ctx) {
                const typedContext: ActionRenderContext = ctx;
                return document.createTextNode(typedContext.action.label ?? "View");
            },
        },
    ],
    bulkActions: [
        {
            name: "archive",
            label: "Archive",
            confirm(selection, ctx) {
                return selection.mode === "all" || ctx.action.name === "archive";
            },
        },
    ],
    rowKey: (row) => row.id,
    rowLabel: (row, index) => row.name ?? `Row ${index}`,
    rowDetails(ctx) {
        const typedContext: RowDetailsContext = ctx;
        return typedContext.row.name;
    },
});

class ConsumerPlugin extends BasePlugin {
    afterRender(context: RenderContext) {
        if (context === "body") {
            this.grid.getRowLabel(this.grid.rows[0] ?? {}, 0);
        }
    }
}

DataGrid.registerPlugins({ ConsumerPlugin });

// @ts-expect-error constructor options are checked against the public contract
new DataGrid({ sortable: "yes" });

void grid;
