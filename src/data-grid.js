/**
 * Data Grid Web component
 * https://github.com/lekoala/data-grid
 */

import BaseElement from "./core/base-element.js";
import { ArrayDataSource, FetchDataSource } from "./data-source.js";
import {
    formatDateFilterQuery,
    formatTextFilterQuery,
    parseDateFilterQuery,
    parseTextFilterQuery,
} from "./filter-query.js";
import addSelectOption from "./utils/addSelectOption.js";
import applyContent from "./utils/applyContent.js";
import { parseBooleanAttribute, parseEnumAttribute, parseIntegerListAttribute } from "./utils/attributes.js";
import { MIN_COLUMN_WIDTH } from "./utils/columnWidth.js";
import debounce from "./utils/debounce.js";
import { dispatch } from "./utils/dispatch.js";
import formatValue, { getFormatDefaults } from "./utils/formatValue.js";
import getTextWidth from "./utils/getTextWidth.js";
import {
    clearMultiSelect,
    createMultiSelect,
    readMultiSelect,
    setMultiSelectValues,
    updateMultiSelectSummary,
} from "./utils/multiSelectFilter.js";
import normalizeData from "./utils/normalizeData.js";
import { supportsPopoverAnchor } from "./utils/popover.js";
import randstr from "./utils/randstr.js";
import { createSpanningRow } from "./utils/spanningRow.js";
import transformValue from "./utils/transformValue.js";

/** @typedef {import("./data-source.js").DataSource} DataSource */
/** @typedef {import("./data-source.js").QueryState} QueryState */
/** @typedef {import("./data-source.js").PageResult} PageResult */
/** @typedef {import("./data-source.js").FilterState} FilterState */
/** @typedef {import("./data-source.js").FilterOption} FilterOption */
/** @typedef {import("./data-source.js").SortState} SortState */

/**
 * Non-enumerable symbol keyed on a declarative row. Holds the snapshot of each
 * declarative cell: its original machine value, its text label and its authored
 * child nodes, so presentation survives rerenders while the value is unchanged.
 * @type {unique symbol}
 */
const DECLARATIVE_CELLS = Symbol("dgDeclarativeCells");

/**
 * @typedef DeclarativeCellMeta
 * @property {any} value - the original machine value the cell was authored for
 * @property {String} label - the user-facing text of the cell
 * @property {Node[]} content - the authored child nodes, cloned on render
 */

/**
 * Read the non-enumerable declarative-cell snapshot of a row.
 * @param {Record<string, any>} row
 * @returns {Record<string, DeclarativeCellMeta>|undefined}
 */
function declarativeCells(row) {
    return /** @type {any} */ (row)[DECLARATIVE_CELLS];
}

/**
 * Store the declarative-cell snapshot of one field on a row, as a
 * non-enumerable property so it never leaks into Object.keys / JSON / spread.
 * @param {Record<string, any>} row
 * @param {String} field
 * @param {DeclarativeCellMeta} meta
 */
function setDeclarativeCell(row, field, meta) {
    let cells = declarativeCells(row);
    if (!cells) {
        cells = {};
        Object.defineProperty(row, DECLARATIVE_CELLS, {
            value: cells,
            enumerable: false,
            configurable: true,
        });
    }
    cells[field] = meta;
}

/**
 * Options of the `date`/`datetime` formatters: native `Intl.DateTimeFormatOptions`
 * plus the `style` shortcut that maps to `dateStyle`/`timeStyle`. Explicit Intl
 * options win over the shortcut; granular component options suppress the
 * automatic default style.
 * @typedef {Intl.DateTimeFormatOptions & {
 *   style?: "full"|"long"|"medium"|"short"
 * }} DateFormatOptions
 */

/**
 * Options of the `number` formatter: native `Intl.NumberFormatOptions`. The
 * `currency`/`unit` shortcuts imply `style` unless it is set explicitly.
 * @typedef {Intl.NumberFormatOptions} NumberFormatOptions
 */

/**
 * Column definition
 * @typedef Column
 * @property {String} [field] - the key in the data
 * @property {String} [id] - stable identifier (defaults to field). Plugin columns use "$..." ids.
 * @property {Boolean} [virtual] - injected by a plugin
 * @property {"start"|"end"} [position] - order group for plugin columns
 * @property {"start"|null} [frozen] - keep the column pinned to the inline start edge while scrolling
 * @property {String} [title] - the title to display in the header (defaults to "field" if not set)
 * @property {Number} [width] - the preferred width of the column (auto otherwise)
 * @property {Number} [minWidth] - the column is never compressed below this width
 * @property {"start"|"center"|"end"|null} [align] - horizontal alignment of the column's header, body, and filter control, defaults to the formatter default when `format` is set (e.g. `number` -> `end`, `boolean` -> `center`)
 * @property {"boolean"|"date"|"datetime"|"number"|null} [format] - built-in value formatter (boolean | date | datetime | number). Use renderCell for custom DOM rendering.
 * @property {DateFormatOptions|NumberFormatOptions} [formatOptions] - Intl options for the `format` formatter, after applying the formatter defaults and convenience inferences
 * @property {String} [class] - class to set on the column (target body or header with th.class or td.class)
 * @property {String|((ctx: CellContext) => String|null|undefined)} [cellClass] - class(es) for body cells only, evaluated per row at render time. Unlike `class`, never applied to header or filter cells
 * @property {String} [attr] - don't render the column and set a matching attribute on the row with the value of the field
 * @property {Boolean} [hidden] - hide the column
 * @property {Boolean} [sortable] - disable sorting for this column (defaults to the grid-wide `sortable`)
 * @property {Boolean} [filterable] - disable filtering for this column (defaults to the grid-wide `filterable`)
 * @property {Boolean} [wrap] - allow this column's data cells to wrap (defaults to the grid-wide `wrap`)
 * @property {"uppercase"|"lowercase"|"array"|ValueTransform|null} [transform] - transforms the value displayed by the default cell renderer. Use renderCell for custom DOM/content rendering.
 * @property {Boolean} [editable] - replace with input (EditableColumn module)
 * @property {String} [editableType] - type of input (EditableColumn module)
 * @property {(value: *, ctx: Object) => (Boolean | String)} [validate] - (value, { row, column, grid }) => Boolean | error message (EditableColumn module)
 * @property {Number} [responsive] - the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)
 * @property {Boolean} [responsiveHidden] - hidden through responsive module (ResponsiveGrid module)
 * @property {"text"|"select"|"boolean"|"number"|"date"|null} [filterType] - filter control mode, defaults to the formatter hint when `format` is set (boolean: tri-state select, number: numeric input with typed equality, date: partial YYYY-MM-DD prefix match), otherwise "text"
 * @property {String} [filterPlaceholder] - a visible hint for the filter control (defaults to "…")
 * @property {Array<any>} [filterList] - defines the business options of a select filter. An empty option is prepended automatically unless the list already contains one. When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records.
 * @property {FilterOption} [firstFilterOption] - defines the empty first option of a select filter. defaults to {value: "", text: ""}
 * @property {Boolean} [filterMultiple] - supported select filters use a checkbox popover and emit `in`; older
 * browsers fall back to a single select emitting `eq`
 * @property {(th: HTMLTableCellElement, ctx: Object) => void} [renderHeaderCell] - optional custom header cell renderer (the core creates the <th>)
 * @property {(th: HTMLTableCellElement, ctx: Object) => void} [renderFilterCell] - optional custom filter cell renderer (the core creates the <th>)
 * @property {(ctx: Object) => (*)} [renderCell] - optional custom cell renderer returning content (primitive -> textContent, Node -> append, { html } -> innerHTML)
 */

/**
 * Render context passed to header/filter/cell renderers. Only `grid` and
 * `column` are always present.
 * @typedef {Object} CellContext
 * @property {DataGrid} grid
 * @property {Column} column
 * @property {Record<string, any>} [row]
 * @property {Number} [rowIndex]
 * @property {any} [value]
 * @property {HTMLTableRowElement} [tr]
 * @property {HTMLTableCellElement} [sampleTh]
 * @property {Number} [availableWidth]
 * @property {Number} [colMaxWidth]
 */

/**
 * Custom cell value transformer: `(value, ctx) => *`. Returns the value to
 * display in the default cell renderer.
 * @typedef {(value: *, ctx: CellContext) => *} ValueTransform
 */

/**
 * Row action context passed to `visible`, `disabled`, `href` and `confirm`.
 * @typedef {Object} ActionContext
 * @property {DataGrid} grid
 * @property {Action} action
 * @property {String} rowKey
 */

/**
 * Row action
 * @typedef Action
 * @property {String} name - the name of the action (button[data-action])
 * @property {String} [label] - the button label and accessible name
 * @property {String} [intent] - "default" | "primary" | "danger" (defaults to "default")
 * @property {String | Function} [href] - link for the action (string with {field} interpolation or (row, ctx) => string)
 * @property {Function} [visible] - (row, ctx) => Boolean, hides the action when falsy
 * @property {Boolean | Function} [disabled] - (row, ctx) => Boolean, disables the action when truthy (blocks the click)
 * @property {Function} [render] - ({ action, row, grid }) => content, replaces the button content (label stays the accessible name)
 * @property {Boolean | String | Function} [confirm] - boolean (generic label), message string, or (row, ctx) => Boolean | String
 * @property {Boolean} [default] - is the default row action (only the first resolved default per row applies)
 * @property {String} [class] - the class for the button
 */

/**
 * Bulk action applied to the whole selection, server-first.
 * @typedef BulkAction
 * @property {String} name - the name of the action
 * @property {String} label - the label of the button
 * @property {String} [intent] - "default" | "primary" | "danger" (defaults to "default")
 * @property {Boolean | String | Function} [confirm] - boolean (generic label), message string, or (selection, ctx) => Boolean | String
 */

/**
 * Row selection state. Single source of truth, lives in the core.
 * - "explicit": the selected row keys are in `ids`
 * - "all": every matching row is selected except the ones in `except` (server-first)
 * @typedef {Object} SelectionState
 * @property {"explicit"|"all"} mode
 * @property {Set<String>} ids - selected row keys (mode "explicit")
 * @property {Set<String>} except - unselected row keys (mode "all")
 */

/** @typedef {import("./core/base-plugin.js").Plugin} Plugin */
/** @typedef {import("./core/base-plugin.js").PluginConstructor} PluginConstructor */
/** @typedef {import("./core/base-plugin.js").PluginRegistry} PluginRegistry */
/** @typedef {import("./core/base-plugin.js").PluginInstances} PluginInstances */

/**
 * Available data grid options, plugins included
 * @typedef Options
 * @property {?String} id Custom id for the grid
 * @property {?String} src An URL to a server-side endpoint (FetchDataSource)
 * @property {Object} params Extra constant HTTP params passed to FetchDataSource
 * @property {?DataSource} [dataSource] Custom data source (defaults to FetchDataSource or ArrayDataSource)
 * @property {"eager"|"lazy"} [loading] Load immediately on connect ("eager") or defer the first data source load until the grid is near the viewport ("lazy"; only affects async sources)
 * @property {Boolean} debug Log actions in DevTools console
 * @property {Boolean} sortable Allows a sort by column functionality
 * @property {Boolean} filterable Allows a filtering functionality
 * @property {String} dir Dir
 * @property {"compact"|"default"|"comfortable"} [density] Row density (maps to --dg-padding-* tokens)
 * @property {Array<any>} pageSizes Available page size options
 * @property {Boolean} showPageSize Shows the page size select element
 * @property {Column[]} columns Available columns
 * @property {Action[]} actions Row actions (RowActions module)
 * @property {Boolean} rowActions Activate the row actions column even without static `actions` (server/HTML driven $actions)
 * @property {Function} [actionRenderer] - global action renderer: ({ action, row, grid }) => content, applied when an action has no render
 * @property {Boolean} collapseActions Group actions in a native anchored popover when supported (RowActions module)
 * @property {Boolean} wrap Allow data cells to wrap over multiple lines
 * @property {Boolean} snapColumns Snap horizontal scrolling near column starts
 * @property {Boolean} resizable Make columns resizable (ColumnResizer module)
 * @property {Boolean} selectable Allow multi-selecting rows with a checkboxes (SelectableRows module)
 * @property {Boolean} selectVisibleOnly Select all only selects visible rows (SelectableRows module)
 * @property {Boolean} singleSelect Enables single row select with radio buttons - no need to set selectable (SelectableRows module)
 * @property {"action"|"select"|"none"} [rowClick] What a click on a data row does: "action" runs the row's default action (RowActions), "select" toggles the row selection, "none" disables row clicks
 * @property {String | Function} [rowKey] The field name or a function resolving a stable row key (defaults to "id")
 * @property {String | Function | null} [rowLabel] Field name or (row, index) => string resolving the human-readable label of a row, used for accessible control names (falls back to rowKey, then index)
 * @property {BulkAction[]} [bulkActions] Bulk actions applied to the current selection (BulkActions module)
 * @property {Boolean} autosize Compute column sizes based on given data (Autosize module)
 * @property {Boolean} autoheight Adjust height so that it matches table size (FixedHeight module)
 * @property {Boolean} autohidePager auto-hides the pager when number of records falls below the selected page size
 * @property {Boolean} menu Native Popover menu positioned at header context-menu coordinates when supported (ContextMenu module)
 * @property {Boolean} reorder Allows a column reordering functionality (DraggableHeaders module)
 * @property {Boolean} responsive Change display mode on small screens (ResponsiveGrid module)
 * @property {Boolean} responsiveToggle Show toggle column (ResponsiveGrid module)
 * @property {Boolean} responsiveStartOpen Open responsive detail rows by default when columns are hidden (ResponsiveGrid module)
 * @property {((ctx: {row: Record<string, any>, rowKey: String, grid: DataGrid}) => *)|null} [rowDetails] Render expanded row content (RowDetails module)
 * @property {Boolean} rowDetailsStartOpen Open row details by default (RowDetails module)
 * @property {Number} filterDelay Debounce delay in milliseconds before a text filter is applied (0 = immediate). Enter and select changes apply immediately.
 * @property {Boolean} searchable Show the global search input (core, not a plugin)
 * @property {String} searchPlaceholder Visible hint for the search input (defaults to "…")
 * @property {Number} searchDelay Debounce delay in milliseconds before the global search is applied (0 = immediate)
 * @property {Number} minSearchLength Minimum number of characters before a search is applied (0 = always)
 * @property {String} spinnerClass Sets a space-delimited string of css classes for a spinner (use spinner-border css class for bootstrap 5 spinner)
 * @property {Boolean} saveState Enable/disable save state plugin (SaveState module)
 * @property {?String} errorMessage A generic text to be displayed in footer when error occurs.
 * @property {?String} noData A custom text to be displayed when no data is loaded. This is different from the generic labels.noData that applies for data-grid as a component.
 * @property {?String} caption A table caption, providing the accessible name of the table (falls back to aria-labelledby, then aria-label)
 * @property {?QueryState} [initialQuery] Initial runtime query state
 * @property {?PageResult} [initialResult] Initial result to display without loading the data source
 * @property {(value: *, ctx: Object) => (Boolean | String)} [validate] Grid-level editor validator, fallback when a column has no validate (EditableColumn module)
 */

