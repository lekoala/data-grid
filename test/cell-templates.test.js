import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import EditableColumn from "../src/plugins/editable-column.js";

// The plugin registry is process-wide: other test files may unregister the
// default plugins, so an editable-column test must register its own dependency.
DataGrid.registerPlugins({ EditableColumn });

/**
 * @param {String} markup
 * @param {Object} [options]
 * @returns {Promise<DataGrid>}
 */
async function makeGrid(markup, options = {}) {
    const grid = new DataGrid(options);
    grid.innerHTML = markup;
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return grid;
}

/**
 * @param {String} status
 * @param {String} template
 * @returns {Promise<DataGrid>}
 */
function makeTemplateGrid(status, template) {
    return makeGrid(`<template data-cell="status">${template}</template>`, {
        columns: [{ field: "status" }],
        dataSource: new ArrayDataSource([{ id: 1, status }]),
    });
}

/**
 * @param {DataGrid} grid
 * @param {String} field
 * @returns {HTMLTableCellElement}
 */
function cell(grid, field) {
    return /** @type {HTMLTableCellElement} */ (grid.querySelector(`tbody td[data-column-id="${field}"]`));
}

/**
 * @param {DataGrid} grid
 */
function removeGrid(grid) {
    grid.remove();
}

test("renders a template with the raw scalar value and data-value", async () => {
    const grid = await makeTemplateGrid("active", '<span class="badge" data-dg-text="value"></span>');
    const td = cell(grid, "status");

    expect(td.querySelector(".badge")?.textContent).toBe("active");
    expect(td.dataset.value).toBe("active");
    removeGrid(grid);
});

test("raw scalar text handles numbers, booleans and empty non-scalars", async () => {
    const grid = await makeGrid(
        `
<template data-cell="count"><b data-dg-text="value"></b></template>
<template data-cell="active"><b data-dg-text="value"></b></template>
<template data-cell="empty"><b data-dg-text="value"></b></template>
<template data-cell="meta"><b data-dg-text="value"></b></template>
`,
        {
            columns: [{ field: "count" }, { field: "active" }, { field: "empty" }, { field: "meta" }],
            dataSource: new ArrayDataSource([{ id: 1, count: 42, active: true, empty: null, meta: { a: 1 } }]),
        },
    );

    const count = cell(grid, "count");
    expect(count.textContent).toBe("42");
    expect(count.dataset.value).toBe("42");

    const active = cell(grid, "active");
    expect(active.textContent).toBe("true");
    expect(active.dataset.value).toBe("true");

    const empty = cell(grid, "empty");
    expect(empty.textContent).toBe("");
    expect(empty.hasAttribute("data-value")).toBe(false);

    const meta = cell(grid, "meta");
    expect(meta.textContent).toBe("");
    expect(meta.hasAttribute("data-value")).toBe(false);
    removeGrid(grid);
});

test("values are inserted as text, never parsed as markup", async () => {
    const grid = await makeTemplateGrid('<img src=x onerror="alert(1)">', '<span data-dg-text="value"></span>');
    const td = cell(grid, "status");

    expect(td.querySelector("img")).toBeNull();
    expect(td.textContent).toBe('<img src=x onerror="alert(1)">');
    removeGrid(grid);
});

test("renderCell wins over a template", async () => {
    const grid = await makeGrid('<template data-cell="status"><span class="template"></span></template>', {
        columns: [{ field: "status", renderCell: () => "JS" }],
        dataSource: new ArrayDataSource([{ id: 1, status: "active" }]),
    });
    const td = cell(grid, "status");

    expect(td.textContent).toBe("JS");
    expect(td.querySelector(".template")).toBeNull();
    expect(td.hasAttribute("data-value")).toBe(false);
    removeGrid(grid);
});

test("a template wins over authored markup and survives updateRow", async () => {
    const grid = await makeGrid(`
<table>
    <thead><tr><th data-field="status">Status</th></tr></thead>
    <tbody>
        <tr data-row-key="1">
            <td data-value="active"><span class="authored">Active</span></td>
        </tr>
    </tbody>
</table>
<template data-cell="status"><span class="badge" data-dg-text="value"></span></template>
`);

    let td = cell(grid, "status");
    expect(td.querySelector(".badge")?.textContent).toBe("active");
    expect(td.querySelector(".authored")).toBeNull();
    expect(td.dataset.value).toBe("active");

    grid.updateRow("1", { status: "inactive" });

    td = cell(grid, "status");
    expect(td.querySelector(".badge")?.textContent).toBe("inactive");
    expect(td.dataset.value).toBe("inactive");
    expect(td.querySelector(".authored")).toBeNull();
    removeGrid(grid);
});

test("a template without a binding is cloned as static content", async () => {
    const grid = await makeTemplateGrid("active", '<span class="icon" aria-hidden="true"></span>');
    const td = cell(grid, "status");

    expect(td.querySelector(".icon")).toBeTruthy();
    expect(td.textContent).toBe("");
    expect(td.dataset.value).toBe("active");
    removeGrid(grid);
});

