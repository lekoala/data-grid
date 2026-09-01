import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource, FetchDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { input } from "./helpers.js";

DataGrid.unregisterPlugins();
DataGrid.registerPlugins({ SelectableRows, BulkActions, RowActions });

/**
 * Create a grid that adopts a declarative <table> from `markup`.
 * @param {String} markup
 * @param {Object} [opts]
 * @returns {Promise<DataGrid>}
 */
async function makeDeclarativeGrid(markup, opts = {}) {
    const inst = new DataGrid(opts);
    inst.innerHTML = markup;
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function removeGrid(inst) {
    document.body.removeChild(inst);
}

const DEMO_TABLE = `
<table class="table-striped">
    <caption>Records</caption>
    <colgroup><col style="width:30%"><col><col></colgroup>
    <thead>
        <tr>
            <th data-field="name" data-sort="asc">Name</th>
            <th data-field="email">Email</th>
            <th data-field="age" data-sortable="false">Age</th>
        </tr>
    </thead>
    <tbody>
        <tr data-row-key="42"><td>User One</td><td>user1@example.com</td><td>41</td></tr>
        <tr data-row-key="53"><td>User Two</td><td>user2@example.com</td><td>32</td></tr>
    </tbody>
</table>
`;

test("thead declares columns and the tbody becomes the local dataset", async () => {
    const inst = await makeDeclarativeGrid(DEMO_TABLE, { sortable: true });

    expect(inst.options.columns.map((c) => c.field)).toEqual(["name", "email", "age"]);
    expect(inst.options.columns[0].title).toBe("Name");
    expect(inst.options.columns[2].sortable).toBe(false);
    expect(inst.query.sort).toEqual([{ field: "name", direction: "asc" }]);

    expect(inst.dataSource).toBeInstanceOf(ArrayDataSource);
    expect(inst.dataSource.rows).toEqual([
        { name: "User One", email: "user1@example.com", age: "41", id: "42" },
        { name: "User Two", email: "user2@example.com", age: "32", id: "53" },
    ]);
    removeGrid(inst);
});

test("the adopted table keeps its markup and the grid installs its structure", async () => {
    const inst = await makeDeclarativeGrid(DEMO_TABLE, { sortable: true });

    // Exactly one direct table under the .dg-scroll viewport: the supplied one,
    // enhanced.
    expect(inst.querySelectorAll(":scope > .dg-scroll > table").length).toBe(1);
    const table = inst.querySelector("table");
    expect(table.classList.contains("table-striped")).toBe(true);
    expect(table.querySelector("caption").textContent).toBe("Records");
    expect(table.querySelector("colgroup")).toBeTruthy();

    // Grid-owned structure.
    expect(table.querySelector("tfoot .dg-footer")).toBeTruthy();
    expect(inst.querySelector("tbody tr").querySelectorAll("td").length).toBe(3);
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="name"]').getAttribute("aria-sort")).toBe(
        "ascending",
    );
    removeGrid(inst);
});

test("data-value keeps a machine value while the markup stays rich", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th><th data-field="status" data-filter="select">Status</th></tr></thead>
    <tbody>
        <tr data-row-key="1"><td data-value="User One"><a href="/users/1">User One</a></td><td data-value="active">Active badge</td></tr>
    </tbody>
</table>
`,
        { sortable: true, filterable: true },
    );

    const row = inst.dataSource.rows[0];
    expect(row.name).toBe("User One");
    expect(row.status).toBe("active");

    // data-filter="select" produces a select filter control.
    const select = inst.querySelector('thead tr.dg-head-filters th[data-column-id="status"] select');
    expect(select).toBeTruthy();
    removeGrid(inst);
});

test("data-filter-placeholder becomes the text filter placeholder", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th><th data-field="ref" data-filter-placeholder="ABC-123">Reference</th></tr></thead>
    <tbody><tr data-row-key="1"><td>a</td><td>ABC</td></tr></tbody>
</table>
`,
        { filterable: true },
    );

    expect(inst.options.columns[1].filterPlaceholder).toBe("ABC-123");
    expect(inst.querySelector('thead tr.dg-head-filters input[data-name="ref"]').getAttribute("placeholder")).toBe(
        "ABC-123",
    );
    removeGrid(inst);
});

