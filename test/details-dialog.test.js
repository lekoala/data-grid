import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import RowDetails from "../src/plugins/row-details.js";

const ROWS = [
    { id: 1, name: "Alice", email: "alice@example.com", status: "active", secret: "hidden" },
    { id: 2, name: "Bob", email: "bob@example.com", status: "pending", secret: "hidden" },
];

async function makeReadyGrid(options = {}, rows = ROWS, plugins = { ResponsiveGrid, RowDetails }) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins(plugins);
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        rowLabel: "name",
        ...options,
        dataSource: new ArrayDataSource(rows),
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function dialogOf(grid) {
    return grid.querySelector("dialog.dg-details-dialog");
}

function toggleOf(grid, rowIndex = 0) {
    return grid.querySelector(`tbody tr.dg-data-row[data-row-index="${rowIndex}"] .dg-row-details-toggle-control`);
}

function dataLabels(grid) {
    return [...dialogOf(grid).querySelectorAll(".dg-details-list dt")].map((dt) => dt.textContent);
}

test("dialog mode renders a disclosure control and opens the built-in sheet without rowDetails", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const plugin = grid.getPlugin("RowDetails");
    const toggle = toggleOf(grid);

    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-haspopup")).toBe("dialog");
    expect(toggle.hasAttribute("aria-expanded")).toBe(false);
    expect(toggle.classList.contains("dg-row-details-toggle-control-dialog")).toBe(true);
    expect(toggle.classList.contains("dg-row-details-toggle-control-open")).toBe(false);

    toggle.click();

    const dialog = dialogOf(grid);
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
    expect(plugin.isExpanded("1")).toBe(true);
    expect(toggle.getAttribute("aria-controls")).toBe(dialog.id);

    document.body.removeChild(grid);
});

test("the sheet includes visible and responsive-hidden columns and excludes hidden, attr and virtual ones", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        responsive: true,
        columns: [
            { field: "name", title: "Name" },
            { field: "email", title: "Email", responsiveHidden: true },
            { field: "secret", title: "Secret", hidden: true },
            { field: "status", title: "Status", attr: "class" },
        ],
    });

    grid.getPlugin("RowDetails").expand("1");

    expect(dataLabels(grid)).toEqual(["Name", "Email"]);
    expect(dialogOf(grid).textContent).not.toContain("hidden");
    expect(dialogOf(grid).querySelectorAll(".dg-details-list dd").length).toBe(2);

    document.body.removeChild(grid);
});

test("the sheet skips computed columns without a field", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        columns: [
            { field: "name", title: "Name" },
            { title: "Full name", id: "fullName", renderCell: ({ row }) => `${row.name} <${row.email}>` },
        ],
    });

    grid.getPlugin("RowDetails").expand("1");

    expect(dataLabels(grid)).toEqual(["Name"]);
    expect(dialogOf(grid).textContent).not.toContain("alice@example.com");

    document.body.removeChild(grid);
});

test("rowDetails complements the built-in sheet and the row keeps all its cells", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        rowDetails: ({ row }) => `Activity for ${row.name}`,
    });

    grid.getPlugin("RowDetails").expand("1");

    const dialog = dialogOf(grid);
    expect(dialog.querySelector(".dg-details-list")).toBeTruthy();
    expect(dialog.querySelector(".dg-details-app").textContent).toBe("Activity for Alice");
    expect(dialog.querySelectorAll("tbody td").length).toBe(0);
    expect(grid.rows[0].name).toBe("Alice");
    expect(grid.querySelectorAll('tbody tr.dg-data-row[data-row-index="0"] > td').length).toBe(2);

    document.body.removeChild(grid);
});

test("inline display without rowDetails keeps the current behavior: no control", async () => {
    const grid = await makeReadyGrid({});

    expect(grid.querySelector(".dg-row-details-toggle-control")).toBeNull();
    expect(dialogOf(grid)).toBeNull();

    document.body.removeChild(grid);
});

test("responsive columns share the dialog disclosure and never seed a child row", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        responsive: true,
        responsiveStartOpen: true,
        columns: [{ field: "name" }, { field: "email", responsiveHidden: true }],
    });

    expect(grid.querySelectorAll('tbody tr.dg-data-row[data-row-index="0"] .dg-disclosure').length).toBe(1);
    expect(grid.querySelector("tbody .dg-responsive-toggle-control")).toBeNull();
    expect(grid.querySelector("tbody tr.dg-responsive-child-row")).toBeNull();

    toggleOf(grid).click();
    expect(dialogOf(grid).textContent).toContain("alice@example.com");
    expect(grid.querySelector("tbody tr.dg-responsive-child-row")).toBeNull();

    document.body.removeChild(grid);
});

test("rowDetailsStartOpen is ignored in dialog mode", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        rowDetailsStartOpen: true,
        rowDetails: ({ row }) => `Activity for ${row.name}`,
    });

    expect(dialogOf(grid)).toBeNull();
    expect(grid.getPlugin("RowDetails").isExpanded("1")).toBe(false);

    document.body.removeChild(grid);
});