/**
 * Available labels that can be translated
 * @typedef Labels
 * @property {String} itemsPerPage
 * @property {String} gotoPage
 * @property {String} gotoFirstPage
 * @property {String} gotoPrevPage
 * @property {String} gotoNextPage
 * @property {String} gotoLastPage
 * @property {String} pageRange
 * @property {String} pageStatus
 * @property {String} resultCount
 * @property {String} selectedCount
 * @property {String} selectAll
 * @property {String} selectRow
 * @property {String} toggleActions
 * @property {String} showDetails
 * @property {String} hideDetails
 * @property {String} showHiddenColumns
 * @property {String} hideHiddenColumns
 * @property {String} resizeColumn
 * @property {String} search
 * @property {String} noData
 * @property {String} loading
 * @property {String} areYouSure
 * @property {String} networkError
 * @property {String} booleanTrue - accessible label of a `format: "boolean"` cell with a true value
 * @property {String} booleanFalse - accessible label of a `format: "boolean"` cell with a false value
 */

/**
 * List of registered plugin constructors
 * @type {PluginRegistry}
 */
let plugins = {};

/**
 * Connected grid instances that can refresh labels at runtime.
 * @type {Set<DataGrid>}
 */
const connectedInstances = new Set();

/**
 * Transient per-input state (IME composition flag + debounce instance) for the
 * core text controls (global search + text column filters). Keyed weakly by the
 * input element so it never roots detached nodes.
 * @typedef {Object} TextInputState
 * @property {Boolean} composing
 * @property {((...args: any[]) => void) & { cancel: () => void, flush: () => void }} apply The debounced update, with cancel()/flush() control
 */

/**
 * @type {WeakMap<HTMLInputElement, TextInputState>}
 */
const textInputState = new WeakMap();

/**
 * @type {Labels}
 */
let labels = {
    itemsPerPage: "Items per page",
    gotoPage: "Go to page",
    gotoFirstPage: "Go to first page",
    gotoPrevPage: "Go to previous page",
    gotoNextPage: "Go to next page",
    gotoLastPage: "Go to last page",
    pageRange: "{from}–{to} / {total}",
    pageStatus: "Page {page} of {pages}",
    resultCount: "{count} items",
    selectedCount: "{count} selected",
    selectAll: "Select all rows",
    selectRow: "Select {row}",
    toggleActions: "Toggle row actions",
    showDetails: "Show details for {row}",
    hideDetails: "Hide details for {row}",
    showHiddenColumns: "Show additional columns for {row}",
    hideHiddenColumns: "Hide additional columns for {row}",
    resizeColumn: "Resize column",
    search: "Search",
    noData: "No data",
    loading: "Loading…",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
    booleanTrue: "Yes",
    booleanFalse: "No",
};

const LABEL_PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * @param {string} template
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
function formatLabel(template, values) {
    return template.replace(LABEL_PLACEHOLDER_PATTERN, (_, key) => String(values[key] ?? ""));
}

/**
 * Build a fresh, normalized QueryState.
 * @param {?QueryState} [query]
 * @returns {QueryState}
 */
function normalizeQuery(query) {
    const q = /** @type {QueryState} */ (query || {});
    const page = Math.floor(Number(q.page)) || 1;
    const pageSize = Math.floor(Number(q.pageSize)) || 10;
    const search = typeof q.search === "string" ? q.search : "";
    const sort = Array.isArray(q.sort)
        ? q.sort
              .filter((s) => s?.field)
              .map((s) => ({
                  field: String(s.field),
                  direction: /** @type {"asc"|"desc"} */ (s.direction === "desc" ? "desc" : "asc"),
              }))
        : [];
    /** @type {Record<string, FilterState>} */
    const filters = {};
    if (q.filters && typeof q.filters === "object") {
        for (const [key, filter] of Object.entries(q.filters)) {
            if (filter === null || filter === undefined) {
                continue;
            }
            let operator;
            let value;
            if (typeof filter === "object") {
                // Structured form: the operator is explicit.
                operator = filter.operator;
                if (!operator) {
                    continue;
                }
                value = filter.value;
            } else {
                // Shorthand: a scalar value means the default operator.
                operator = "contains";
                value = filter;
            }
            // Preserve valid falsy values (0, false); drop empty ones, unless
            // the operator works without a value (empty/notEmpty). An empty
            // array is an empty selection ("no filter"), not a value.
            const hasValue =
                value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
            if (hasValue || operator === "empty" || operator === "notEmpty") {
                filters[key] = /** @type {FilterState} */ (hasValue ? { operator, value } : { operator });
            }
        }
    }
    return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), search, sort, filters };
}

/**
 * Parse the declarative `<th data-field>` header row of a supplied table into
 * column definitions and an optional initial sort. Column order follows the DOM
 * order of the `<th>` elements; `data-sort` order is the sort priority.
 *
 * The parsed columns still go through convertColumns(): this helper only
 * translates HTML, it never normalizes.
 * @param {HTMLTableElement} table
 * @returns {{ columns: Column[], sort: SortState[] }}
 */
function parseDeclarativeTable(table) {
    /** @type {Column[]} */
    const columns = [];
    /** @type {SortState[]} */
    const sort = [];
    const headerRow = table.querySelector("thead > tr:first-child");
    if (!headerRow) {
        return { columns, sort };
    }
    const ths = /** @type {NodeListOf<HTMLTableCellElement>} */ (headerRow.querySelectorAll(":scope > th[data-field]"));
    for (const th of ths) {
        const field = th.dataset.field;
        if (!field) {
            continue;
        }
        /** @type {Column} */
        const column = {
            field,
            title: th.textContent.trim(),
        };
        if (th.dataset.sortable !== undefined) {
            column.sortable = parseBooleanAttribute(th.dataset.sortable);
        }
        if (th.dataset.filterable !== undefined) {
            column.filterable = parseBooleanAttribute(th.dataset.filterable);
        }
        if (th.dataset.wrap !== undefined) {
            column.wrap = parseBooleanAttribute(th.dataset.wrap);
        }
        if (th.dataset.filter) {
            // Only known modes set an explicit filter type: an invalid value
            // must not silently become an option, so the resolved default stays.
            const mode = th.dataset.filter;
            if (["text", "select", "boolean", "number", "date"].includes(mode)) {
                column.filterType = /** @type {NonNullable<Column["filterType"]>} */ (mode);
            }
        }
        if (th.dataset.filterPlaceholder !== undefined) {
            column.filterPlaceholder = th.dataset.filterPlaceholder;
        }
        if (th.dataset.responsive !== undefined) {
            const responsive = Number(th.dataset.responsive);
            if (Number.isFinite(responsive)) {
                column.responsive = responsive;
            }
        }
        if (th.dataset.frozen === "start") {
            column.frozen = "start";
        }
        if (th.dataset.hidden !== undefined) {
            column.hidden = parseBooleanAttribute(th.dataset.hidden);
        }
        if (th.dataset.editable !== undefined) {
            column.editable = parseBooleanAttribute(th.dataset.editable);
        }
        if (th.dataset.editableType) {
            column.editableType = th.dataset.editableType;
        }
        if (th.dataset.transform) {
            column.transform = /** @type {NonNullable<Column["transform"]>} */ (th.dataset.transform);
        }
        if (th.dataset.format) {
            column.format = /** @type {NonNullable<Column["format"]>} */ (th.dataset.format);
        }
        if (th.dataset.align) {
            // Only known values set an explicit alignment: an invalid value must
            // not silently become an option, so the normal grid behavior stays.
            if (["start", "center", "end"].includes(th.dataset.align)) {
                column.align = /** @type {NonNullable<Column["align"]>} */ (th.dataset.align);
            }
        }
        if (th.dataset.width !== undefined) {
            const width = Number(th.dataset.width);
            if (Number.isFinite(width)) {
                column.width = width;
            }
        }
        if (th.dataset.minWidth !== undefined) {
            const minWidth = Number(th.dataset.minWidth);
            if (Number.isFinite(minWidth)) {
                column.minWidth = minWidth;
            }
        }
        const direction = th.dataset.sort;
        if (direction === "asc" || direction === "desc") {
            sort.push({ field, direction });
        }
        columns.push(column);
    }
    return { columns, sort };
}

/**
 * Parse a `<td data-actions>` cell into row action descriptors.
 * @param {HTMLTableCellElement} td
 * @returns {Action[]}
 */
function parseActionsCell(td) {
    const actions = [];
    const elements = /** @type {NodeListOf<HTMLElement>} */ (td.querySelectorAll("[data-action]"));
    for (const el of elements) {
        const name = el.dataset.action;
        if (!name) {
            continue;
        }
        /** @type {Action} */
        const action = { name };
        const label = el.textContent.trim();
        if (label) {
            action.label = label;
        }
        const href = el.getAttribute("href");
        if (href) {
            action.href = href;
        }
        if (el.dataset.intent) {
            action.intent = el.dataset.intent;
        }
        if (el.dataset.confirm !== undefined) {
            action.confirm = el.dataset.confirm;
        }
        if (el.dataset.default !== undefined) {
            action.default = parseBooleanAttribute(el.dataset.default);
        }
        if (el.hasAttribute("disabled")) {
            action.disabled = true;
        }
        actions.push(action);
    }
    return actions;
}

/**
 * Extract the local dataset from a supplied table body. The first `<tbody>`
 * row maps to the columns by index: `value = td[data-value] ?? td.textContent`.
 * A `tr[data-row-key]` is the authoritative row identity and overrides the
 * parsed value of the `rowKey` field (when `rowKey` is a field name). Only
 * used to seed an ArrayDataSource when no explicit source exists.
 * @param {HTMLTableElement} table
 * @param {Column[]} columns
 * @param {String|Function|null} [rowKey] The configured rowKey option
 * @returns {Array<Record<string, any>>}
 */
function rowsFromTable(table, columns, rowKey = "id") {
    const tbody = table.querySelector("tbody");
    if (!tbody) {
        return [];
    }
    const rows = [];
    const trs = /** @type {NodeListOf<HTMLTableRowElement>} */ (tbody.querySelectorAll(":scope > tr"));
    for (const tr of trs) {
        /** @type {Record<string, any>} */
        const row = {};
        // `td[data-actions]` cells are consumed as actions, never as data, so
        // they cannot shift the positional column mapping.
        const tds = Array.from(
            /** @type {NodeListOf<HTMLTableCellElement>} */ (tr.querySelectorAll(":scope > td")),
        ).filter((td) => !td.hasAttribute("data-actions"));
        for (let index = 0; index < columns.length; index++) {
            const column = columns[index];
            if (!column.field) {
                continue;
            }
            const td = tds[index];
            if (!td) {
                continue;
            }
            const raw = td.dataset.value;
            if (raw !== undefined) {
                // data-value is the machine value (typed); the cell content is
                // the authored user representation, snapshotted so it survives
                // rerenders while the value is unchanged.
                row[column.field] = normalizeData(raw);
                setDeclarativeCell(row, column.field, {
                    value: row[column.field],
                    label: td.textContent.trim(),
                    content: Array.from(td.childNodes),
                });
            } else {
                row[column.field] = td.textContent.trim();
            }
        }
        const actionsCell = /** @type {HTMLTableCellElement|null} */ (tr.querySelector(":scope > td[data-actions]"));
        if (actionsCell) {
            const actions = parseActionsCell(actionsCell);
            if (actions.length) {
                row.$actions = actions;
            }
        }
        if (tr.dataset.rowKey !== undefined && typeof rowKey === "string") {
            row[rowKey] = tr.dataset.rowKey;
        }
        rows.push(row);
    }
    return rows;
}

/**
 * Order columns: plugin "start" columns first (in plugin registration order),
 * then base columns, then plugin "end" columns.
 * Start columns are unshifted by plugins, so reversing restores registration order.
 * @param {Column[]} columns
 * @returns {Column[]}
 */
function orderColumns(columns) {
    const start = [];
    const middle = [];
    const end = [];
    for (const col of columns) {
        if (col.position === "start") {
            start.push(col);
        } else if (col.position === "end") {
            end.push(col);
        } else {
            middle.push(col);
        }
    }
    return [...start.reverse(), ...middle, ...end];
}

/**
 * A column is hidden when the host/config hides it (`hidden`) or when
 * ResponsiveGrid temporarily hides it (`responsiveHidden`). These are two
 * distinct states: only `hidden` is the explicit, persisted choice.
 * @param {import("./data-grid.js").Column} column
 * @returns {Boolean}
 */
function isColumnHidden(column) {
    return Boolean(column.hidden || column.responsiveHidden);
}

/**
 * Effective alignment of a column: the explicit option wins over the formatter
 * default. Drives `data-align` on header, body, and filter cells.
 * @param {Column} column
 * @returns {String|null}
 */
function getColumnAlign(column) {
    return column.align ?? getFormatDefaults(column.format, column.formatOptions)?.align ?? null;
}

/**
 * The leading select-filter option always clears the filter. Normalize its
 * value while preserving an explicitly empty label.
 * @param {Column} column
 * @param {Column} defaultColumn
 * @returns {FilterOption}
 */
function getFirstFilterOption(column, defaultColumn) {
    const option = column.firstFilterOption || defaultColumn.firstFilterOption || { value: "", text: "" };
    return { value: "", text: option.text ?? "" };
}

/**
 * Effective filter mode of a column: the explicit option wins over the
 * formatter hint, then falls back to the generic text filter. Drives both the
 * rendered control and how `filterData()` maps its value onto a query filter.
 * @param {Column} column
 * @returns {"text"|"select"|"boolean"|"number"|"date"}
 */
function getColumnFilterType(column) {
    return column.filterType ?? getFormatDefaults(column.format, column.formatOptions)?.filter ?? "text";
}

/**
 * A percent column is the only numeric case whose displayed scale differs from
 * the raw value: `Intl.NumberFormat` multiplies by 100, so a filter typed as
 * the visible "20" must query the raw `0.2`. Kept as a small exception of the
 * number mode, not a general normalization engine.
 * @param {Column} column
 * @returns {Boolean}
 */
function isPercentColumn(column) {
    return column.format === "number" && /** @type {Record<string, any>} */ (column.formatOptions)?.style === "percent";
}

/**
 * Column definition will update some props on the html element
 * @param {HTMLElement} el
 * @param {Column} column
 */
function applyColumnDefinition(el, column) {
    if (column.width) {
        // The declared min-width (data-min-width) is an invariant: a preferred
        // width below the floor is raised to it.
        const minWidth = Number.parseInt(el.dataset.minWidth ?? "") || 0;
        el.setAttribute("width", String(Math.max(column.width, minWidth)));
    }
    if (column.class) {
        el.classList.add(...column.class.trim().split(/\s+/));
    }
    if (column.frozen === "start") {
        el.dataset.frozen = "start";
    } else {
        delete el.dataset.frozen;
    }
    if (isColumnHidden(column)) {
        el.setAttribute("hidden", "");
        if (column.responsiveHidden) {
            el.classList.add("dg-responsive-hidden");
        }
    }
    if (column.sortable === false && el.tagName === "TH") {
        el.classList.add("dg-not-sortable");
    }
}