test("every data-dg-text binding receives the value", async () => {
    const grid = await makeTemplateGrid("active", '<b data-dg-text="value"></b><i data-dg-text="value"></i>');
    const td = cell(grid, "status");

    expect(td.querySelector("b")?.textContent).toBe("active");
    expect(td.querySelector("i")?.textContent).toBe("active");
    removeGrid(grid);
});

test("a template inside a th is not collected", async () => {
    const grid = await makeGrid(`
<table>
    <thead>
        <tr>
            <th data-field="status">
                <template data-cell="status"><span class="template"></span></template>
                Status
            </th>
        </tr>
    </thead>
    <tbody><tr data-row-key="1"><td data-value="active">Active</td></tr></tbody>
</table>
`);

    expect(cell(grid, "status").querySelector(".template")).toBeNull();
    expect(cell(grid, "status").textContent).toBe("Active");
    removeGrid(grid);
});

test.each([
    ["script", "<script>alert(1)</script>"],
    ["style", "<style>.x{color:red}</style>"],
    ["SVG script", "<svg><script>alert(1)</script></svg>"],
    ["SVG style", "<svg><style>.x{color:red}</style></svg>"],
    ["event attribute", '<span onclick="alert(1)">x</span>'],
    ["unsafe URL", '<a href="javascript:alert(1)">x</a>'],
    ["obfuscated unsafe URL", '<a href="java&#9;script:alert(1)">x</a>'],
])("an unsafe template is ignored (%s)", async (_name, content) => {
    const originalWarn = console.warn;
    console.warn = () => {};
    const grid = await makeTemplateGrid("active", content).finally(() => {
        console.warn = originalWarn;
    });
    const td = cell(grid, "status");

    expect(td.textContent).toBe("active");
    removeGrid(grid);
});

test("a safe relative URL is allowed in a template", async () => {
    const grid = await makeTemplateGrid("active", '<a class="link" href="/users/1" data-dg-text="value"></a>');
    const td = cell(grid, "status");

    expect(td.querySelector(".link")?.getAttribute("href")).toBe("/users/1");
    expect(td.querySelector(".link")?.textContent).toBe("active");
    removeGrid(grid);
});

test("a data image URL is allowed on img src", async () => {
    const grid = await makeTemplateGrid(
        "active",
        '<img class="icon" alt="" src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">',
    );
    const td = cell(grid, "status");

    expect(td.querySelector("img.icon")?.getAttribute("src")).toContain("data:image/svg+xml");
    removeGrid(grid);
});

test("a data URL on an iframe src is rejected", async () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    const grid = await makeTemplateGrid("active", '<iframe src="data:text/html,hello"></iframe>').finally(() => {
        console.warn = originalWarn;
    });
    const td = cell(grid, "status");

    expect(td.querySelector("iframe")).toBeNull();
    expect(td.textContent).toBe("active");
    removeGrid(grid);
});

test("a non-URL attribute with an executable-looking value is allowed", async () => {
    const grid = await makeTemplateGrid("active", '<span class="tpl" title="data:note" data-dg-text="value"></span>');
    const td = cell(grid, "status");

    expect(td.querySelector(".tpl")?.getAttribute("title")).toBe("data:note");
    expect(td.querySelector(".tpl")?.textContent).toBe("active");
    removeGrid(grid);
});

test("an editable column replaces the template with its editor", async () => {
    const grid = await makeGrid(
        '<template data-cell="status"><span class="badge" data-dg-text="value"></span></template>',
        {
            columns: [{ field: "status", editable: true }],
            dataSource: new ArrayDataSource([{ id: 1, status: "active" }]),
        },
    );
    const td = cell(grid, "status");

    expect(td.querySelector("input.dg-editable")).toBeTruthy();
    expect(td.querySelector(".badge")).toBeNull();
    expect(td.dataset.value).toBe("active");
    removeGrid(grid);
});

test("an unknown data-cell warns once after the schema is known", async () => {
    const originalWarn = console.warn;
    /** @type {String[]} */
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(" "));

    let grid;
    try {
        grid = await makeGrid('<template data-cell="missing"><span></span></template>', {
            columns: [{ field: "status" }],
            dataSource: new ArrayDataSource([{ id: 1, status: "active" }]),
        });
        grid.renderTable();
    } finally {
        console.warn = originalWarn;
    }

    const unknown = warnings.filter((warning) => warning.includes('data-cell="missing"'));
    expect(unknown).toHaveLength(1);
    if (grid) {
        removeGrid(grid);
    }
});

test("columns inferred from the first row resolve templates", async () => {
    const grid = await makeGrid(
        '<template data-cell="status"><span class="badge" data-dg-text="value"></span></template>',
        {
            dataSource: new ArrayDataSource([{ id: 1, status: "active" }]),
        },
    );
    const td = cell(grid, "status");

    expect(td.querySelector(".badge")?.textContent).toBe("active");
    expect(td.dataset.value).toBe("active");
    removeGrid(grid);
});