test("closing by button or close() resets the state and emits one closed event", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const plugin = grid.getPlugin("RowDetails");
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail));

    toggleOf(grid).click();
    expect(events).toEqual([{ row: grid.rows[0], rowKey: "1", expanded: true }]);

    dialogOf(grid).querySelector(".dg-details-close").click();
    expect(dialogOf(grid).open).toBe(false);
    expect(plugin.isExpanded("1")).toBe(false);
    expect(events.length).toBe(2);
    expect(events[1]).toEqual({ row: grid.rows[0], rowKey: "1", expanded: false });

    plugin.expand("1");
    plugin.collapse("1");
    expect(plugin.isExpanded("1")).toBe(false);
    expect(events.length).toBe(4);

    document.body.removeChild(grid);
});

test("one dialog per grid, updated when another row opens", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        columns: [{ field: "name" }, { field: "email" }],
    });
    const plugin = grid.getPlugin("RowDetails");
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail.expanded));

    toggleOf(grid, 0).click();
    plugin.expand("2");

    expect(grid.querySelectorAll("dialog.dg-details-dialog").length).toBe(1);
    expect(dialogOf(grid).querySelector(".dg-details-title").textContent).toBe("Bob");
    expect(dialogOf(grid).textContent).toContain("bob@example.com");
    expect(events).toEqual([true, false, true]);

    document.body.removeChild(grid);
});

test("closing and reopening in the same task ignores the queued close events", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        columns: [{ field: "name" }, { field: "email" }],
    });
    const plugin = grid.getPlugin("RowDetails");
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail));

    plugin.expand("1");
    const dialog = dialogOf(grid);
    // Browsers queue the native close event, so the echoes of two sessions
    // closed in the same task are delivered after the last one reopened.
    plugin.expand("2");
    plugin.expand("1");
    dialog.dispatchEvent(new Event("close"));
    dialog.dispatchEvent(new Event("close"));

    expect(dialog.open).toBe(true);
    expect(plugin.isExpanded("1")).toBe(true);
    expect(events.map((event) => `${event.rowKey}:${event.expanded}`)).toEqual([
        "1:true",
        "1:false",
        "2:true",
        "2:false",
        "1:true",
    ]);

    document.body.removeChild(grid);
});

test("expand on the row already open is a no-op", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const plugin = grid.getPlugin("RowDetails");
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail.expanded));

    plugin.expand("1");
    const dialog = dialogOf(grid);
    plugin.expand("1");

    expect(dialog.open).toBe(true);
    expect(plugin.isExpanded("1")).toBe(true);
    expect(events).toEqual([true]);

    document.body.removeChild(grid);
});

test("a refresh keeps the open snapshot and its session", async () => {
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        columns: [{ field: "name" }, { field: "email" }],
    });
    const plugin = grid.getPlugin("RowDetails");
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail));
    plugin.expand("1");
    const dialog = dialogOf(grid);

    grid.dataSource = new ArrayDataSource([ROWS[1]]);
    await grid.refresh();

    expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".dg-details-title").textContent).toBe("Alice");
    expect(dialog.textContent).toContain("alice@example.com");
    expect(plugin.isExpanded("1")).toBe(true);
    expect(events.length).toBe(1);

    plugin.collapse("1");
    expect(plugin.isExpanded("1")).toBe(false);
    expect(events[1]).toEqual({ row: ROWS[0], rowKey: "1", expanded: false });

    document.body.removeChild(grid);
});

test("focus falls back to the row toggle when the browser leaves it on the body", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const toggle = toggleOf(grid);

    toggle.click();
    dialogOf(grid).querySelector(".dg-details-close").click();

    expect(document.activeElement === toggle).toBe(true);

    document.body.removeChild(grid);
});

test("disconnecting closes the dialog silently", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const events = [];
    grid.addEventListener("rowDetailsToggle", (event) => events.push(event.detail));

    toggleOf(grid).click();
    const dialog = dialogOf(grid);
    expect(dialog.open).toBe(true);

    grid.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dialog.open).toBe(false);
    expect(events.length).toBe(1);
    expect(grid.getPlugin("RowDetails").isExpanded("1")).toBe(false);
});

test("updateLabels refreshes the close button and the dialog toggle", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const previous = DataGrid.getLabels().closeDialog;

    toggleOf(grid).click();
    DataGrid.setLabels({ closeDialog: "Fermer la fenêtre", showDetails: "Voir {row}" });
    grid.updateLabels();

    expect(dialogOf(grid).querySelector(".dg-details-close").getAttribute("aria-label")).toBe("Fermer la fenêtre");
    expect(toggleOf(grid).getAttribute("aria-label")).toBe("Voir Alice");

    DataGrid.setLabels({ closeDialog: previous, showDetails: "Show details for {row}" });
    document.body.removeChild(grid);
});