test("data-wrap configures wrapping for an individual column", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name" data-wrap>Name</th><th data-field="email" data-wrap="false">Email</th></tr></thead>
    <tbody><tr><td>A long display name</td><td>a@example.com</td></tr></tbody>
</table>
`,
        { wrap: true },
    );

    expect(inst.options.columns[0].wrap).toBe(true);
    expect(inst.options.columns[1].wrap).toBe(false);
    expect(inst.querySelector('tbody td[data-column-id="name"]').classList.contains("dg-wrap")).toBe(true);
    expect(inst.querySelector('tbody td[data-column-id="email"]').classList.contains("dg-wrap")).toBe(false);
    removeGrid(inst);
});

test("data-row-key is the authoritative row identity", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="id">Id</th><th data-field="name">Name</th></tr></thead>
    <tbody><tr data-row-key="99"><td>1</td><td>User One</td></tr></tbody>
</table>
`,
        {},
    );
    // The td says id=1, but data-row-key says 99.
    expect(inst.dataSource.rows[0].id).toBe("99");
    removeGrid(inst);
});

test("data-sortable alone never activates global sorting", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name" data-sortable>Name</th></tr></thead>
    <tbody><tr><td>User One</td></tr></tbody>
</table>
`,
        {}, // grid is NOT sortable
    );
    expect(inst.querySelector('th[data-column-id="name"] .dg-sort')).toBeNull();
    removeGrid(inst);
});

test("without data-field the table is adopted and JS columns stay", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th>Name</th><th>Age</th></tr></thead>
    <tbody><tr><td>User One</td><td>41</td></tr></tbody>
</table>
`,
        { columns: [{ field: "name", title: "Name" }] },
    );

    expect(inst.options.columns.map((c) => c.field)).toEqual(["name"]);
    expect(inst.querySelectorAll(":scope > .dg-scroll > table").length).toBe(1);
    expect(inst.dataSource).toBeInstanceOf(ArrayDataSource);
    expect(inst.dataSource.rows).toEqual([{ name: "User One" }]);
    removeGrid(inst);
});

test("data-sort never overrides an explicit initialQuery", async () => {
    const inst = await makeDeclarativeGrid(DEMO_TABLE, {
        initialQuery: { sort: [{ field: "email", direction: "desc" }] },
    });
    expect(inst.query.sort).toEqual([{ field: "email", direction: "desc" }]);
    removeGrid(inst);
});

test("a user tbody/tfoot is replaced, never duplicated", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th></tr></thead>
    <tbody><tr><td>User One</td></tr><tr><td>User Two</td></tr></tbody>
    <tfoot><tr><td>custom footer</td></tr></tfoot>
</table>
`,
        {},
    );

    expect(inst.querySelectorAll("tbody").length).toBe(1);
    expect(inst.querySelectorAll("tfoot").length).toBe(1);
    expect(inst.querySelector("tfoot .dg-footer")).toBeTruthy();
    expect(inst.querySelector("tfoot").textContent).not.toContain("custom footer");
    expect(inst.dataSource.rows).toHaveLength(2);
    removeGrid(inst);
});

test("with src the server source is authoritative and the tbody is ignored", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th></tr></thead>
    <tbody><tr><td>User One</td></tr></tbody>
</table>
`,
        { src: "/api/users" },
    );

    expect(inst.options.columns.map((c) => c.field)).toEqual(["name"]);
    expect(inst.dataSource).toBeInstanceOf(FetchDataSource);
    expect(inst.dataSource.rows).toBeUndefined();
    removeGrid(inst);
});