/**
 */
class DataGrid extends BaseElement {
    /**
     * @param {Object} [options]
     */
    constructor(options = {}) {
        super(options);

        this._filterSelector = "[id^=dg-filter]";
        this._excludedRowElementSelector =
            "a,button,input,select,textarea,[contenteditable]:not([contenteditable='false']),[data-row-click-ignore]";

        /**
         * Instantiated plugins, keyed by their registration name.
         * @type {PluginInstances}
         */
        this.plugins = this._initPlugins();

        /**
         * Initial query used by resetQuery()
         * @type {QueryState}
         */
        this._initialQuery = normalizeQuery(this.options.initialQuery);

        /**
         * Runtime query state, single source of truth
         * @type {QueryState}
         */
        this._query = normalizeQuery(this._initialQuery);

        /**
         * Selection state, single source of truth for row selection
         * @type {SelectionState}
         */
        this._selection = { mode: "explicit", ids: new Set(), except: new Set() };

        /** @type {Number} */
        this._requestSeq = 0;

        /** @type {?AbortController} */
        this._controller = null;

        /**
         * Optional initial result, can be set as a property before connection
         * @type {PageResult|null}
         */
        this.initialResult = null;

        /** @type {PageResult|null} */
        this._initialResult = this.options.initialResult || this.initialResult || null;

        /**
         * Rows of the current page
         * @type {Array<Record<string, any>>}
         */
        this.rows = [];

        /**
         * Total number of rows matching the current query
         * @type {Number}
         */
        this.total = 0;

        /**
         * Meta information returned by the data source
         * @type {Record<string, any>}
         */
        this.meta = {};

        /** @type {Number} */
        this.pages = 0;

        /** @type {Boolean} */
        this.loading = false;

        /** @type {?Error} */
        this.error = null;

        /**
         * Normalized columns of the current render cycle
         * @type {Column[]}
         */
        this._columns = [];

        /**
         * The active data source, set by setupDataSource().
         * @type {DataSource|null}
         */
        this.dataSource = null;

        /**
         * DOM refs set on connect from the rendered template.
         * @type {HTMLTableElement|null}
         */
        this.table = null;

        /**
         * The table viewport: a wrapper that owns the scroll, the outer border and
         * radius, and is the sticky containing block for thead/tfoot. Guaranteed to
         * exist as a direct child of the host after `_connected()`.
         * @type {HTMLDivElement}
         */
        this.scrollEl = /** @type {HTMLDivElement} */ (document.createElement("div"));

        /** @type {HTMLInputElement|null} */
        this.btnFirst = null;

        /** @type {HTMLInputElement|null} */
        this.btnPrev = null;

        /** @type {HTMLInputElement|null} */
        this.btnNext = null;

        /** @type {HTMLInputElement|null} */
        this.btnLast = null;

        /** @type {HTMLSelectElement|null} */
        this.selectPerPage = null;

        /** @type {HTMLInputElement|null} */
        this.inputPage = null;

        /** @type {HTMLInputElement|null} */
        this.searchInput = null;

        /** @type {HTMLTableRowElement|null} */
        this.headerRow = null;

        /** @type {Number|null} */
        this.rowHeight = null;

        /** @type {IntersectionObserver|null} */
        this._loadObserver = null;

        /** @type {Boolean} */
        this._lazyPending = false;

        /**
         * Current render context, set by renderTable/renderBody.
         * @type {import("./core/base-plugin.js").RenderContext|null}
         */
        this._renderContext = null;

        /** @type {Number|null} */
        this._frozenFrame = null;
    }

    _ready() {
        this.fireEvents = false;
        if (!this.hasAttribute("id")) {
            this.setAttribute("id", this.options.id ?? randstr("el-"));
        }
        this._syncSelectionOptions();
    }

    /**
     * Instantiate the registered plugin constructors.
     * @returns {PluginInstances}
     */
    _initPlugins() {
        const instances = /** @type {PluginInstances} */ ({});
        for (const [pluginName, pluginClass] of Object.entries(plugins)) {
            instances[pluginName] = new pluginClass(this);
        }
        return instances;
    }

    static template() {
        return `
<table data-dg-generated-table>
    <thead>
        <tr class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr class="dg-head-filters"></tr>
    </thead>
    <tbody data-empty-message="${labels.noData}"></tbody>
    <tfoot hidden>
        <tr>
            <td>
            <div class="dg-footer">
                <div class="dg-footer-controls">
                <div class="dg-page-nav">
                  <span class="dg-select-field">
                    <select class="dg-select-per-page" aria-label="${labels.itemsPerPage}"></select>
                  </span>
                </div>
                <div class="dg-pagination" role="group" aria-label="${formatLabel(labels.pageStatus, { page: 0, pages: 0 })}">
                  <button type="button" class="dg-btn-first dg-rotate" title="${labels.gotoFirstPage}" aria-label="${labels.gotoFirstPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-prev dg-rotate" title="${labels.gotoPrevPage}" aria-label="${labels.gotoPrevPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <input type="number" class="dg-input-page" min="1" step="1" value="1" aria-label="${labels.gotoPage}">
                  <button type="button" class="dg-btn-next" title="${labels.gotoNextPage}" aria-label="${labels.gotoNextPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-last" title="${labels.gotoLastPage}" aria-label="${labels.gotoLastPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                </div>
                </div>
                <div class="dg-meta">${formatLabel(labels.pageRange, { from: 0, to: 0, total: 0 })}</div>
            </div>
            </td>
        </tr>
</tfoot>
</table>
<div class="dg-status" role="status" aria-atomic="true"></div>
`;
    }

    /**
     * @public
     * @returns {Labels}
     */
    get labels() {
        return labels;
    }

    /**
     * @public
     * @returns {Labels}
     */
    static getLabels() {
        return labels;
    }

    /**
     * @public
     * @param {Partial<Labels>} v
     */
    static setLabels(v) {
        labels = { ...labels, ...v };
        for (const instance of connectedInstances) {
            instance.updateLabels();
        }
    }