test("detailsDisplay is inert without the RowDetails plugin", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" }, ROWS, { ResponsiveGrid });

    expect(grid.querySelector(".dg-row-details-toggle-control")).toBeNull();
    expect(dialogOf(grid)).toBeNull();

    document.body.removeChild(grid);
});

test("the shell keeps one scrollable body, the close button outside it", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog", rowDetails: () => "Application" });
    grid.getPlugin("RowDetails").expand("1");

    const dialog = dialogOf(grid);
    const panel = dialog.querySelector(":scope > .dg-details-panel");
    const header = panel.querySelector(":scope > .dg-details-header");
    const body = panel.querySelector(":scope > .dg-details-body");
    const close = dialog.querySelector(":scope > .dg-details-close");

    expect(panel).toBeTruthy();
    expect(header).toBeTruthy();
    expect(body).toBeTruthy();
    expect(close).toBeTruthy();
    expect(panel.contains(close)).toBe(false);
    expect(body.contains(close)).toBe(false);
    expect(close.getAttribute("type")).toBe("button");

    document.body.removeChild(grid);
});

test("the dialog is a direct child of the grid, outside the scroll viewport", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    grid.getPlugin("RowDetails").expand("1");

    const dialog = dialogOf(grid);
    expect(dialog.parentElement === grid).toBe(true);
    expect(dialog.closest(".dg-scroll")).toBeNull();
    expect(grid.querySelector(".dg-scroll dialog")).toBeNull();

    document.body.removeChild(grid);
});

test("the dialog is labelled by the row label and updates when the row changes", async () => {
    const grid = await makeReadyGrid({ detailsDisplay: "dialog" });
    const plugin = grid.getPlugin("RowDetails");

    plugin.expand("1");
    const dialog = dialogOf(grid);
    const title = dialog.querySelector(".dg-details-title");
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.textContent).toBe("Alice");

    grid.renderBody();
    expect(dialog.open).toBe(true);
    expect(title.textContent).toBe("Alice");

    plugin.expand("2");
    expect(title.textContent).toBe("Bob");

    document.body.removeChild(grid);
});

test("details-display is read before connection and ignored afterwards", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ ResponsiveGrid, RowDetails });
    const grid = new DataGrid({
        columns: [{ field: "name" }],
        rowLabel: "name",
        dataSource: new ArrayDataSource(ROWS),
    });
    grid.setAttribute("details-display", "dialog");
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(grid.options.detailsDisplay).toBe("dialog");
    expect(toggleOf(grid).getAttribute("aria-haspopup")).toBe("dialog");

    grid.setAttribute("details-display", "inline");
    expect(grid.options.detailsDisplay).toBe("dialog");

    document.body.removeChild(grid);
});

test("the sheet cell context has no table row", async () => {
    const contexts = [];
    const grid = await makeReadyGrid({
        detailsDisplay: "dialog",
        columns: [
            {
                field: "name",
                title: "Name",
                renderCell: (ctx) => {
                    contexts.push(ctx);
                    return ctx.value;
                },
            },
        ],
    });

    grid.getPlugin("RowDetails").expand("1");

    // The last render is the sheet: the body render before it had a `tr`.
    expect(contexts.length).toBeGreaterThan(1);
    expect(contexts.at(-1).value).toBe("Alice");
    expect(contexts.at(-1).tr).toBeUndefined();

    document.body.removeChild(grid);
});

test("cell templates render inside the record sheet", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ ResponsiveGrid, RowDetails });
    const grid = new DataGrid({
        columns: [{ field: "name" }, { field: "status" }],
        rowLabel: "name",
        detailsDisplay: "dialog",
        dataSource: new ArrayDataSource(ROWS),
    });
    grid.innerHTML = '<template data-cell="status"><span class="badge" data-dg-text="value"></span></template>';
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    grid.getPlugin("RowDetails").expand("1");
    const dd = dialogOf(grid).querySelectorAll(".dg-details-list dd")[1];
    expect(dd.dataset.value).toBe("active");
    expect(dd.querySelector(".badge").textContent).toBe("active");

    document.body.removeChild(grid);
});

test("a renderer returning a connected node is cloned into the sheet", async () => {
    const shared = document.createElement("span");
    shared.textContent = "Shared node";
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ ResponsiveGrid, RowDetails });
    const grid = new DataGrid({
        columns: [{ field: "name" }, { field: "badge", renderCell: () => shared }],
        rowLabel: "name",
        detailsDisplay: "dialog",
        dataSource: new ArrayDataSource([{ ...ROWS[0], badge: "x" }]),
    });
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    grid.getPlugin("RowDetails").expand("1");
    const dd = dialogOf(grid).querySelectorAll(".dg-details-list dd")[1];
    expect(dd.textContent).toBe("Shared node");
    expect(dd.querySelector("span") === shared).toBe(false);
    // The table keeps its own node: the sheet only received a clone.
    expect(shared.closest("td")).toBeTruthy();

    document.body.removeChild(grid);
});