test("local sort, search and pagination work on the declarative dataset", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th><th data-field="age">Age</th></tr></thead>
    <tbody>
        <tr data-row-key="1"><td>User B</td><td>30</td></tr>
        <tr data-row-key="2"><td>User A</td><td>20</td></tr>
        <tr data-row-key="3"><td>User C</td><td>40</td></tr>
        <tr data-row-key="4"><td>User D</td><td>25</td></tr>
        <tr data-row-key="5"><td>User E</td><td>35</td></tr>
    </tbody>
</table>
`,
        { sortable: true, searchable: true, searchDelay: 0, initialQuery: { pageSize: 2 } },
    );

    // Sort by name ascending.
    await inst.setQuery({ sort: [{ field: "name", direction: "asc" }] });
    expect(inst.rows.map((r) => r.name)).toEqual(["User A", "User B"]);

    // Local pagination.
    await inst.setQuery({ page: 2 });
    expect(inst.rows.map((r) => r.name)).toEqual(["User C", "User D"]);

    // Global search narrows locally.
    const searchInput = inst.querySelector(".dg-search");
    input(searchInput, "User E");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(inst.rows.map((r) => r.name)).toEqual(["User E"]);
    removeGrid(inst);
});

test("reconnect is idempotent: one table, same data source, no re-seed", async () => {
    const inst = await makeDeclarativeGrid(DEMO_TABLE, {});
    const ds = inst.dataSource;
    expect(ds).toBeInstanceOf(ArrayDataSource);

    document.body.removeChild(inst);
    await new Promise((resolve) => setTimeout(resolve, 50));
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.querySelectorAll(":scope > .dg-scroll > table").length).toBe(1);
    expect(inst.dataSource).toBe(ds);
    expect(inst.options.columns.map((c) => c.field)).toEqual(["name", "email", "age"]);
    expect(inst.rows).toHaveLength(2);
    removeGrid(inst);
});

test("empty declarative tbody is still a local dataset", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="name">Name</th></tr></thead>
    <tbody></tbody>
</table>
`,
        {},
    );
    expect(inst.dataSource).toBeInstanceOf(ArrayDataSource);
    expect(inst.dataSource.rows).toEqual([]);
    expect(inst.hasAttribute("data-empty")).toBe(true);
    removeGrid(inst);
});

test("data-transform and data-editable-type map to column options", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead>
        <tr>
            <th data-field="name" data-transform="uppercase">Name</th>
            <th data-field="note" data-editable data-editable-type="textarea">Note</th>
        </tr>
    </thead>
    <tbody><tr><td>User One</td><td>hi</td></tr></tbody>
</table>
`,
        {},
    );

    const columns = inst.options.columns;
    expect(columns[0].transform).toBe("uppercase");
    expect(columns[1].editable).toBe(true);
    expect(columns[1].editableType).toBe("textarea");
    removeGrid(inst);
});

test("a td data-actions cell becomes row.$actions without shifting data cells", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead>
        <tr>
            <th data-field="name">Name</th>
            <th data-field="email">Email</th>
            <th data-actions>Actions</th>
        </tr>
    </thead>
    <tbody>
        <tr data-row-key="1">
            <td>User One</td>
            <td>user1@example.com</td>
            <td data-actions>
                <a data-action="view" href="/users/1" data-intent="primary">View</a>
                <button data-action="delete" data-confirm="Delete this user?">Delete</button>
            </td>
        </tr>
    </tbody>
</table>
`,
        {},
    );

    // The data cells map by index: the actions cell never shifts them.
    const row = inst.dataSource.rows[0];
    expect(row.name).toBe("User One");
    expect(row.email).toBe("user1@example.com");
    expect(row.id).toBe("1");
    expect(row.$actions).toEqual([
        { name: "view", label: "View", href: "/users/1", intent: "primary" },
        { name: "delete", label: "Delete", confirm: "Delete this user?" },
    ]);

    // `<th data-actions>` activates the capability and renders the column.
    expect(inst.options.rowActions).toBe(true);
    expect(inst.querySelector('thead th[data-column-id="$actions"]').getAttribute("width")).toBe("148");
    const cell = inst.querySelector('tbody td[data-column-id="$actions"]');
    expect(cell.querySelector('a[data-action="view"]').getAttribute("href")).toBe("/users/1");
    expect(cell.querySelector('button[data-action="delete"]')).toBeTruthy();
    removeGrid(inst);
});

