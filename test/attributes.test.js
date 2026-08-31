import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { parseBooleanAttribute, parseEnumAttribute, parseIntegerListAttribute } from "../src/utils/attributes.js";

test("parseBooleanAttribute treats bare, true and 1 as true", () => {
    expect(parseBooleanAttribute("")).toBe(true);
    expect(parseBooleanAttribute("true")).toBe(true);
    expect(parseBooleanAttribute("1")).toBe(true);
});

test("parseBooleanAttribute treats false and 0 as false", () => {
    expect(parseBooleanAttribute("false")).toBe(false);
    expect(parseBooleanAttribute("0")).toBe(false);
});

test("parseBooleanAttribute rejects unknown values", () => {
    expect(parseBooleanAttribute("maybe")).toBe(false);
});

test("parseIntegerListAttribute parses comma-separated integers", () => {
    expect(parseIntegerListAttribute("10,25,50")).toEqual([10, 25, 50]);
});

test("parseIntegerListAttribute drops invalid entries", () => {
    expect(parseIntegerListAttribute("10,abc,,50")).toEqual([10, 50]);
});

test("parseEnumAttribute accepts an allowed value", () => {
    expect(parseEnumAttribute("select", ["action", "select", "none"], "action")).toBe("select");
});

test("parseEnumAttribute falls back for unknown values", () => {
    expect(parseEnumAttribute("drag", ["action", "select", "none"], "action")).toBe("action");
});

test("DataGrid observed attributes are the declarative option surface", () => {
    expect(DataGrid.observedAttributes).toEqual([
        "src",
        "loading",
        "sortable",
        "filterable",
        "filter-delay",
        "searchable",
        "search-placeholder",
        "search-delay",
        "min-search-length",
        "responsive",
        "responsive-toggle",
        "responsive-start-open",
        "row-details-start-open",
        "selectable",
        "single-select",
        "select-visible-only",
        "row-click",
        "row-key",
        "row-label",
        "collapse-actions",
        "save-state",
        "no-data",
        "error-message",
        "page-sizes",
        "row-actions",
        "reorder",
        "menu",
        "wrap",
        "snap-columns",
        "autosize",
        "resizable",
        "autoheight",
        "autohide-pager",
        "show-page-size",
        "debug",
        "dir",
        "density",
    ]);
});

test("DataGrid exposes isolated default options without instantiation", () => {
    const first = DataGrid.defaultOptions;
    const second = DataGrid.defaultOptions;
    first.pageSizes.push(999);
    first.columns.push({ field: "changed" });

    expect(second.pageSizes).toEqual([10, 25, 50, 100, 250]);
    expect(second.columns).toEqual([]);
});

test("DataGrid parses booleans, strings, enums and integer options explicitly", () => {
    const grid = new DataGrid({ filterDelay: 300 });

    grid.setAttribute("sortable", "maybe");
    expect(grid.options.sortable).toBe(true);
    grid.setAttribute("sortable", "false");
    expect(grid.options.sortable).toBe(false);
    grid.setAttribute("row-click", "none");
    expect(grid.options.rowClick).toBe("none");
    grid.setAttribute("row-click", "invalid");
    expect(grid.options.rowClick).toBe("action");
    grid.setAttribute("filter-delay", "0");
    expect(grid.options.filterDelay).toBe(0);
    grid.setAttribute("filter-delay", "banana");
    expect(grid.options.filterDelay).toBe(0);
    grid.setAttribute("search-placeholder", "Find users");
    expect(grid.options.searchPlaceholder).toBe("Find users");
    grid.setAttribute("page-sizes", "10,abc,50");
    expect(grid.options.pageSizes).toEqual([10, 50]);
});

test("removing an option attribute restores its default", () => {
    const grid = new DataGrid({ sortable: true, filterDelay: 900 });

    grid.setAttribute("sortable", "");
    grid.setAttribute("filter-delay", "100");
    grid.removeAttribute("sortable");
    grid.removeAttribute("filter-delay");

    expect(grid.options.sortable).toBe(false);
    expect(grid.options.filterDelay).toBe(300);
});

test("an arbitrary optionChanged naming convention is not invoked", () => {
    const grid = new DataGrid();
    let calls = 0;
    grid.debugChanged = () => {
        calls++;
    };
    grid.fireEvents = true;

    grid.setAttribute("debug", "");

    expect(calls).toBe(0);
    expect(grid.options.debug).toBe(true);
});