    /**
     * @public
     * @param {String} url
     * @returns {Promise<Partial<Labels>>}
     */
    static async loadLabels(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unable to load labels: ${response.status}`);
        }
        const nextLabels = /** @type {Partial<Labels>} */ (await response.json());
        DataGrid.setLabels(nextLabels);
        return nextLabels;
    }

    /**
     * @param {string} template
     * @param {Record<string, string | number>} values
     * @returns {string}
     */
    formatLabel(template, values) {
        return formatLabel(template, values);
    }

    /** Gets the text to be displayed when no data is loaded.
     * @public */
    get noData() {
        return this.options.noData || this.labels.noData;
    }

    /**
     * @param {HTMLTableSectionElement} tbody
     */
    _setNoData(tbody) {
        if (!this.hasDataError && tbody.getAttribute("data-empty-message") !== this.noData) {
            tbody.setAttribute("data-empty-message", this.noData);
        }
    }

    /**
     * Update the persistent status live region.
     * @param {String} text
     */
    _updateStatus(text) {
        const status = this.querySelector(".dg-status");
        if (status) {
            status.textContent = text;
        }
    }

    updateLabels() {
        if (this.selectPerPage) {
            this.selectPerPage.setAttribute("aria-label", this.labels.itemsPerPage);
        }
        if (this.inputPage) {
            this.inputPage.setAttribute("aria-label", this.labels.gotoPage);
        }
        if (this.searchInput) {
            this.searchInput.setAttribute("aria-label", this.labels.search);
            this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
        }
        /** @type {Array<[HTMLInputElement | null, String]>} */
        const buttonLabels = [
            [this.btnFirst, this.labels.gotoFirstPage],
            [this.btnPrev, this.labels.gotoPrevPage],
            [this.btnNext, this.labels.gotoNextPage],
            [this.btnLast, this.labels.gotoLastPage],
        ];
        for (const [button, label] of buttonLabels) {
            if (!button) {
                continue;
            }
            button.setAttribute("aria-label", label);
            button.setAttribute("title", label);
        }
        this._setNoData(this.tbody);
        this.updateMetaLabel();
        this.updatePageStatus();
        if (this.loading) {
            this._updateStatus(this.labels.loading);
        } else if (this.hasDataError) {
            this._updateStatus(this.tbody?.getAttribute("data-empty-message") || this.labels.networkError);
        } else {
            this._updateStatus(
                this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData,
            );
        }
        this.runPlugins("updateLabels");
    }

    updateMetaLabel() {
        const meta = this.querySelector(".dg-meta");
        if (!meta) {
            return;
        }
        const total = this.total;
        const page = this._query.page || 1;
        let high = page * this._query.pageSize;
        let low = high - this._query.pageSize + 1;
        if (high > total) {
            high = total;
        }
        if (!total) {
            low = 0;
        }
        meta.textContent = this.formatLabel(this.labels.pageRange, { from: low, to: high, total });
    }

    /**
     * Reflect the current page and page count on the pagination group label.
     * The page context stays accessible-only: the visible footer already shows
     * the range (`.dg-meta`) and the page control itself.
     */
    updatePageStatus() {
        const pagination = this.querySelector(".dg-pagination");
        if (!pagination) {
            return;
        }
        const pages = this.totalPages();
        pagination.setAttribute(
            "aria-label",
            this.formatLabel(this.labels.pageStatus, { page: this._query.page || 1, pages }),
        );
    }

    /**
     * @returns {Column}
     */
    get defaultColumn() {
        return {
            field: "",
            title: "",
            width: 0,
            class: "",
            attr: "",
            hidden: false,
            editable: false,
            responsive: 1,
            responsiveHidden: false,
            frozen: null,
            transform: null,
            format: null,
            align: null,
            // Null means "no explicit choice": the effective mode resolves as
            // explicit filterType > formatter hint > "text".
            filterType: null,
            filterPlaceholder: "_",
            firstFilterOption: { value: "", text: "" },
            filterMultiple: false,
        };
    }

    /**
     * @returns {Options}
     */
    get defaultOptions() {
        return {
            id: null,
            src: "",
            params: {},
            loading: "eager",
            debug: false,
            sortable: false,
            filterable: false,
            menu: false,
            reorder: false,
            dir: "ltr",
            density: "default",
            pageSizes: [10, 25, 50, 100, 250],
            showPageSize: true,
            columns: [],
            actions: [],
            rowActions: false,
            collapseActions: false,
            selectable: false,
            selectVisibleOnly: true,
            singleSelect: false,
            rowClick: "action",
            rowKey: "id",
            rowLabel: null,
            bulkActions: [],
            resizable: false,
            // Off by default: columns without a preferred width stay flexible
            // and absorb the remaining space. Turning it on asks the plugin to
            // measure those columns and pin them to a computed width.
            autosize: false,
            wrap: false,
            snapColumns: false,
            autoheight: true,
            autohidePager: false,
            responsive: false,
            responsiveToggle: true,
            responsiveStartOpen: false,
            rowDetails: null,
            rowDetailsStartOpen: false,
            filterDelay: 300,
            searchable: false,
            searchPlaceholder: "…",
            searchDelay: 300,
            minSearchLength: 0,
            spinnerClass: "",
            saveState: false,
            errorMessage: "",
            noData: "",
            caption: "",
            initialQuery: null,
            initialResult: null,
            dataSource: null,
        };
    }

    /**
     * Determines if the grid is initialized.
     * @returns {Boolean}
     */
    get isInit() {
        return this.classList.contains("dg-initialized");
    }

    /**
     * Determines if data load has failed.
     * @returns {Boolean}
     */
    get hasDataError() {
        return Boolean(this.error);
    }

    /**
     * Snapshot of the current query state.
     * @public
     * @returns {QueryState}
     */
    get query() {
        return normalizeQuery(this._query);
    }

    /**
     * Convenience read-only accessor for the current page.
     * @public
     * @returns {Number}
     */
    get page() {
        return this._query.page;
    }

    /**
     * Register plugin constructors, keyed by name. The core instantiates them
     * on each DataGrid construction. Names are not limited to built-in plugins.
     * @public
     * @param {PluginRegistry} list
     */
    static registerPlugins(list) {
        plugins = list;
    }

    /**
     * @public
     * @param {?String} [plugin]
     */
    static unregisterPlugins(plugin = null) {
        if (plugin === null) {
            plugins = {};
        } else {
            delete plugins[plugin];
        }
    }

    /**
     * @public
     * @returns {PluginRegistry}
     */
    static registeredPlugins() {
        return plugins;
    }

    /**
     * Run a lifecycle hook on all registered plugins, in registration order.
     * @param {String} hook
     * @param {...any} args
     */
    runPlugins(hook, ...args) {
        for (const plugin of Object.values(this.plugins)) {
            const fn = /** @type {Record<string, any>} */ (plugin)[hook];
            if (typeof fn === "function") {
                fn.call(plugin, ...args);
            }
        }
    }

    /**
     * Build the normalized column list: base columns + plugin columns, ordered.
     * @returns {Column[]}
     */
    buildColumns() {
        const columns = this.convertColumns(this.options.columns);
        this.runPlugins("extendColumns", columns);
        return orderColumns(columns);
    }

    /**
     * The normalized column list of the current render cycle, for inspection.
     * Read-only: mutating the returned objects is not a supported way to
     * configure the grid (a rerender rebuilds columns from the options).
     * @public
     * @returns {Column[]}
     */
    getColumns() {
        return this._columns;
    }

    /**
     * Return an instantiated plugin by its registration name.
     * @public
     * @param {String} name
     * @returns {Plugin|undefined}
     */
    getPlugin(name) {
        return this.plugins[name];
    }

    /**
     * @param {Record<string, any>|Array<any>} columns
     * @returns {Column[]}
     */
    convertColumns(columns) {
        const cols = [];
        // Convert key:value objects to actual columns
        if (typeof columns === "object" && !Array.isArray(columns)) {
            for (const key of Object.keys(columns)) {
                const col = Object.assign({}, this.defaultColumn);
                col.title = columns[key];
                col.field = key;
                cols.push(col);
            }
        } else {
            for (const item of columns) {
                let col = Object.assign({}, this.defaultColumn);
                if (typeof item === "string") {
                    col.title = item;
                    col.field = item;
                } else if (typeof item === "object") {
                    col = Object.assign(col, item);
                    if (!col.field) {
                        console.error("Invalid column definition", item);
                    }
                    if (!col.title) {
                        col.title = col.field;
                    }
                } else {
                    console.error("Column definition must be a string or an object");
                }
                cols.push(col);
            }
        }
        return cols;
    }

    /**
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#reflected-dom-attributes
     * @returns {Array<any>}
     */
    static get observedAttributes() {
        return [
            "src",
            "loading",
            "sortable",
            "filterable",
            "searchable",
            "search-placeholder",
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
        ];
    }

    /**
     * Custom attribute transformers, keyed by attribute name.
     * @returns {Record<string, (raw: string) => any>}
     */
    get transformAttributes() {
        return {
            "page-sizes": parseIntegerListAttribute,
            // A valueless attribute parses to "true" and a removal to null:
            // normalize both back to the documented default.
            "row-click": (raw) => parseEnumAttribute(raw, ["action", "select", "none"], "action"),
        };
    }

    /** @returns {HTMLTableSectionElement} */
    get thead() {
        return /** @type {HTMLTableSectionElement} */ (this.querySelector("thead"));
    }

    /** @returns {HTMLTableSectionElement} */
    get tbody() {
        return /** @type {HTMLTableSectionElement} */ (this.querySelector("tbody"));
    }

    /** @returns {HTMLTableSectionElement} */
    get tfoot() {
        return /** @type {HTMLTableSectionElement} */ (this.querySelector("tfoot"));
    }

    /**
     * Pick the data source based on configuration.
     */
    setupDataSource() {
        if (this.options.dataSource) {
            this.dataSource = this.options.dataSource;
        } else if (this.options.src) {
            this.dataSource = new FetchDataSource(this.options.src, { params: this.options.params });
        } else {
            this.dataSource = new ArrayDataSource([]);
        }
    }

    /**
     * Seed the initial query from optional page / page-size attributes.
     */
    setupInitialState() {
        if (!this._initialResult) {
            this._initialResult = this.options.initialResult || this.initialResult || null;
        }
        if (this.options.initialQuery) {
            return;
        }
        if (this.hasAttribute("page-size")) {
            const pageSize = Number.parseInt(this.getAttribute("page-size") ?? "");
            if (pageSize) {
                this._query.pageSize = pageSize;
                this._initialQuery.pageSize = pageSize;
            }
        }
        if (this.hasAttribute("page")) {
            const page = Number.parseInt(this.getAttribute("page") ?? "");
            if (page) {
                this._query.page = page;
                this._initialQuery.page = page;
            }
        }
    }

    /**
     * Merge a patch into the query state and reload.
     * Changing search, filters, sort or pageSize resets the page to 1 unless an
     * explicit page is provided in the patch. Changing search or filters
     * (population changes) also clears the selection, since a `mode: "all"`
     * selection only means something for the population it was created on.
     * @public
     * @param {Partial<QueryState>} patch
     * @returns {Promise<void>}
     */
    setQuery(patch) {
        const next = normalizeQuery(this._query);
        const resetsPage =
            patch.search !== undefined ||
            patch.filters !== undefined ||
            patch.sort !== undefined ||
            patch.pageSize !== undefined;
        const changesPopulation = patch.search !== undefined || patch.filters !== undefined;
        if (patch.pageSize !== undefined) next.pageSize = patch.pageSize;
        if (patch.search !== undefined) next.search = patch.search;
        if (patch.sort !== undefined) next.sort = patch.sort;
        if (patch.filters !== undefined) next.filters = patch.filters;
        if (resetsPage && patch.page === undefined) next.page = 1;
        if (patch.page !== undefined) next.page = patch.page;
        this._query = normalizeQuery(next);
        if (changesPopulation) {
            this._clearSelectionIfNeeded();
        }
        // While lazy and not yet first-loaded, only accumulate the query
        // state. The first load (when the grid becomes visible) uses it.
        if (this._lazyPending) {
            return Promise.resolve();
        }
        return this.refresh();
    }

    /**
     * Reset the query to its initial state and reload.
     * @public
     * @returns {Promise<void>}
     */
    resetQuery() {
        this._query = normalizeQuery(this._initialQuery);
        this._clearSelectionIfNeeded();
        return this.refresh();
    }

    /**
     * Reload the result matching the current query.
     * @public
     * @returns {Promise<void>}
     */
    refresh() {
        return this.load();
    }

    /**
     * Single load path: abort previous request, load the current query,
     * protect against stale responses, then render.
     * @public
     * @returns {Promise<void>}
     */
    async load() {
        // An explicit load is a request for data now: bypass any pending lazy
        // deferral so the observer is disarmed and the fetch proceeds.
        if (this._lazyPending) {
            this._lazyPending = false;
            this._loadObserver?.disconnect();
            this._loadObserver = null;
        }
        const requestId = ++this._requestSeq;
        this._controller?.abort();
        const controller = new AbortController();
        this._controller = controller;

        this.loading = true;
        this.error = null;
        this.setAttribute("data-loading", "");
        this.removeAttribute("data-error");
        this._updateStatus(this.labels.loading);

        try {
            let result;
            if (this._initialResult) {
                result = this._initialResult;
                this._initialResult = null;
            } else {
                const ds = this.dataSource;
                if (!ds) {
                    throw new Error("No data source");
                }
                result = await ds.load(this.query, { signal: controller.signal });
            }
            if (requestId !== this._requestSeq) return;
            if (this.applyResult(result)) {
                // The requested page does not exist anymore (e.g. the dataset
                // shrank after a deletion): refetch on the last valid page.
                return this.refresh();
            }
            this._updateStatus(
                this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData,
            );
        } catch (err) {
            if (requestId !== this._requestSeq) return;
            const e = /** @type {any} */ (err);
            if (e?.name === "AbortError" || controller.signal.aborted) return;
            const message =
                this.options.errorMessage || e?.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || this.labels.networkError;
            this.error = e;
            this.setAttribute("data-error", "");
            this.tbody?.setAttribute("data-empty-message", message);
            this._updateStatus(message);
            this.renderBody();
            dispatch(this, "loadError", e);
        } finally {
            if (requestId === this._requestSeq) {
                this.loading = false;
                this.removeAttribute("data-loading");
            }
        }
    }

    /**
     * Apply a PageResult and render.
     * @param {PageResult} result
     */
    applyResult(result) {
        this.rows = result.rows || [];
        this.total = result.total ?? this.rows.length;
        this.meta = result.meta || {};

        // When the grid was created without declared columns, the first loaded
        // row infers the schema. Rebuild the structural part (header, footer,
        // plugin columns) once, so it matches the freshly inferred columns.
        const inferredColumns = this.options.columns.length === 0 && this.rows.length > 0;
        if (inferredColumns) {
            // `$actions` is reserved for per-row actions, never a data column.
            const fields = Object.keys(this.rows[0]).filter((field) => field !== "$actions");
            this.options.columns = this.convertColumns(fields);
        } else {
            this.options.columns = this.convertColumns(this.options.columns);
        }

        const requestedPage = this._query.page;
        this.fixPage();
        if (this.total > 0 && requestedPage > this.pages) {
            // The requested page does not exist anymore: the caller refetches
            // on the last valid page instead of showing an empty page.
            return true;
        }
        if (inferredColumns) {
            this.renderTable();
        }
        this.renderBody();
        return false;
    }

    /**
     * Pick the data source based on configuration.
     */
    srcChanged() {
        this.setupDataSource();
        this._clearSelectionIfNeeded();
        return this.refresh();
    }

    dirChanged() {
        this.setAttribute("dir", this.options.dir);
    }

    showPageSizeChanged() {
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
        this.selectPerPage?.closest(".dg-select-field")?.toggleAttribute("hidden", !this.options.showPageSize);
    }

    responsiveChanged() {
        this.runPlugins("responsiveChanged", this.options.responsive);
        this.renderTable();
    }

    snapColumnsChanged() {
        this.classList.toggle("dg-snap-columns", Boolean(this.options.snapColumns));
    }

    wrapChanged() {
        if (this.table) {
            this.renderBody();
        }
    }

    rowDetailsStartOpenChanged() {
        if (this.table) {
            this.renderBody();
        }
    }

    menuChanged() {
        this.renderHeader();
    }

    selectableChanged() {
        this.renderTable();
        this.renderBody();
    }

    /**
     * singleSelect implies selectable: enforce the invariant without clobbering
     * an explicit selectable option when singleSelect is turned back off.
     */
    _syncSelectionOptions() {
        if (this.options.singleSelect) {
            this.options.selectable = true;
        }
    }

    singleSelectChanged() {
        this._syncSelectionOptions();

        // Switching from multi to single select restarts from an empty
        // selection, so the "singleSelect implies at most one selected row"
        // invariant always holds without an arbitrary pick among the previous
        // ids (which may also be a mode "all" selection).
        if (this.options.singleSelect) {
            this._clearSelectionIfNeeded();
        }

        this.selectableChanged();
    }

    rowClickChanged() {
        if (this.table) {
            this.renderBody();
        }
    }

    reorderChanged() {
        this.renderTable();
    }

    sortableChanged() {
        this.renderTable();
    }

    filterableChanged() {
        this.renderTable();
    }

    searchableChanged() {
        this.renderSearch();
    }

    searchPlaceholderChanged() {
        if (this.searchInput) {
            this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
        }
    }

    /**
     * Populate the page size select according to options
     */
    populatePageSizes() {
        if (!this.selectPerPage) {
            return;
        }
        while (this.selectPerPage.lastChild) {
            this.selectPerPage.removeChild(this.selectPerPage.lastChild);
        }
        for (const v of this.options.pageSizes) {
            addSelectOption(this.selectPerPage, v, v, v === this._query.pageSize);
        }
    }

    /**
     * Lazily create the shared top bar: `.dg-topbar > .dg-topbar-start +
     * .dg-topbar-end`, inserted before the table. Both the bulk actions plugin
     * and the core search control use it.
     * @returns {HTMLDivElement}
     */
    ensureTopbar() {
        let topbar = /** @type {HTMLDivElement|null} */ (this.querySelector(".dg-topbar"));
        if (!topbar) {
            topbar = document.createElement("div");
            topbar.className = "dg-topbar";
            const start = document.createElement("div");
            start.className = "dg-topbar-start";
            const end = document.createElement("div");
            end.className = "dg-topbar-end";
            topbar.append(start, end);
            // The topbar lives outside the scroll viewport, above .dg-scroll.
            this.insertBefore(topbar, this.scrollEl);
        }
        return topbar;
    }

    /**
     * Create (once) or remove the global search input based on the `searchable`
     * option. The control is kept stable across renders to avoid focus loss.
     */
    renderSearch() {
        if (!this.options.searchable) {
            this.searchInput?.closest(".dg-search-field")?.remove();
            this.searchInput = null;
            return;
        }
        if (this.searchInput) {
            this.searchInput.setAttribute("aria-label", this.labels.search);
            this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
            return;
        }
        const input = document.createElement("input");
        input.type = "search";
        input.name = "search";
        input.className = "dg-search";
        input.setAttribute("placeholder", this.options.searchPlaceholder);
        input.setAttribute("aria-label", this.labels.search);
        input.value = this._query.search;

        const field = document.createElement("span");
        field.className = "dg-search-field";
        const icon = document.createElement("span");
        icon.className = "dg-search-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" focusable="false">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
        </svg>`;
        field.append(icon, input);

        // The visible value can temporarily diverge from query.search: it is
        // only committed when it becomes valid (see commitSearch). The
        // selection is invalidated as soon as the value changes, so a bulk
        // action never targets the population of a previous search. Events are
        // delegated to the host; only the per-input IME/debounce state lives
        // here.
        textInputState.set(input, {
            composing: false,
            apply: debounce(() => this.commitSearch(), this.options.searchDelay),
        });

        this.ensureTopbar().querySelector(".dg-topbar-end")?.appendChild(field);
        this.searchInput = input;
    }

    /**
     * Commit the current search input value to the query. An empty value clears
     * the search; a non-empty value below `minSearchLength` is ignored so the
     * current results stay in place.
     * @returns {Promise<void>|undefined}
     */
    commitSearch() {
        const input = this.searchInput;
        if (!input) {
            return;
        }
        const value = input.value;
        if (value !== "" && value.length < this.options.minSearchLength) {
            return;
        }
        if (value === this._query.search) {
            return;
        }
        return this.setQuery({ search: value });
    }

    /**
     * Adopt a supplied `<table>` (a direct child that is not the generated
     * template table). The supplied table keeps its own attributes, caption
     * and colgroup; the grid installs its generated header rows, tbody and
     * tfoot. A declarative `<th data-field>` row defines the columns (it wins
     * over `options.columns`); when no explicit data source exists, the
     * declarative `<tbody>` becomes the local ArrayDataSource dataset.
     * Idempotent: the adopted table is marked `data-dg-table` and is never
     * re-parsed or re-seeded.
     */
    _adoptDeclarativeTable() {
        const adopted = /** @type {HTMLTableElement|null} */ (this.querySelector(":scope > table[data-dg-table]"));
        const generated = /** @type {HTMLTableElement|null} */ (
            this.querySelector(":scope > table[data-dg-generated-table]")
        );
        if (adopted) {
            // Already adopted on a previous connect: a re-injected generated
            // table is redundant.
            generated?.remove();
            return;
        }
        if (!generated) {
            return;
        }
        const supplied = /** @type {HTMLTableElement|undefined} */ (
            Array.from(this.querySelectorAll(":scope > table")).find((table) => table !== generated)
        );
        if (!supplied) {
            return;
        }

        // The supplied table is author-owned for attributes, caption and
        // colgroup: keep an existing caption as the accessible name instead of
        // letting updateTableLabel remove it.
        const caption = supplied.querySelector("caption");
        if (caption && !this.options.caption) {
            this.options.caption = caption.textContent.trim();
        }

        const { columns, sort } = parseDeclarativeTable(supplied);
        if (columns.length) {
            this.options.columns = columns;
        }
        if (supplied.querySelector("thead th[data-actions]")) {
            this.options.rowActions = true;
        }
        if (!this.options.initialQuery && sort.length) {
            this._initialQuery.sort = sort;
            this._query.sort = sort;
        }

        // Local dataset: declarative body rows become the data when no source
        // is configured. A `<tr data-row-key>` is the authoritative row id.
        const effectiveColumns = columns.length ? columns : this.convertColumns(this.options.columns);
        if (!this.options.dataSource && !this.options.src && effectiveColumns.length) {
            this.options.dataSource = new ArrayDataSource(
                rowsFromTable(supplied, effectiveColumns, this.options.rowKey),
            );
        }

        // Ownership: the declarative header row is consumed once, the grid
        // installs its own tbody and tfoot (replacing any user-provided ones).
        supplied.querySelector("thead > tr:first-child")?.remove();
        if (generated) {
            const tbody = generated.querySelector("tbody");
            const tfoot = generated.querySelector("tfoot");
            supplied.querySelector("tbody")?.remove();
            supplied.querySelector("tfoot")?.remove();
            if (tbody) {
                supplied.appendChild(tbody);
            }
            if (tfoot) {
                supplied.appendChild(tfoot);
            }
            generated.remove();
        }
        supplied.setAttribute("data-dg-table", "");
    }

    /**
     * Make the table viewport an explicit structural invariant: a direct
     * `.dg-scroll` child of the host that owns the scroll, the outer border and
     * radius, and is the sticky containing block. Idempotent and reconnect-safe
     * (a `.dg-scroll` from a previous connect is reused, its table re-located).
     */
    _wrapScroll() {
        const existing = /** @type {HTMLDivElement|null} */ (this.querySelector(":scope > .dg-scroll"));
        if (existing) {
            existing.className = "dg-scroll";
            existing.tabIndex = 0;
            this.scrollEl = existing;
            const table = /** @type {HTMLTableElement|null} */ (existing.querySelector(":scope > table"));
            if (table) {
                this.table = table;
            }
            return;
        }
        const scroll = document.createElement("div");
        scroll.className = "dg-scroll";
        scroll.tabIndex = 0;
        if (this.table) {
            this.insertBefore(scroll, this.table);
            scroll.appendChild(this.table);
        } else {
            this.appendChild(scroll);
        }
        this.scrollEl = scroll;
    }