test("column inference never turns $actions into a data column", async () => {
    const inst = new DataGrid({ dataSource: new ArrayDataSource([{ name: "a", $actions: ["view"] }]) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(inst.options.columns.map((c) => c.field)).toEqual(["name"]);
    removeGrid(inst);
});

test("data-value is a typed machine value and the authored markup survives rerenders", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="amount">Amount</th><th data-field="ref">Ref</th></tr></thead>
    <tbody>
        <tr data-row-key="1"><td data-value="1240"><data class="currency">$1,240.00</data></td><td data-value="001">ABC-001</td></tr>
    </tbody>
</table>
`,
        {},
    );

    // data-value is normalized: amounts become numbers, zero-padded ids stay strings.
    const row = inst.dataSource.rows[0];
    expect(row.amount).toBe(1240);
    expect(typeof row.amount).toBe("number");
    expect(row.ref).toBe("001");
    expect(typeof row.ref).toBe("string");

    // The authored presentation is preserved on the first render...
    const cell = inst.querySelector('tbody td[data-column-id="amount"]');
    expect(cell.querySelector("data.currency").textContent).toBe("$1,240.00");

    // ...and across a rerender that does not touch the value.
    await inst.setQuery({ page: 1 });
    const rerendered = inst.querySelector('tbody td[data-column-id="amount"]');
    expect(rerendered.querySelector("data.currency").textContent).toBe("$1,240.00");
    removeGrid(inst);
});

test("updating a declarative row value invalidates its blueprint", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="status">Status</th></tr></thead>
    <tbody><tr data-row-key="1"><td data-value="paid"><span class="badge success">Paid</span></td></tr></tbody>
</table>
`,
        {},
    );

    expect(inst.querySelector('tbody td[data-column-id="status"] span.badge')).toBeTruthy();

    inst.updateRow("1", { status: "refunded" });
    const cell = inst.querySelector('tbody td[data-column-id="status"]');
    expect(cell.querySelector("span.badge")).toBeNull();
    expect(cell.textContent).toBe("refunded");
    removeGrid(inst);
});

test("filter select labels derive from data-value + textContent", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="status" data-filter="select">Status</th></tr></thead>
    <tbody>
        <tr data-row-key="1"><td data-value="paid"><span class="badge success">Paid</span></td></tr>
        <tr data-row-key="2"><td data-value="refunded"><span class="badge warn">Refunded</span></td></tr>
    </tbody>
</table>
`,
        { filterable: true },
    );

    const select = inst.querySelector('thead tr.dg-head-filters th[data-column-id="status"] select');
    const options = [...select.options].map((o) => ({ value: o.value, text: o.textContent }));
    expect(options).toContainEqual({ value: "paid", text: "Paid" });
    expect(options).toContainEqual({ value: "refunded", text: "Refunded" });
    removeGrid(inst);
});

test("data-min-width sets a column floor never compressed below", async () => {
    const inst = await makeDeclarativeGrid(
        `
<table>
    <thead><tr><th data-field="date" data-width="140" data-min-width="110">Issued</th></tr></thead>
    <tbody><tr><td data-value="2026-08-21">2026-08-21</td></tr></tbody>
</table>
`,
        {},
    );

    expect(inst.options.columns[0].minWidth).toBe(110);
    const th = inst.querySelector('thead tr.dg-head-columns th[data-column-id="date"]');
    expect(Number(th.dataset.minWidth)).toBeGreaterThanOrEqual(110);
    expect(Number(th.getAttribute("width"))).toBeGreaterThanOrEqual(110);
    removeGrid(inst);
});

test("a frozen declarative column is parsed and rendered", async () => {
    const inst = await makeDeclarativeGrid(
        `<table><thead><tr><th data-field="name" data-frozen="start">Name</th></tr></thead><tbody></tbody></table>`,
        { dataSource: new ArrayDataSource([{ name: "Alice" }]) },
    );
    expect(inst.options.columns[0].frozen).toBe("start");
    expect(inst.querySelector('th[data-column-id="name"]').dataset.frozen).toBe("start");
    removeGrid(inst);
});