    async _connected() {
        connectedInstances.add(this);
        this._adoptDeclarativeTable();
        this.table = this.querySelector("table");
        this._wrapScroll();
        this.btnFirst = this.querySelector(".dg-btn-first");
        this.btnPrev = this.querySelector(".dg-btn-prev");
        this.btnNext = this.querySelector(".dg-btn-next");
        this.btnLast = this.querySelector(".dg-btn-last");
        this.selectPerPage = this.querySelector(".dg-select-per-page");
        this.inputPage = this.querySelector(".dg-input-page");

        // Declarative attributes are reflected into options before this hook
        // runs, but the upgrade-time attributeChangedCallback never fires the
        // *Changed handlers (fireEvents is still false). Restore the option
        // invariants here so the first render sees them.
        this._syncSelectionOptions();

        // Core UI is delegated to the host: the instance is its own event
        // listener and routes bubbled events to the matching control. This
        // keeps rerendered chrome (filters, sort headers) working without
        // reinstalling per-element listeners.
        this.addEventListener("click", this);
        this.addEventListener("change", this);
        this.addEventListener("input", this);
        this.addEventListener("keydown", this);
        this.addEventListener("mouseover", this);
        this.addEventListener("compositionstart", this);
        this.addEventListener("compositionend", this);
        this.addEventListener("columnResized", this);
        this.addEventListener("columnReordered", this);
        this.addEventListener("columnVisibility", this);
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
        this.selectPerPage?.closest(".dg-select-field")?.toggleAttribute("hidden", !this.options.showPageSize);

        this.setupDataSource();
        this.setupInitialState();

        for (const plugin of Object.values(this.plugins)) {
            await plugin.connected?.();
        }

        // Display even if we don't have data
        this.dirChanged();
        this.snapColumnsChanged();
        this.populatePageSizes();
        this.updateLabels();
        this.renderSearch();

        await this.init();
    }

    _disconnected() {
        connectedInstances.delete(this);
        this._loadObserver?.disconnect();
        this._loadObserver = null;
        this._controller?.abort();
        // Cancel any pending per-input debounce before it can fire on a
        // detached element.
        for (const input of this.querySelectorAll("input")) {
            textInputState.get(input)?.apply.cancel();
            textInputState.delete(input);
        }

        this.removeEventListener("click", this);
        this.removeEventListener("change", this);
        this.removeEventListener("input", this);
        this.removeEventListener("keydown", this);
        this.removeEventListener("mouseover", this);
        this.removeEventListener("compositionstart", this);
        this.removeEventListener("compositionend", this);
        this.removeEventListener("columnResized", this);
        this.removeEventListener("columnReordered", this);
        this.removeEventListener("columnVisibility", this);
        if (this._frozenFrame !== null) {
            cancelAnimationFrame(this._frozenFrame);
            this._frozenFrame = null;
        }

        for (const plugin of Object.values(this.plugins)) {
            plugin.disconnected?.();
        }
    }

    /**
     * Route delegated core UI events to the matching handler. This overrides
     * BaseElement's generic routing because the host (not a cached control) is
     * now the listener target.
     * @param {Event} event
     * @returns {void}
     */
    handleEvent(event) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        switch (event.type) {
            case "click":
                this._handleClick(event, target);
                break;
            case "change":
                this._handleChange(event, target);
                break;
            case "input":
                this._handleInput(target);
                break;
            case "keydown":
                this._handleKeydown(/** @type {KeyboardEvent} */ (event), target);
                break;
            case "mouseover":
                this._handleMouseover(target);
                break;
            case "compositionstart":
                this._handleComposition(target, true);
                break;
            case "compositionend":
                this._handleComposition(target, false);
                break;
            default:
                super.handleEvent(event);
        }
    }

    /**
     * A control is owned by this grid when it lives inside this host (not a
     * nested grid), so bubbled events from an inner grid never affect the outer
     * one.
     * @param {Element|null|undefined} element
     * @returns {Boolean}
     */
    _ownsControl(element) {
        return Boolean(element && element.closest("data-grid") === this);
    }

    /**
     * Expose the full text through the native tooltip when a data cell is
     * visually truncated. Resolve this on hover so the measurement always
     * reflects the current column width, including user resizing.
     * @param {Element} target
     */
    _handleMouseover(target) {
        const cell = /** @type {HTMLTableCellElement|null} */ (target.closest("tbody td"));
        if (!cell || !this._ownsControl(cell)) {
            return;
        }
        const generated = cell.hasAttribute("data-dg-overflow-title");
        if (cell.hasAttribute("title") && !generated) {
            return;
        }
        const truncated = !cell.classList.contains("dg-wrap") && cell.scrollWidth > cell.clientWidth;
        const text = cell.textContent.trim();
        if (truncated && text) {
            cell.title = text;
            cell.setAttribute("data-dg-overflow-title", "");
        } else if (generated) {
            cell.removeAttribute("title");
            cell.removeAttribute("data-dg-overflow-title");
        }
    }

    /**
     * Cancel the pending text-input debounces of inputs within `root` and drop
     * their state. Used before replacing a filter row so a stale update never
     * fires on a detached element.
     * @param {Element} root
     */
    _cancelTextInputs(root) {
        for (const input of root.querySelectorAll("input")) {
            textInputState.get(input)?.apply.cancel();
            textInputState.delete(input);
        }
    }

    /**
     * @param {Event} event
     * @param {Element} target
     * @returns {*}
     */
    _handleClick(event, target) {
        const pager = target.closest(".dg-btn-first, .dg-btn-prev, .dg-btn-next, .dg-btn-last");
        if (pager && this._ownsControl(pager)) {
            if (pager.classList.contains("dg-btn-first")) return this.getFirst();
            if (pager.classList.contains("dg-btn-prev")) return this.getPrev();
            if (pager.classList.contains("dg-btn-next")) return this.getNext();
            if (pager.classList.contains("dg-btn-last")) return this.getLast();
            return;
        }

        // Only the sort button itself delegates sorting, so a click on any other
        // header control (resize handle, ...) never triggers a sort.
        const sortButton = target.closest(".dg-sort");
        if (sortButton && this._ownsControl(sortButton)) {
            const th = /** @type {HTMLTableCellElement} */ (sortButton.closest("th.dg-sortable"));
            if (th) {
                return this.sortData(th);
            }
        }

        // Data row clicks follow the delegated rowClick policy. Responsive and
        // detail rows are not dg-data-row and never match.
        const tr = /** @type {HTMLTableRowElement|null} */ (target.closest("tr.dg-data-row"));
        if (tr && this._ownsControl(tr) && this.options.rowClick !== "none") {
            const rowIndex = Number(tr.dataset.rowIndex);
            const row = this.rows[rowIndex];
            if (row) {
                return this._handleRowClick(event, row, rowIndex);
            }
        }
    }

    /**
     * A click inside a row is excluded when it originates from an interactive
     * element or a subtree explicitly opting out. The whole composed path is
     * inspected so a control living in a shadow root still counts.
     * @param {Event} event
     * @returns {Boolean}
     */
    _isRowClickExcluded(event) {
        const selector = this._excludedRowElementSelector;
        const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
        for (const node of path) {
            if (node instanceof Element && node.matches(selector)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Apply the configured row click policy to a data row click. The cancelable
     * `rowClick` event always fires first so business logic can veto the
     * automatic behavior with preventDefault().
     * @param {Event} event
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @returns {*}
     */
    _handleRowClick(event, row, rowIndex) {
        if (this._isRowClickExcluded(event)) {
            return;
        }

        if (
            !dispatch(
                this,
                "rowClick",
                {
                    row,
                    rowKey: this.resolveRowKey(row, rowIndex),
                    rowIndex,
                    originalEvent: event,
                },
                { cancelable: true },
            )
        ) {
            return;
        }

        if (this.options.rowClick === "select") {
            if (this.options.selectable) {
                return this.toggleRow(row, rowIndex);
            }
            return;
        }

        if (this.options.rowClick === "action") {
            const rowActions = /** @type {import("./plugins/row-actions.js").default | undefined} */ (
                this.getPlugin("RowActions")
            );
            return rowActions?.activateDefaultAction(rowIndex);
        }
    }

    /**
     * @param {Event} event
     * @param {Element} target
     * @returns {*}
     */
    _handleChange(event, target) {
        const pageSize = target.closest(".dg-select-per-page");
        if (this._ownsControl(pageSize)) {
            return this.changePerPage();
        }

        const page = target.closest(".dg-input-page");
        if (this._ownsControl(page)) {
            return this.gotoPage();
        }

        // Select column filters apply on change; text filters run through input.
        const filter = /** @type {HTMLSelectElement|null} */ (target.closest(this._filterSelector));
        if (filter && this._ownsControl(filter) && /select/i.test(filter.tagName)) {
            return this.filterData();
        }

        // Multi-select checkboxes apply on change like selects do
        const multi = target.closest(".dg-multiselect");
        if (multi && this._ownsControl(multi)) {
            updateMultiSelectSummary(/** @type {HTMLElement} */ (multi));
            return this.filterData();
        }
    }

    /**
     * @param {Element} target
     * @returns {void}
     */
    _handleInput(target) {
        const search = target.closest(".dg-search");
        if (this._ownsControl(search)) {
            this._clearSelectionIfNeeded();
            const state = textInputState.get(/** @type {HTMLInputElement} */ (search));
            if (state && !state.composing) {
                state.apply();
            }
            return;
        }

        const filter = target.closest(this._filterSelector);
        if (this._ownsControl(filter)) {
            const state = textInputState.get(/** @type {HTMLInputElement} */ (filter));
            if (state && !state.composing) {
                state.apply();
            }
        }
    }

    /**
     * @param {KeyboardEvent} event
     * @param {Element} target
     * @returns {*}
     */
    _handleKeydown(event, target) {
        if (event.key === "Enter") {
            const page = target.closest(".dg-input-page");
            if (this._ownsControl(page)) {
                event.preventDefault();
                return this.gotoPage();
            }
            const state = textInputState.get(/** @type {HTMLInputElement} */ (target));
            if (this._ownsControl(target) && state && !state.composing && !event.isComposing) {
                event.preventDefault();
                state.apply.flush();
                return;
            }
        }

        if (event.key === "Escape") {
            const input = /** @type {HTMLInputElement} */ (target);
            const state = textInputState.get(input);
            if (this._ownsControl(target.closest(".dg-search")) && state && input.value) {
                input.value = "";
                state.apply.cancel();
                return this.commitSearch();
            }
            const filter = /** @type {HTMLInputElement|null} */ (target.closest(this._filterSelector));
            if (this._ownsControl(filter) && state && input.value) {
                input.value = "";
                state.apply.cancel();
                return this.filterData();
            }
        }
    }

    /**
     * @param {Element} target
     * @param {Boolean} composing
     * @returns {void}
     */
    _handleComposition(target, composing) {
        const input = /** @type {HTMLInputElement} */ (target.closest(`.dg-search, ${this._filterSelector}`));
        if (!input || !this._ownsControl(input)) {
            return;
        }
        const state = textInputState.get(input);
        if (!state) {
            return;
        }
        state.composing = composing;
        if (!composing) {
            state.apply();
        }
    }

    init() {
        if (this._deferInitialLoad()) {
            // Build the chrome and mark the grid initialized now; only the
            // first async data source load is deferred until it's near the
            // viewport (or an explicit load/refresh is requested).
            this.configureUi();
            this.classList.add("dg-initialized"); //acts as a flag to prevent unnecessary server calls down the chain.
            this.fireEvents = true;
            this._lazyPending = true;
            this._observeInitialLoad();
            this.log("initialized (lazy)");
            return;
        }
        return this.load().finally(() => {
            this.configureUi();

            this.classList.add("dg-initialized"); //acts as a flag to prevent unnecessary server calls down the chain.

            this.fireEvents = true; // We can now fire attributeChangedCallback events

            this.log("initialized");
        });
    }

    /**
     * Whether the initial data source load should be deferred until the grid
     * is near the viewport. Only async sources benefit: a purely declarative
     * local table and a provided initialResult have no fetch worth deferring.
     * @returns {Boolean}
     */
    _deferInitialLoad() {
        return (
            this.options.loading === "lazy" &&
            !this._initialResult &&
            (Boolean(this.options.src) || Boolean(this.options.dataSource))
        );
    }

    /**
     * Watch the grid and trigger the first load once it is near the viewport.
     * The observer is intended to be one-shot and is disconnected on the first
     * intersection.
     */
    _observeInitialLoad() {
        this._loadObserver = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }
                this._loadObserver?.disconnect();
                this._loadObserver = null;
                this._lazyPending = false;
                this.load().finally(() => this.configureUi());
            },
            { rootMargin: "200px 0px" },
        );
        this._loadObserver.observe(this);
    }

    /**
     * @param {String} field
     * @returns {Column|null}
     */
    getCol(field) {
        for (const col of this.options.columns) {
            if (col.field === field) {
                return col;
            }
        }
        return null;
    }

    /**
     * @param {String} field
     * @param {String} prop
     * @returns {any}
     */
    getColProp(field, prop) {
        const c = this.getCol(field);
        return c ? /** @type {Record<string, any>} */ (c)[prop] : null;
    }

    /**
     * @param {String} field
     * @param {String} prop
     * @param {any} val
     */
    setColProp(field, prop, val) {
        const c = this.getCol(field);
        if (c) {
            /** @type {Record<string, any>} */ (c)[prop] = val;
        }
    }

    /**
     * Stable structural identity of a column, used for the `data-column-id`
     * DOM convention shared by the core and the plugins.
     * @param {Column} column
     * @returns {String}
     */
    getColumnId(column) {
        return column.id ?? column.field ?? "";
    }

    /**
     * Find a column by its stable structural id (`column.id ?? column.field`).
     * @param {String} id
     * @returns {Column|null}
     */
    getColumnById(id) {
        return this.getColumns().find((column) => this.getColumnId(column) === id) ?? null;
    }

    /**
     * Create a column cell (<th> or <td>) tagged with its stable column id and
     * styled by the column definition.
     * @param {"th"|"td"} tag
     * @param {Column} column
     * @returns {HTMLTableCellElement}
     */
    _createColumnCell(tag, column) {
        const cell = document.createElement(tag);
        cell.dataset.columnId = this.getColumnId(column);
        applyColumnDefinition(cell, column);
        // Alignment is shared by header, body, and filter cells; `data-format`
        // stays a body-only theming hook for the rendered cell.
        const align = getColumnAlign(column);
        if (align) {
            cell.dataset.align = align;
        }
        if (tag === "td" && column.format) {
            cell.dataset.format = column.format;
        }
        return cell;
    }

    visibleColumns() {
        return this.options.columns.filter((col) => {
            return !isColumnHidden(col);
        });
    }

    /**
     * Whether a column can be sorted: the grid-wide option must be on and the
     * column must not explicitly opt out with `sortable: false`.
     * @param {Column} column
     * @returns {Boolean}
     */
    isColumnSortable(column) {
        return Boolean(this.options.sortable && column.sortable !== false);
    }

    /**
     * Whether a column can be filtered: the grid-wide option must be on and the
     * column must not explicitly opt out with `filterable: false`.
     * @param {Column} column
     * @returns {Boolean}
     */
    isColumnFilterable(column) {
        return Boolean(this.options.filterable && column.filterable !== false);
    }

    hiddenColumns() {
        return this.options.columns.filter((col) => {
            return isColumnHidden(col);
        });
    }

    /**
     * Reconcile the rendered cells (header, filters and body) with the current
     * column visibility without rebuilding the DOM. Used whenever only the
     * visibility changed: showColumn/hideColumn and ResponsiveGrid adaptations.
     * The column list is rebuilt so plugin columns (ex: the responsive toggle)
     * reflect their fresh hidden state.
     */
    _syncColumnVisibility() {
        this._columns = this.buildColumns();
        for (const column of this.getColumns()) {
            const id = this.getColumnId(column);
            const hidden = isColumnHidden(column);
            for (const cell of this.querySelectorAll(`[data-column-id="${id}"]`)) {
                cell.toggleAttribute("hidden", hidden);
                cell.classList.toggle("dg-responsive-hidden", Boolean(column.responsiveHidden));
            }
        }
        this._syncSpanningCells();
        this.renderFooter();
        this.queueFrozenSync();
    }

    /** Keep auxiliary full-width rows aligned with the visible column list. */
    _syncSpanningCells() {
        const colspan = Math.max(1, this.columnsLength(true));
        for (const cell of this.querySelectorAll("[data-dg-span-columns]")) {
            cell.setAttribute("colspan", String(colspan));
        }
    }

    /** Queue one frozen-column geometry pass for the next frame. */
    queueFrozenSync() {
        if (this._frozenFrame !== null) {
            return;
        }
        this._frozenFrame = requestAnimationFrame(() => {
            this._frozenFrame = null;
            this.syncFrozenColumns();
        });
    }

    /**
     * Measure visible frozen columns and assign their logical sticky offsets.
     * @public
     */
    syncFrozenColumns() {
        if (!this.headerRow || !this.scrollEl) {
            return;
        }
        for (const cell of this.querySelectorAll("[data-frozen-edge]")) {
            cell.removeAttribute("data-frozen-edge");
        }
        let offset = 0;
        let edgeCells = /** @type {HTMLElement[]} */ ([]);
        for (const column of this.getColumns()) {
            if (column.frozen !== "start" || isColumnHidden(column) || column.attr) {
                continue;
            }
            const id = this.getColumnId(column);
            const cells = /** @type {HTMLElement[]} */ ([...this.querySelectorAll(`[data-column-id="${id}"]`)]).filter(
                (cell) => cell.closest("data-grid") === this,
            );
            const header = /** @type {HTMLElement|undefined} */ (
                cells.find((cell) => cell.parentElement?.classList.contains("dg-head-columns"))
            );
            if (!header) {
                continue;
            }
            for (const cell of cells) {
                cell.style.setProperty("--dg-frozen-offset", `${offset}px`);
            }
            edgeCells = cells;
            offset += header.offsetWidth;
        }
        for (const cell of edgeCells) {
            cell.setAttribute("data-frozen-edge", "");
        }
        this.scrollEl.style.setProperty("--dg-frozen-start-width", `${offset}px`);
    }

    oncolumnResized() {
        this.queueFrozenSync();
    }

    oncolumnReordered() {
        this.queueFrozenSync();
    }

    oncolumnVisibility() {
        this.queueFrozenSync();
    }

    /**
     * @public
     * @param {String} field
     * @param {Boolean} [render]
     */
    showColumn(field, render = true) {
        this.setColProp(field, "hidden", false);

        if (render) this._syncColumnVisibility();

        dispatch(this, "columnVisibility", {
            col: field,
            visibility: "visible",
        });
    }

    /**
     * @public
     * @param {String} field
     * @param {Boolean} [render]
     */
    hideColumn(field, render = true) {
        this.setColProp(field, "hidden", true);

        if (render) this._syncColumnVisibility();

        dispatch(this, "columnVisibility", {
            col: field,
            visibility: "hidden",
        });
    }

    /**
     * Number of rendered columns of the current column list.
     * @param {Boolean} visibleOnly
     * @returns {Number}
     */
    columnsLength(visibleOnly = false) {
        let len = 0;
        for (const col of this.getColumns()) {
            if (visibleOnly && isColumnHidden(col)) {
                continue;
            }
            if (!col.attr) {
                len++;
            }
        }
        return len;
    }

    /**
     * Global configuration and renderTable
     * This should be called after your data has been loaded
     */
    configureUi() {
        if (!this.table) return this;
        this.table.style.visibility = "hidden";
        this.renderTable();
        if (!this.options.responsive) {
            this.table.style.visibility = "visible";
        }

        // Store row height for later usage
        if (!this.rowHeight) {
            const tr = /** @type {HTMLTableRowElement|null} */ (
                this.querySelector("tbody tr") || this.querySelector("table tr")
            );
            if (tr) {
                this.rowHeight = tr.offsetHeight;
            }
        }
        this._setNoData(this.tbody);
        return this.fixPage();
    }

    /**
     * Resolve the stable key of a row.
     * @param {Record<string, any>} row
     * @param {Number} [index] Fallback index (current page) when the row has no key
     * @returns {String}
     */
    resolveRowKey(row, index = 0) {
        const rowKey = this.options.rowKey;
        let key;
        if (typeof rowKey === "function") {
            key = rowKey(row);
        } else if (rowKey) {
            key = row[rowKey];
        }
        return key === undefined || key === null ? String(index) : String(key);
    }

    /**
     * Human-readable label of a row, used for accessible control names.
     * Resolved from `options.rowLabel` (field or function), falling back to
     * the row key, then the row index.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     * @returns {String}
     */
    getRowLabel(row, index = 0) {
        const resolver = this.options.rowLabel;
        if (typeof resolver === "function") {
            return String(resolver(row, index));
        }
        if (typeof resolver === "string" && resolver) {
            const v = row?.[resolver];
            if (v !== undefined && v !== null && v !== "") {
                return String(v);
            }
        }
        return this.resolveRowKey(row, index);
    }

    /**
     * Whether a row is part of the current selection.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     * @returns {Boolean}
     */
    isRowSelected(row, index = 0) {
        const key = this.resolveRowKey(row, index);
        const sel = this._selection;
        return sel.mode === "all" ? !sel.except.has(key) : sel.ids.has(key);
    }

    /**
     * Find the row of the current page matching a row key.
     * @param {String} rowKey
     * @returns {Record<string, any>|undefined}
     */
    findRowByKey(rowKey) {
        const wanted = String(rowKey);
        return this.rows.find((row) => this.resolveRowKey(row) === wanted);
    }

    /**
     * Mutate a row of the current page in place and re-render the body.
     * Works with any data source: it never reloads, so a server grid reflects
     * a business mutation without a second request. With an ArrayDataSource the
     * paginated rows are references to the source objects, so the source is
     * updated too.
     * @public
     * @param {String} rowKey
     * @param {Record<string, any>} patch
     * @returns {Boolean} Whether a matching row was found
     */
    updateRow(rowKey, patch) {
        const row = this.findRowByKey(rowKey);
        if (!row) {
            return false;
        }
        Object.assign(row, patch);
        this.renderBody();
        return true;
    }

    /**
     * Remove a row from the local dataset. Only applies when the data source
     * owns a mutable local collection (ArrayDataSource): the row is removed
     * from the source and the query is re-applied. With a remote data source
     * this returns false — refresh after a server-side deletion instead.
     * @public
     * @param {String} rowKey
     * @returns {Boolean} Whether the row was removed
     */
    removeRow(rowKey) {
        const ds = /** @type {any} */ (this.dataSource);
        if (!ds || !Array.isArray(ds.rows)) {
            return false;
        }
        const wanted = String(rowKey);
        const index = ds.rows.findIndex((/** @type {Record<string, any>} */ row) => this.resolveRowKey(row) === wanted);
        if (index === -1) {
            return false;
        }
        ds.rows.splice(index, 1);
        this.refresh();
        return true;
    }

    /**
     * Resolve the actions to render for a row. A `row.$actions` array is
     * authoritative: it lists which actions are available and can override
     * their descriptors (strings are looked up by name in the definitions,
     * objects are merged over them). Without `$actions`, the static
     * `options.actions` are used. Definitions combine `meta.actions` (server
     * base) overridden by `options.actions` (client).
     * @param {Record<string, any>} row
     * @returns {Action[]}
     */
    getActionsForRow(row) {
        if (row.$actions === undefined) {
            return this.options.actions;
        }
        /** @type {Record<string, Action>} */
        const definitions = {};
        for (const [name, definition] of Object.entries(this.meta?.actions ?? {})) {
            definitions[name] = { name, ...definition };
        }
        for (const action of this.options.actions) {
            definitions[action.name] = { ...definitions[action.name], ...action };
        }
        const resolved = [];
        for (const item of row.$actions) {
            if (typeof item === "string") {
                const definition = definitions[item];
                if (definition) {
                    resolved.push(definition);
                }
            } else if (item && typeof item === "object") {
                const base = definitions[item.name];
                resolved.push(base ? { ...base, ...item } : item);
            }
        }
        return resolved;
    }

    /**
     * Snapshot of the current selection state.
     * @public
     * @returns {SelectionState}
     */
    getSelectionState() {
        return {
            mode: this._selection.mode,
            ids: new Set(this._selection.ids),
            except: new Set(this._selection.except),
        };
    }

    /**
     * Select a row (single select keeps at most one key).
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    selectRow(row, index = 0) {
        const key = this.resolveRowKey(row, index);
        const sel = this._selection;
        if (this.options.singleSelect) {
            sel.mode = "explicit";
            sel.ids.clear();
            sel.except.clear();
            sel.ids.add(key);
        } else if (sel.mode === "all") {
            sel.except.delete(key);
        } else {
            sel.ids.add(key);
        }
        this._selectionChanged();
    }

    /**
     * Deselect a row.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    deselectRow(row, index = 0) {
        const key = this.resolveRowKey(row, index);
        const sel = this._selection;
        if (sel.mode === "all") {
            sel.except.add(key);
        } else {
            sel.ids.delete(key);
        }
        this._selectionChanged();
    }

    /**
     * Toggle the selection state of a row.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    toggleRow(row, index = 0) {
        if (this.isRowSelected(row, index)) {
            this.deselectRow(row, index);
        } else {
            this.selectRow(row, index);
        }
    }

    /**
     * Select all visible rows (or everything when selectVisibleOnly is false).
     * @public
     */
    selectAll() {
        if (this.options.selectVisibleOnly) {
            const ids = new Set(this.rows.map((row, i) => this.resolveRowKey(row, i)));
            this._selection = { mode: "explicit", ids, except: new Set() };
        } else {
            this._selection = { mode: "all", ids: new Set(), except: new Set() };
        }
        this._selectionChanged();
    }

    /**
     * Reset the selection and refresh the UI.
     * @public
     */
    clearSelection() {
        this._selection = { mode: "explicit", ids: new Set(), except: new Set() };
        this._selectionChanged();
    }

    /**
     * Clear the selection only when it is not already empty, to avoid firing a
     * `selectionChange` on every population change once nothing is selected.
     */
    _clearSelectionIfNeeded() {
        const selection = this._selection;
        if (selection.mode === "explicit" && selection.ids.size === 0) {
            return;
        }
        this.clearSelection();
    }

    /**
     * Get selected rows or specific fields from selected rows.
     * Only reflects the currently loaded page.
     * For cross-page/server-side selection, use getSelectionState().
     * If no keys are provided, returns the full row objects.
     * If one key is provided, returns an array of values for that key.
     * If multiple keys are provided, returns an array of objects with those keys and values.
     * In single select mode, returns a single object or value.
     * @public
     * @param {...String} keys - Field names to select from each row.
     * @returns {Array<any>|Object} Selected rows, values, or objects depending on selection and keys.
     */
    getSelection(...keys) {
        const selected = [];
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (!this.isRowSelected(row, i)) {
                continue;
            }
            if (keys.length === 0) {
                selected.push(row);
            } else if (keys.length === 1) {
                selected.push(row[keys[0]]);
            } else {
                selected.push(Object.fromEntries(keys.map((k) => [k, row[k]])));
            }
        }
        return this.options.singleSelect ? (selected[0] ?? {}) : selected;
    }

    /**
     * Reflect the selection on the DOM and notify listeners.
     * The core owns the tr[data-selected] state attribute.
     */
    _selectionChanged() {
        const tbody = this.tbody;
        if (tbody) {
            const trs = Array.from(tbody.querySelectorAll("tr.dg-data-row"));
            for (let i = 0; i < this.rows.length; i++) {
                const tr = trs[i];
                if (!tr || tr.classList.contains("dg-fake-row")) {
                    continue;
                }
                if (this.isRowSelected(this.rows[i], i)) {
                    tr.setAttribute("data-selected", "");
                } else {
                    tr.removeAttribute("data-selected");
                }
            }
        }
        dispatch(this, "selectionChange", { selectionState: this.getSelectionState() });
    }

    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    getFirst() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: 1 });
    }

    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    getLast() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: this.pages });
    }

    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    getPrev() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: Math.max(1, this._query.page - 1) });
    }

    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    getNext() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: this._query.page + 1 });
    }

    /**
     * @returns {Promise<void>|undefined}
     */
    gotoPage() {
        if (!this.inputPage) {
            return;
        }
        const pages = this.totalPages();
        const page = Number.parseInt(this.inputPage.value);
        const clamped = Number.isFinite(page) ? Math.min(Math.max(1, page), pages) : this._query.page;
        if (clamped === this._query.page) {
            this.fixPage();
            return;
        }
        return this.setQuery({ page: clamped });
    }

    /**
     * This is the callback for the select control
     * @returns {Promise<void>|undefined}
     */
    changePerPage() {
        const select = this.selectPerPage;
        if (!select) {
            return;
        }
        const pageSize = Number.parseInt(select.options[select.selectedIndex].value);
        return this.setQuery({ pageSize });
    }

    /**
     * Sort direction of a column based on the current query.
     * @param {String} field
     * @returns {"asc"|"desc"|null}
     */
    getColumnSortDirection(field) {
        const s = (this._query.sort || []).find((x) => x.field === field);
        return s?.direction ?? null;
    }

    /**
     * Trigger sort based on the current header state.
     * @param {?Element} [baseCol] The column that was clicked or null to use current sort
     * @returns {Promise<void>|undefined}
     */
    sortData(baseCol = null) {
        this.log("sort data");

        let col = baseCol;

        // Early exit
        if (col) {
            const field = col.getAttribute("field");
            const column = field ? this.getCol(field) : null;
            if (column && !this.isColumnSortable(column)) {
                this.log("sorting prevented because column is not sortable");
                return;
            }
        }

        // We clicked on a column, update sort state
        if (col === null) {
            // Or fetch current sort
            col = this.querySelector("thead tr.dg-head-columns th[aria-sort]");
        }
        if (!col) {
            return;
        }

        const current = col.getAttribute("aria-sort");
        let next;
        if (!current) {
            next = "ascending";
        } else if (current === "ascending") {
            next = "descending";
        } else {
            next = null;
        }

        const sort =
            next === null
                ? []
                : [
                      {
                          field: col.getAttribute("field") ?? "",
                          direction: /** @type {"asc"|"desc"} */ (next === "ascending" ? "asc" : "desc"),
                      },
                  ];

        // Reflect the sort state on the headers immediately
        const headers = this.querySelectorAll("thead tr.dg-head-columns th");
        for (const th of headers) {
            const match = sort.find((s) => s.field === th.getAttribute("field"));
            if (match) {
                th.setAttribute("aria-sort", match.direction === "asc" ? "ascending" : "descending");
                th.setAttribute("data-sort", match.direction);
            } else {
                th.removeAttribute("aria-sort");
                th.removeAttribute("data-sort");
            }
        }

        return this.setQuery({ sort });
    }

    /**
     * @param {String} columnName
     * @param {"asc"|"desc"|"none"} direction
     * @returns {Promise<void>}
     */
    _sort(columnName, direction) {
        // The capability is enforced on the programmatic API too: sorting can
        // not bypass a column-level `sortable: false`. sortNone stays allowed.
        if (direction !== "none") {
            const column = this.getCol(columnName);
            if (column && !this.isColumnSortable(column)) {
                this.log("sorting prevented because column is not sortable");
                return Promise.resolve();
            }
        }
        return this.setQuery({ sort: direction === "none" ? [] : [{ field: columnName, direction }] });
    }

    /**
     * @public
     * @param {String} columnName
     * @returns {Promise<void>}
     */
    sortAsc(columnName) {
        return this._sort(columnName, "asc");
    }

    /**
     * @public
     * @param {String} columnName
     * @returns {Promise<void>}
     */
    sortDesc(columnName) {
        return this._sort(columnName, "desc");
    }

    /**
     * @public
     * @param {String} columnName
     * @returns {Promise<void>}
     */
    sortNone(columnName) {
        return this._sort(columnName, "none");
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    clearFilters() {
        const inputs = /** @type {NodeListOf<HTMLInputElement|HTMLSelectElement|HTMLDivElement>} */ (
            this.querySelectorAll(this._filterSelector)
        );
        for (const input of inputs) {
            if (input.dataset.filterMode === "multi") {
                clearMultiSelect(input);
                continue;
            }
            /** @type {HTMLInputElement|HTMLSelectElement} */ (input).value = "";
        }
        return this.filterData();
    }

    /**
     * Set the global search and reload. The server decides which fields the
     * search covers; `ArrayDataSource` applies a generic scalar match.
     * @public
     * @param {String} search
     * @returns {Promise<void>}
     */
    setSearch(search) {
        const value = typeof search === "string" ? search : `${search ?? ""}`;
        if (this.searchInput) {
            this.searchInput.value = value;
        }
        return this.setQuery({ search: value });
    }

    /**
     * Clear the global search and reload.
     * @public
     * @returns {Promise<void>}
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = "";
        }
        return this.setQuery({ search: "" });
    }

    /**
     * Collect current filter inputs into the query and reload. Each control's
     * resolved mode (data-filter-mode) decides how its value maps onto a
     * query operator.
     */
    filterData() {
        this.log("filter data");

        /** @type {Record<string, FilterState>} */
        const filters = {};
        const inputs = /** @type {NodeListOf<HTMLInputElement|HTMLSelectElement|HTMLDivElement>} */ (
            this.querySelectorAll(this._filterSelector)
        );
        for (const input of inputs) {
            const name = input.dataset.name;
            if (!name) {
                continue;
            }
            // A multi select maps its checked boxes onto an `in` filter; an
            // empty selection means no filter at all.
            if (input.dataset.filterMode === "multi") {
                const values = readMultiSelect(input);
                if (values.length) {
                    filters[name] = { operator: "in", value: values };
                }
                continue;
            }
            const value = /** @type {HTMLInputElement|HTMLSelectElement} */ (input).value;
            if (value) {
                const mode = /** @type {"text"|"select"|"boolean"|"number"|"date"|undefined} */ (
                    input.dataset.filterMode
                );
                if (mode === "text") {
                    filters[name] = parseTextFilterQuery(value);
                } else if (mode === "boolean") {
                    filters[name] = { operator: "eq", value: value === "true" };
                } else if (mode === "number") {
                    const parsed = parseTextFilterQuery(value);
                    const num = Number(parsed.value);
                    const isPercent = input.dataset.percent === "true";
                    // Substring match on the raw value so partial digits match
                    // (12 -> 129.9). A percent column divides by 100: the user
                    // types the visible scale (20) and queries the raw fraction
                    // (0.2).
                    filters[name] = {
                        operator: parsed.operator,
                        value: Number.isFinite(num) ? (isPercent ? num / 100 : num) : parsed.value,
                    };
                } else if (mode === "date") {
                    filters[name] = parseDateFilterQuery(value);
                } else {
                    const isSelect = /select/i.test(input.tagName);
                    filters[name] = {
                        operator: isSelect ? "eq" : "contains",
                        value,
                    };
                }
            }
        }
        return this.setQuery({ filters });
    }

    renderTable() {
        this.log("render table");

        this._columns = this.buildColumns();
        this.runPlugins("beforeRender");
        this._renderContext = "table";
        this.updateTableLabel();
        this.renderHeader();
        this.renderFooter();
        this.runPlugins("afterRender", this._renderContext);
        this.queueFrozenSync();
    }

    /**
     * Give the table an accessible name: a real <caption> when options.caption
     * is set, otherwise propagate the host aria-labelledby / aria-label.
     */
    updateTableLabel() {
        const table = this.table;
        if (!table) {
            return;
        }
        const caption = this.options.caption;
        let cap = table.querySelector("caption");
        if (caption) {
            if (!cap) {
                cap = document.createElement("caption");
                table.insertBefore(cap, table.firstChild);
            }
            cap.textContent = caption;
            table.removeAttribute("aria-labelledby");
            table.removeAttribute("aria-label");
            this.scrollEl.setAttribute("role", "region");
            this.scrollEl.setAttribute("aria-label", caption);
            this.scrollEl.removeAttribute("aria-labelledby");
        } else {
            cap?.remove();
            const labelledby = this.getAttribute("aria-labelledby");
            const ariaLabel = this.getAttribute("aria-label");
            if (labelledby) {
                table.setAttribute("aria-labelledby", labelledby);
                table.removeAttribute("aria-label");
                this.scrollEl.setAttribute("role", "region");
                this.scrollEl.setAttribute("aria-labelledby", labelledby);
                this.scrollEl.removeAttribute("aria-label");
            } else if (ariaLabel) {
                table.setAttribute("aria-label", ariaLabel);
                table.removeAttribute("aria-labelledby");
                this.scrollEl.setAttribute("role", "region");
                this.scrollEl.setAttribute("aria-label", ariaLabel);
                this.scrollEl.removeAttribute("aria-labelledby");
            } else {
                table.removeAttribute("aria-labelledby");
                table.removeAttribute("aria-label");
                this.scrollEl.removeAttribute("role");
                this.scrollEl.removeAttribute("aria-labelledby");
                this.scrollEl.removeAttribute("aria-label");
            }
        }
    }

    /**
     * Create table header
     * - One row for the column headers
     * - One row for the filters
     */
    renderHeader() {
        this.log("render header");

        const thead = this.thead;
        this.createColumnHeaders(thead);
        this.createColumnFilters(thead);

        dispatch(this, "headerRendered");
    }

    renderFooter() {
        this.log("render footer");

        const tfoot = this.tfoot;
        if (!tfoot) return;
        const td = tfoot.querySelector("td");
        if (!td) return;
        tfoot.removeAttribute("hidden");
        // Never emit a colspan of 0 (invalid, collapses to one column)
        td.colSpan = Math.max(1, this.columnsLength(true));
        tfoot.style.display = "";
    }

    /**
     * Create the column headers based on the normalized column list.
     * The core creates the <th> and its structural attributes, then a column
     * renderHeaderCell (or the default renderer) fills it.
     * @param {HTMLTableSectionElement} thead
     */
    createColumnHeaders(thead) {
        // @link https://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively
        // The table fits in the scroll viewport, not the host.
        const availableWidth = this.scrollEl.clientWidth;
        const colMaxWidth = Math.round((availableWidth / this.columnsLength(true)) * 2);

        // Create row
        const tr = document.createElement("tr");
        this.headerRow = tr;
        tr.setAttribute("class", "dg-head-columns");

        // We need a real th from the dom to compute the size
        const oldRow = /** @type {HTMLTableRowElement|null} */ (thead?.querySelector("tr.dg-head-columns") ?? null);
        let sampleTh = /** @type {HTMLTableCellElement | null} */ (oldRow?.querySelector("th") ?? null);
        this.log("createColumnHeaders - sampleTh", sampleTh);
        let seededSample = false;
        if (!sampleTh) {
            sampleTh = document.createElement("th");
            if (oldRow) {
                // Keep the measurement cell in the row that will be replaced,
                // so it is laid out while the new row is built.
                oldRow.appendChild(sampleTh);
            } else {
                // Declarative table without the standard header row: seed the
                // new row and attach it now; the cell is removed once measured.
                seededSample = true;
                tr.appendChild(sampleTh);
                thead?.appendChild(tr);
            }
        }

        // Create columns
        this.log("createColumnHeaders - columns", this.getColumns());

        for (const column of this.getColumns()) {
            if (column.attr) {
                continue;
            }
            const th = document.createElement("th");
            th.setAttribute("scope", "col");
            th.setAttribute("data-column-id", this.getColumnId(column));
            if (!column.virtual) {
                th.setAttribute("id", randstr("dg-col-"));
                th.setAttribute("field", column.field ?? "");
            }

            const ctx = { grid: this, column, sampleTh, availableWidth, colMaxWidth };
            if (column.renderHeaderCell) {
                column.renderHeaderCell(th, ctx);
            } else {
                this.renderDefaultHeaderCell(th, ctx);
            }
            // Plugin header renderers only add their structural classes; apply
            // the full column definition (width, class, hidden, dg-not-sortable)
            // uniformly so header and body share the same geometry and styling
            // hooks, including virtual columns carrying their own width.
            applyColumnDefinition(th, column);
            // The header follows the column alignment so the title shares the
            // axis of its values (explicit option > formatter default).
            const align = getColumnAlign(column);
            if (align) {
                th.dataset.align = align;
            }

            tr.appendChild(th);
        }

        // The measurement cell seeded for a declarative table is not a column.
        if (seededSample) {
            sampleTh.remove();
        }

        if (thead && oldRow) {
            thead.replaceChild(tr, oldRow);
        }
        // When there was no standard header row, the row was already attached
        // before the column cells were created.

        // Once columns are inserted, we have an actual dom to query
        if (thead && thead.offsetWidth > availableWidth) {
            this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
            const scrollbarWidth = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
            let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
            if (this.options.responsive) {
                diff += scrollbarWidth;
            }
            // Remove diff for columns that can afford it
            const thWithWidth = /** @type {NodeListOf<HTMLTableCellElement>} */ (tr.querySelectorAll("th[width]"));

            for (const th of thWithWidth) {
                if (th.classList.contains("dg-not-resizable")) {
                    continue;
                }
                if (diff <= 0) {
                    continue;
                }
                const actualWidth = Number.parseInt(th.getAttribute("width") ?? "");
                const minWidth = Number.parseInt(th.dataset.minWidth ?? "") || 0;
                if (actualWidth > minWidth) {
                    let newWidth = actualWidth - diff;
                    if (newWidth < minWidth) {
                        newWidth = minWidth;
                    }
                    diff -= actualWidth - newWidth;
                    th.setAttribute("width", String(newWidth));
                }
            }
        }
    }

    /**
     * Default header cell renderer for base columns.
     * @param {HTMLTableCellElement} th
     * @param {CellContext} ctx
     */
    renderDefaultHeaderCell(th, ctx) {
        const { column, sampleTh } = ctx;
        const sortable = this.isColumnSortable(column);
        if (sortable) {
            th.classList.add("dg-sortable");
        }
        if (this.options.responsive) {
            th.setAttribute("data-responsive", String(column.responsive || ""));
        }
        // Column sizing contract: the minimum is the largest of the intrinsic
        // header width, an explicit minWidth and the formatter floor; the
        // preferred width is the explicit `width` or the formatter suggestion;
        // without a preferred width the column stays flexible and absorbs the
        // remaining space. Never emit an invalid width: no attribute at all.
        const defaults = getFormatDefaults(column.format, column.formatOptions);
        const intrinsicWidth = getTextWidth(column.title ?? "", sampleTh ?? document.body, true) + 20;
        const effectiveMin = Math.max(MIN_COLUMN_WIDTH, intrinsicWidth, column.minWidth ?? 0, defaults?.minWidth ?? 0);
        th.dataset.minWidth = `${effectiveMin}`;
        applyColumnDefinition(th, column);

        // `column.width` is 0 when unset (defaultColumn), so the falsy check is
        // intentional: 0 means "no preferred width".
        const preferredWidth = column.width || defaults?.width;
        if (preferredWidth !== undefined && Number.isFinite(preferredWidth)) {
            const width = Math.max(effectiveMin, preferredWidth);
            th.setAttribute("width", String(width));
            // Preferred width before the compression phase: ResponsiveGrid
            // reasons on this value instead of the post-compression width.
            th.dataset.preferredWidth = String(width);
        } else {
            th.removeAttribute("width");
            delete th.dataset.preferredWidth;
        }
        if (isColumnHidden(column)) {
            th.setAttribute("hidden", "");
        }

        if (sortable) {
            const direction = this.getColumnSortDirection(column.field ?? "");
            if (direction) {
                th.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
                th.setAttribute("data-sort", direction);
            }
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add("dg-sort");

            const label = document.createElement("span");
            label.classList.add("dg-sort-label");
            label.textContent = column.title ?? "";

            // Always-visible affordance: neutral glyph when unsorted, the
            // direction glyph when active. Kept out of the accessibility tree
            // (aria-hidden) so the accessible name stays just the column title.
            const indicator = document.createElement("span");
            indicator.classList.add("dg-sort-indicator");
            indicator.setAttribute("aria-hidden", "true");

            button.append(label, indicator);
            th.appendChild(button);
        } else {
            th.textContent = column.title ?? "";
        }
    }

    /**
     * @param {HTMLTableSectionElement} thead
     */
    createColumnFilters(thead) {
        let idx = 0;

        // Create row for filters
        const tr = document.createElement("tr");
        tr.setAttribute("class", "dg-head-filters");
        if (!this.options.filterable) {
            tr.setAttribute("hidden", "");
        }

        // The header cells are indexed the same way (same column iteration order)
        const headerThs = /** @type {HTMLTableCellElement[]} */ (
            Array.from(thead?.querySelectorAll("tr.dg-head-columns th") ?? [])
        );
        this.log("createColumnFilters - columns", this.getColumns());
        for (const column of this.getColumns()) {
            if (column.attr) {
                continue;
            }
            const relatedTh = headerThs[idx];
            if (!relatedTh) {
                console.warn("Related th not found", idx);
                continue;
            }
            const th = this._createColumnCell("th", column);

            // A non-filterable column keeps its <th> so the filter row stays
            // aligned with the header, but renders no control.
            if (this.isColumnFilterable(column)) {
                th.classList.add("dg-filter-cell");
                const ctx = { grid: this, column };
                if (column.renderFilterCell) {
                    column.renderFilterCell(th, ctx);
                } else {
                    this.renderDefaultFilterCell(th, column, relatedTh);
                }
            }

            if (isColumnHidden(column)) {
                th.setAttribute("hidden", "");
            }

            tr.appendChild(th);
            idx++;
        }

        const oldRow = thead?.querySelector("tr.dg-head-filters");
        // A replaced filter row must have its pending text-input debounces
        // cancelled, or a stale update could fire on a detached element.
        if (oldRow) {
            this._cancelTextInputs(oldRow);
        }
        if (thead && oldRow) {
            thead.replaceChild(tr, oldRow);
        } else if (thead && !tr.parentNode) {
            thead.appendChild(tr);
        }

        // Filter event handling is delegated to the host: select filters apply
        // on change, text filters via live input. Only the per-input IME /
        // debounce state is registered here so a rerender needs no listener
        // re-attachment.
        const filteredRows = tr.querySelectorAll(this._filterSelector);
        for (const el of filteredRows) {
            // Native selects apply on change; the multi select is not a text
            // input either, only plain inputs need a debounced state here.
            if (/select/i.test(el.tagName) || el.classList.contains("dg-multiselect")) {
                continue;
            }
            const input = /** @type {HTMLInputElement} */ (el);
            textInputState.set(input, {
                composing: false,
                apply: debounce(() => this.filterData(), this.options.filterDelay),
            });
        }
    }

    /**
     * Default filter cell renderer for base columns.
     * @param {HTMLTableCellElement} th
     * @param {Column} column
     * @param {HTMLTableCellElement} relatedTh
     */
    renderDefaultFilterCell(th, column, relatedTh) {
        const filter = this.createFilterElement(column, relatedTh);

        // Reflect the current query filters into the control
        const field = column.field;
        if (field) {
            const filterState = /** @type {FilterState|undefined} */ (this._query.filters?.[field]);
            if (filterState) {
                if (filter.dataset.filterMode === "multi") {
                    // A multi select restores its checked boxes from the array
                    setMultiSelectValues(filter, Array.isArray(filterState.value) ? filterState.value : []);
                } else if (filter.dataset.filterMode === "text") {
                    /** @type {HTMLInputElement} */ (filter).value = formatTextFilterQuery(filterState);
                } else if (filter.dataset.filterMode === "number") {
                    const numericValue = Number(filterState.value);
                    const value =
                        filter.dataset.percent === "true" && Number.isFinite(numericValue)
                            ? numericValue * 100
                            : filterState.value;
                    /** @type {HTMLInputElement} */ (filter).value = formatTextFilterQuery({
                        operator: filterState.operator,
                        value,
                    });
                } else if (filter.dataset.filterMode === "date") {
                    /** @type {HTMLInputElement} */ (filter).value = formatDateFilterQuery(filterState);
                } else {
                    // A percent query stores the raw fraction; show the visible
                    // scale (0.2 -> 20) so the control matches what was typed.
                    /** @type {HTMLInputElement|HTMLSelectElement} */ (filter).value =
                        filter.dataset.percent === "true"
                            ? String(Number(filterState.value) * 100)
                            : String(filterState.value ?? "");
                }
            }
        }

        if (filter instanceof HTMLSelectElement) {
            const field = document.createElement("span");
            field.className = "dg-select-field";
            field.appendChild(filter);
            th.appendChild(field);
        } else {
            th.appendChild(filter);
        }
    }

    /**
     * @param {Column} column
     * @param {HTMLTableCellElement} relatedTh
     * @returns {HTMLInputElement|HTMLSelectElement|HTMLDivElement}
     */
    createFilterElement(column, relatedTh) {
        const type = getColumnFilterType(column);
        // A capable browser gets a checkbox panel instead of a native control:
        // Ctrl-click listboxes are unusable in a narrow column. Older browsers
        // keep the ordinary select as the intentional degradation.
        if (type === "select" && column.filterMultiple && supportsPopoverAnchor()) {
            return createMultiSelect(column, this.getFilterOptions(column), relatedTh);
        }
        const isSelect = type === "select" || type === "boolean";
        const filter = isSelect ? document.createElement("select") : document.createElement("input");
        filter.classList.add("dg-filter");
        filter.classList.add("dg-filter-control");
        // The resolved mode travels on the control: filterData() reads it to
        // map the input value onto the matching query operator.
        filter.dataset.filterMode = type;
        if (isPercentColumn(column)) {
            // The typed value is the visible percent; the query expects the raw
            // fraction, so filterData() divides by 100.
            filter.dataset.percent = "true";
        }
        if (type === "boolean") {
            // Tri-state select sharing the boolean formatter semantics: the
            // empty option filters nothing, "true"/"false" compare through
            // normalizeBoolean (raw 1 / "1" cells match like the ✓ display).
            // Keep option labels start-aligned even when the boolean column
            // itself is centered.
            filter.dataset.align = "start";
            const first = getFirstFilterOption(column, this.defaultColumn);
            const options = [
                first,
                { value: "true", text: this.labels?.booleanTrue ?? "Yes" },
                { value: "false", text: this.labels?.booleanFalse ?? "No" },
            ];
            for (const e of options) {
                const opt = document.createElement("option");
                opt.value = `${e.value}`;
                opt.text = e.text;
                /** @type {HTMLSelectElement} */ (filter).add(opt);
            }
        } else if (type === "select") {
            for (const e of this.getFilterOptions(column)) {
                const opt = document.createElement("option");
                opt.value = `${e.value}`;
                opt.text = e.text;

                if (filter instanceof HTMLSelectElement) {
                    filter.add(opt);
                }
            }
        } else {
            const input = /** @type {HTMLInputElement} */ (filter);
            input.type = "text";
            // Numeric keyboard for number, standard keyboard for date: partial
            // values need the "-" separator, which numeric pads often hide.
            input.inputMode = type === "number" ? "decimal" : "search";
            input.autocomplete = "off";
            if (!column.filterPlaceholder || column.filterPlaceholder === this.defaultColumn.filterPlaceholder) {
                // No explicit placeholder: use the column contract (partial ISO
                // date, visible percent scale) or the generic ellipsis default.
                if (type === "date") {
                    input.placeholder = "YYYY-MM-DD";
                } else if (isPercentColumn(column)) {
                    input.placeholder = "%";
                } else {
                    input.placeholder = this.defaultColumn.filterPlaceholder ?? "";
                }
            } else {
                input.placeholder = column.filterPlaceholder ?? "";
            }
            input.spellcheck = false;
        }
        // Allows binding filter to this column
        filter.dataset.name = column.field ?? "";
        filter.id = randstr("dg-filter-");
        // Don't use aria-label as it triggers autocomplete
        filter.setAttribute("aria-labelledby", relatedTh.getAttribute("id") ?? "");
        return filter;
    }

    /**
     * Resolve the options of a select filter, directly consumable by the
     * <select>. Never derives from the currently loaded page: for a server
     * grid the options must come from meta.filters or an explicit list.
     * @public
     * @param {Column} column
     * @returns {Array<import("./data-source.js").FilterOption>}
     */
    getFilterOptions(column) {
        const field = column.field;
        const firstFilterOption = getFirstFilterOption(column, this.defaultColumn);
        // An explicit list owns the business options, while the grid always
        // keeps a way to clear the filter. Do not mutate the caller's list.
        if (Array.isArray(column.filterList)) {
            const hasEmptyOption = column.filterList.some((option) => `${option.value}` === "");
            return hasEmptyOption ? column.filterList : [firstFilterOption, ...column.filterList];
        }
        // Server-provided options for server-first grids
        const metaOptions = field ? this.meta?.filters?.[field] : undefined;
        if (Array.isArray(metaOptions)) {
            return [firstFilterOption, ...metaOptions];
        }
        // A local data source owns the full collection and can derive options
        if (this.dataSource instanceof ArrayDataSource) {
            // Declarative cells provide a user-facing label (e.g. "Paid") for
            // the machine value (e.g. "paid"); the first non-empty label wins
            // when several rows share a value. Raw local values fall back to
            // value === label.
            /** @type {Map<any, string>} */
            const labels = new Map();
            for (const row of this.dataSource.rows ?? []) {
                if (!field) {
                    continue;
                }
                const v = row[field];
                if (v === undefined || v === null || v === "") {
                    continue;
                }
                const meta = declarativeCells(row)?.[field];
                const text = meta?.label || v;
                if (!labels.has(v)) {
                    labels.set(v, text);
                }
            }
            const options = [...labels.entries()]
                .map(([value, text]) => ({ value, text }))
                .sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
            return [firstFilterOption, ...options];
        }
        return [firstFilterOption];
    }

    /**
     * Render the rows of the current page into tbody
     * It will call paginate() at the end
     */
    renderBody() {
        this.log("render body");
        this._columns = this.buildColumns();
        this.runPlugins("beforeRender");
        this._renderContext = "body";

        const tbody = document.createElement("tbody");
        const prev = this.tbody;
        const message = prev?.getAttribute("data-empty-message") ?? "";

        let i = 0;
        for (const item of this.rows) {
            const tr = document.createElement("tr");
            // Explicit data-row marker so row-index-dependent logic (selection
            // sync, fixed-height, responsive) can ignore responsive child rows.
            tr.classList.add("dg-data-row");
            tr.dataset.rowIndex = String(i);

            // rowClick="select" makes every data row a click target; the
            // interaction itself is delegated in _handleClick().
            if (this.options.rowClick === "select" && this.options.selectable) {
                tr.classList.add("dg-clickable-row");
            }

            for (const column of this.getColumns()) {
                if (!column) {
                    console.error("Empty column found!", this.getColumns());
                    continue;
                }
                const field = column.field;
                // It should be applied as an attr of the row
                if (column.attr) {
                    if (field && item[field] != null) {
                        // Special case if we try to write over the class attr
                        if (column.attr === "class") {
                            tr.classList.add(...item[field].trim().split(/\s+/));
                        } else {
                            tr.setAttribute(column.attr, item[field]);
                        }
                    }
                    continue;
                }
                const td = this._createColumnCell("td", column);
                if (column.wrap ?? this.options.wrap) {
                    td.classList.add("dg-wrap");
                }
                // Kept for ResponsiveGrid: the expanded child rows label each
                // hidden value with the column title.
                td.setAttribute("data-name", column.title ?? "");

                const ctx = { grid: this, column, row: item, rowIndex: i, value: field ? item[field] : undefined, tr };
                const cellClass = typeof column.cellClass === "function" ? column.cellClass(ctx) : column.cellClass;
                // A whitespace-only return is truthy but yields [""] below:
                // normalize before touching the class list.
                const classes = String(cellClass ?? "").trim();
                if (classes) {
                    td.classList.add(...classes.split(/\s+/));
                }
                if (column.renderCell) {
                    applyContent(td, column.renderCell(ctx));
                } else {
                    this.renderDefaultCell(td, ctx);
                }
                tr.appendChild(td);
            }

            tbody.appendChild(tr);

            dispatch(this, "rowRendered", { rowData: item, tr });
            i++;
        }

        // Real rows for the empty/error states: no CSS-generated content.
        if (this.hasDataError) {
            const { row, cell } = createSpanningRow(this, { className: "dg-error-row" });
            cell.textContent = message || this.labels.networkError;
            tbody.appendChild(row);
        } else if (this.rows.length === 0) {
            const { row, cell } = createSpanningRow(this, { className: "dg-empty-row" });
            cell.textContent = this.noData;
            tbody.appendChild(row);
        }

        // Keep data empty message
        tbody.setAttribute("data-empty-message", message);
        if (prev) {
            this.table?.replaceChild(tbody, prev);
        } else {
            this.table?.appendChild(tbody);
        }

        this.paginate();

        this.runPlugins("afterRender", this._renderContext);
        this.queueFrozenSync();

        if (this.hasDataError || this.rows.length) {
            this.removeAttribute("data-empty");
        } else {
            this.setAttribute("data-empty", "");
        }

        dispatch(this, "bodyRendered");
    }

    /**
     * Default cell renderer for base columns (transform).
     * Editable cells are marked for the EditableColumn plugin.
     * @param {HTMLTableCellElement} td
     * @param {CellContext} ctx
     */
    renderDefaultCell(td, ctx) {
        const { column, row: item, rowIndex: i } = ctx;
        const field = column.field;
        if (!field || !item) {
            return;
        }

        if (column.editable) {
            td.classList.add("dg-editable-col");
            td.dataset.field = field;
            td.dataset.rowIndex = `${i}`;
        }

        const value = item[field] ?? "";

        // Declarative blueprint: preserve the authored presentation while the
        // current value still matches the value it was authored for. As soon as
        // the value changes programmatically, fall back to plain text rendering.
        const meta = declarativeCells(item)?.[field];
        if (meta?.content.length && Object.is(value, meta.value)) {
            const fragment = document.createDocumentFragment();
            for (const node of meta.content) {
                fragment.appendChild(node.cloneNode(true));
            }
            applyContent(td, fragment);
            return;
        }

        const transformed = transformValue(value, column.transform, ctx);
        if (column.format) {
            applyContent(td, formatValue(transformed, column.format, column.formatOptions, ctx));
        } else {
            td.textContent = transformed;
        }
    }

    paginate() {
        this.log("paginate");

        const tfoot = this.tfoot;
        if (!tfoot) return;

        // Refresh page count in case we added/removed a page
        this.pages = this.totalPages();

        // Enable/disable buttons if shown
        if (this.btnFirst) this.btnFirst.disabled = this._query.page <= 1;
        if (this.btnPrev) this.btnPrev.disabled = this._query.page <= 1;
        if (this.btnNext) this.btnNext.disabled = this._query.page >= this.pages;
        if (this.btnLast) this.btnLast.disabled = this._query.page >= this.pages;
        this.updateMetaLabel();
        this.updatePageStatus();
        tfoot.toggleAttribute("hidden", this.options.autohidePager && this._query.pageSize > this.total);
    }

    /**
     * @public
     * @returns {number}
     */
    totalPages() {
        // At least one page: zero results is the logical page 1/1, never 1/0.
        return Math.max(1, Math.ceil(this.total / (this._query.pageSize || 1)));
    }

    /**
     * Make sure the current page is still valid
     */
    fixPage() {
        if (!this.inputPage) return this;
        this.pages = this.totalPages();
        if (this._query.page > this.pages) {
            this._query.page = Math.max(1, this.pages);
        }
        if (this._query.page < 1) {
            this._query.page = 1;
        }
        // Show current page in input
        this.inputPage.max = `${this.pages}`;
        this.inputPage.value = `${this._query.page}`;
        this.inputPage.disabled = this.pages < 2;
        this.updatePageStatus();
        return this;
    }
}

export { DataGrid };
export default DataGrid;
