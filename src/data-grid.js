/**
 * Data Grid Web component
 * https://github.com/lekoala/data-grid
 */

import {
    applyColumnDefinition,
    getColumnAlign,
    getColumnFilterType,
    getFirstFilterOption,
    isColumnHidden,
    isPercentColumn,
    orderColumns,
} from "./columns.js";
import BaseElement from "./core/base-element.js";
import { ArrayDataSource, FetchDataSource } from "./data-source.js";
import { declarativeCells, parseDeclarativeTable, rowsFromTable } from "./declarative-table.js";
import {
    formatDateFilterQuery,
    formatTextFilterQuery,
    parseDateFilterQuery,
    parseTextFilterQuery,
} from "./filter-query.js";
import { normalizeQuery } from "./query-state.js";
import addSelectOption from "./utils/addSelectOption.js";
import applyContent from "./utils/applyContent.js";
import { parseEnumAttribute, parseIntegerListAttribute } from "./utils/attributes.js";
import camelize from "./utils/camelize.js";
import { MIN_COLUMN_WIDTH } from "./utils/columnWidth.js";
import debounce from "./utils/debounce.js";
import { dispatch } from "./utils/dispatch.js";
import { off, on } from "./utils/events.js";
import formatValue, { getFormatDefaults } from "./utils/formatValue.js";
import getTextWidth from "./utils/getTextWidth.js";
import {
    clearMultiSelect,
    createMultiSelect,
    readMultiSelect,
    setMultiSelectValues,
    updateMultiSelectSummary,
} from "./utils/multiSelectFilter.js";
import { supportsPopoverAnchor } from "./utils/popover.js";
import randstr from "./utils/randstr.js";
import { createSpanningRow } from "./utils/spanningRow.js";
import transformValue from "./utils/transformValue.js";

/** @typedef {import("./data-source.js").DataSource} DataSource */
/** @typedef {import("./data-source.js").QueryState} QueryState */
/** @typedef {import("./data-source.js").PageResult} PageResult */
/** @typedef {import("./data-source.js").FilterState} FilterState */
/** @typedef {import("./data-source.js").FilterOption} FilterOption */

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
 * @property {String} [filterPlaceholder] - a visible hint for the filter control (defaults to the grid's text-filter placeholder)
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
 * @property {String} searchPlaceholder Visible hint for the search input (defaults to "")
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
const CORE_EVENTS = [
    "click",
    "change",
    "input",
    "keydown",
    "mouseover",
    "compositionstart",
    "compositionend",
    "columnResized",
    "columnReordered",
    "columnVisibility",
];

/**
 * @param {string} template
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
function formatLabel(template, values) {
    return template.replace(LABEL_PLACEHOLDER_PATTERN, (_, key) => String(values[key] ?? ""));
}

/**
 * Defaults shared by the instance getter and the static inspection API.
 * Mutable collection values are copied by createDefaultOptions().
 * @type {Record<string, any>}
 */
const DEFAULT_OPTIONS = {
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
    searchPlaceholder: "",
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

/**
 * The serializable HTML configuration surface of DataGrid.
 * @type {Record<string, {type?: "boolean"|"integer"|"number"|"string", option?: string, parse?: (value: string) => any}>}
 */
const OPTION_ATTRIBUTES = {
    src: { type: "string" },
    loading: { parse: (value) => parseEnumAttribute(value, ["eager", "lazy"], "eager") },
    sortable: { type: "boolean" },
    filterable: { type: "boolean" },
    "filter-delay": { option: "filterDelay", type: "integer" },
    searchable: { type: "boolean" },
    "search-placeholder": { option: "searchPlaceholder", type: "string" },
    "search-delay": { option: "searchDelay", type: "integer" },
    "min-search-length": { option: "minSearchLength", type: "integer" },
    responsive: { type: "boolean" },
    "responsive-toggle": { option: "responsiveToggle", type: "boolean" },
    "responsive-start-open": { option: "responsiveStartOpen", type: "boolean" },
    "row-details-start-open": { option: "rowDetailsStartOpen", type: "boolean" },
    selectable: { type: "boolean" },
    "single-select": { option: "singleSelect", type: "boolean" },
    "select-visible-only": { option: "selectVisibleOnly", type: "boolean" },
    "row-click": {
        option: "rowClick",
        parse: (value) => parseEnumAttribute(value, ["action", "select", "none"], "action"),
    },
    "row-key": { option: "rowKey", type: "string" },
    "row-label": { option: "rowLabel", type: "string" },
    "collapse-actions": { option: "collapseActions", type: "boolean" },
    "save-state": { option: "saveState", type: "boolean" },
    "no-data": { option: "noData", type: "string" },
    "error-message": { option: "errorMessage", type: "string" },
    "page-sizes": { option: "pageSizes", parse: parseIntegerListAttribute },
    "row-actions": { option: "rowActions", type: "boolean" },
    reorder: { type: "boolean" },
    menu: { type: "boolean" },
    wrap: { type: "boolean" },
    "snap-columns": { option: "snapColumns", type: "boolean" },
    autosize: { type: "boolean" },
    resizable: { type: "boolean" },
    autoheight: { type: "boolean" },
    "autohide-pager": { option: "autohidePager", type: "boolean" },
    "show-page-size": { option: "showPageSize", type: "boolean" },
    debug: { type: "boolean" },
    dir: { type: "string" },
    density: { parse: (value) => parseEnumAttribute(value, ["compact", "default", "comfortable"], "default") },
};

/**
 * @returns {Record<string, any>}
 */
function createDefaultOptions() {
    return {
        ...DEFAULT_OPTIONS,
        params: { ...DEFAULT_OPTIONS.params },
        pageSizes: [...DEFAULT_OPTIONS.pageSizes],
        columns: [],
        actions: [],
        bulkActions: [],
    };
}

/**
 * Parse an option boolean. Presence is true, except for the explicit string
 * "false", which makes server-rendered boolean configuration practical.
 * @param {string} value
 * @returns {boolean}
 */
function parseBooleanOption(value) {
    return value !== "false";
}

/**
 * Parse a numeric option without ever returning NaN or a truncated value.
 * @param {string} value
 * @param {"integer"|"number"} type
 * @returns {number|undefined}
 */
function parseNumberAttribute(value, type) {
    if (value.trim() === "") {
        return undefined;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return undefined;
    }
    return type === "integer" && !Number.isInteger(number) ? undefined : number;
}

/**
 * @param {string} name
 * @param {string|null} value
 * @returns {{option: string, value: any}|null}
 */
function parseOptionAttribute(name, value) {
    const config = OPTION_ATTRIBUTES[name];
    if (!config || value === null) {
        return null;
    }

    const option = config.option ?? camelize(name);
    let parsed;
    if (config.parse) {
        parsed = config.parse(value);
    } else {
        switch (config.type) {
            case "boolean":
                parsed = parseBooleanOption(value);
                break;
            case "integer":
            case "number":
                parsed = parseNumberAttribute(value, config.type);
                break;
            default:
                parsed = value;
        }
    }

    // Invalid numeric input leaves the previous/default value active.
    return parsed === undefined ? null : { option, value: parsed };
}

/**
 * Enforce the option invariant needed before the DataGrid private brand exists.
 * BaseElement invokes `_ready()` from `super()`, so that first call cannot use
 * a private method on the subclass.
 * @param {Options} options
 */
function normalizeSelectionOptions(options) {
    if (options.singleSelect) {
        options.selectable = true;
    }
}

/**
 */
class DataGrid extends BaseElement {
    /** @type {Record<string, any>} */
    #optionDefaults;
    /** @type {String} */
    #filterSelector;
    /** @type {String} */
    #excludedRowElementSelector;
    /** @type {PluginInstances} */
    #plugins;
    /** @type {QueryState} */
    #initialQuery;
    /** @type {QueryState} */
    #query;
    /** @type {SelectionState} */
    #selection;
    /** @type {Number} */
    #requestSeq;
    /** @type {AbortController|null} */
    #controller;
    /** @type {PageResult|null} */
    #initialResult;
    /** @type {Column[]} */
    #columns;
    /** @type {IntersectionObserver|null} */
    #loadObserver;
    /** @type {Boolean} */
    #lazyPending;
    /** @type {import("./core/base-plugin.js").RenderContext|null} */
    #renderContext;
    /** @type {Number|null} */
    #frozenFrame;

    /**
     * @param {Object} [options]
     */
    constructor(options = {}) {
        super(options);

        // Attribute removal returns to the documented default value. While an
        // attribute is present it still overrides constructor options.
        this.#optionDefaults = createDefaultOptions();

        this.#filterSelector = "[id^=dg-filter]";
        this.#excludedRowElementSelector =
            "a,button,input,select,textarea,[contenteditable]:not([contenteditable='false']),[data-row-click-ignore]";

        /**
         * Instantiated plugins, keyed by their registration name.
         * @type {PluginInstances}
         */
        this.#plugins = this.#initPlugins();

        /**
         * Initial query used by resetQuery()
         * @type {QueryState}
         */
        this.#initialQuery = normalizeQuery(this.options.initialQuery);

        /**
         * Runtime query state, single source of truth
         * @type {QueryState}
         */
        this.#query = normalizeQuery(this.#initialQuery);

        /**
         * Selection state, single source of truth for row selection
         * @type {SelectionState}
         */
        this.#selection = { mode: "explicit", ids: new Set(), except: new Set() };

        /** @type {Number} */
        this.#requestSeq = 0;

        /** @type {?AbortController} */
        this.#controller = null;

        /**
         * Optional initial result, can be set as a property before connection
         * @type {PageResult|null}
         */
        this.initialResult = null;

        /** @type {PageResult|null} */
        this.#initialResult = this.options.initialResult || this.initialResult || null;

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
        this.#columns = [];

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
        this.#loadObserver = null;

        /** @type {Boolean} */
        this.#lazyPending = false;

        /**
         * Current render context, set by renderTable/renderBody.
         * @type {import("./core/base-plugin.js").RenderContext|null}
         */
        this.#renderContext = null;

        /** @type {Number|null} */
        this.#frozenFrame = null;
    }

    _ready() {
        this.fireEvents = false;
        if (!this.hasAttribute("id")) {
            this.setAttribute("id", this.options.id ?? randstr("el-"));
        }
        normalizeSelectionOptions(this.options);
    }

    /**
     * Instantiate the registered plugin constructors.
     * @returns {PluginInstances}
     */
    #initPlugins() {
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
    #setNoData(tbody) {
        if (!this.hasDataError && tbody.getAttribute("data-empty-message") !== this.noData) {
            tbody.setAttribute("data-empty-message", this.noData);
        }
    }

    /**
     * Update the persistent status live region.
     * @param {String} text
     */
    #updateStatus(text) {
        const status = this.querySelector(".dg-status");
        if (status) {
            status.textContent = text;
        }
    }

    /** @public */
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
        this.#setNoData(this.tbody);
        this.updateMetaLabel();
        this.updatePageStatus();
        if (this.loading) {
            this.#updateStatus(this.labels.loading);
        } else if (this.hasDataError) {
            this.#updateStatus(this.tbody?.getAttribute("data-empty-message") || this.labels.networkError);
        } else {
            this.#updateStatus(
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
        const page = this.#query.page || 1;
        let high = page * this.#query.pageSize;
        let low = high - this.#query.pageSize + 1;
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
            this.formatLabel(this.labels.pageStatus, { page: this.#query.page || 1, pages }),
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
        return /** @type {Options} */ (createDefaultOptions());
    }

    /**
     * Inspect the default option values without instantiating a grid.
     * @returns {Options}
     */
    static get defaultOptions() {
        return /** @type {Options} */ (createDefaultOptions());
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
        return normalizeQuery(this.#query);
    }

    /**
     * Convenience read-only accessor for the current page.
     * @public
     * @returns {Number}
     */
    get page() {
        return this.#query.page;
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
        for (const plugin of Object.values(this.#plugins)) {
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
        return this.#columns;
    }

    /**
     * Return an instantiated plugin by its registration name.
     * @public
     * @param {String} name
     * @returns {Plugin|undefined}
     */
    getPlugin(name) {
        return this.#plugins[name];
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
        return Object.keys(OPTION_ATTRIBUTES);
    }

    /**
     * Resolve a declarative attribute into an option and apply its runtime
     * reaction when the grid has completed initialization.
     * @param {String} name
     * @param {String|null} value
     * @param {String|null} oldValue
     */
    attributeChanged(name, value, oldValue) {
        const config = OPTION_ATTRIBUTES[name];
        if (!config) {
            return;
        }

        const option = config.option ?? camelize(name);
        const options = /** @type {Record<string, any>} */ (this.options);
        if (value === null) {
            options[option] = this.#optionDefaults[option];
        } else {
            const resolved = parseOptionAttribute(name, value);
            if (!resolved) {
                return;
            }
            options[resolved.option] = resolved.value;
        }

        if (this.fireEvents) {
            this.#optionChanged(option);
        }
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
        if (!this.#initialResult) {
            this.#initialResult = this.options.initialResult || this.initialResult || null;
        }
        if (this.options.initialQuery) {
            return;
        }
        if (this.hasAttribute("page-size")) {
            const pageSize = Number.parseInt(this.getAttribute("page-size") ?? "");
            if (pageSize) {
                this.#query.pageSize = pageSize;
                this.#initialQuery.pageSize = pageSize;
            }
        }
        if (this.hasAttribute("page")) {
            const page = Number.parseInt(this.getAttribute("page") ?? "");
            if (page) {
                this.#query.page = page;
                this.#initialQuery.page = page;
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
        const next = normalizeQuery(this.#query);
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
        this.#query = normalizeQuery(next);
        if (changesPopulation) {
            this.#clearSelectionIfNeeded();
        }
        // While lazy and not yet first-loaded, only accumulate the query
        // state. The first load (when the grid becomes visible) uses it.
        if (this.#lazyPending) {
            return Promise.resolve();
        }
        return this.refresh();
    }

    /**
     * Restore the runtime query before the first load without triggering a
     * refresh. This is intended for stateful plugins connected during setup.
     * @public
     * @plugin
     * @param {?QueryState} query
     */
    restoreQuery(query) {
        this.#query = normalizeQuery(query);
    }

    /**
     * Reset the query to its initial state and reload.
     * @public
     * @returns {Promise<void>}
     */
    resetQuery() {
        this.#query = normalizeQuery(this.#initialQuery);
        this.#clearSelectionIfNeeded();
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
        if (this.#lazyPending) {
            this.#lazyPending = false;
            this.#loadObserver?.disconnect();
            this.#loadObserver = null;
        }
        const requestId = ++this.#requestSeq;
        this.#controller?.abort();
        const controller = new AbortController();
        this.#controller = controller;

        this.loading = true;
        this.error = null;
        this.setAttribute("data-loading", "");
        this.removeAttribute("data-error");
        this.#updateStatus(this.labels.loading);

        try {
            let result;
            if (this.#initialResult) {
                result = this.#initialResult;
                this.#initialResult = null;
            } else {
                const ds = this.dataSource;
                if (!ds) {
                    throw new Error("No data source");
                }
                result = await ds.load(this.query, { signal: controller.signal });
            }
            if (requestId !== this.#requestSeq) return;
            if (this.applyResult(result)) {
                // The requested page does not exist anymore (e.g. the dataset
                // shrank after a deletion): refetch on the last valid page.
                return this.refresh();
            }
            this.#updateStatus(
                this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData,
            );
        } catch (err) {
            if (requestId !== this.#requestSeq) return;
            const e = /** @type {any} */ (err);
            if (e?.name === "AbortError" || controller.signal.aborted) return;
            const message =
                this.options.errorMessage || e?.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || this.labels.networkError;
            this.error = e;
            this.setAttribute("data-error", "");
            this.tbody?.setAttribute("data-empty-message", message);
            this.#updateStatus(message);
            this.renderBody();
            dispatch(this, "loadError", e);
        } finally {
            if (requestId === this.#requestSeq) {
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

        const requestedPage = this.#query.page;
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
     * Apply only the runtime synchronization that an option actually needs.
     * Reading an option at interaction/render time does not need a hook here.
     * @param {String} option
     */
    #optionChanged(option) {
        switch (option) {
            case "src":
                this.srcChanged();
                break;
            case "showPageSize":
                this.showPageSizeChanged();
                break;
            case "responsive":
                this.responsiveChanged();
                break;
            case "snapColumns":
                this.snapColumnsChanged();
                break;
            case "wrap":
                this.wrapChanged();
                break;
            case "rowDetailsStartOpen":
                this.rowDetailsStartOpenChanged();
                break;
            case "selectable":
                this.selectableChanged();
                break;
            case "singleSelect":
                this.singleSelectChanged();
                break;
            case "rowClick":
                this.rowClickChanged();
                break;
            case "reorder":
                this.reorderChanged();
                break;
            case "sortable":
                this.sortableChanged();
                break;
            case "filterable":
                this.filterableChanged();
                break;
            case "searchable":
                this.searchableChanged();
                break;
            case "searchPlaceholder":
                this.searchPlaceholderChanged();
                break;
            case "responsiveToggle":
                if (this.table) {
                    this.renderTable();
                    this.renderBody();
                }
                break;
            case "responsiveStartOpen":
                if (this.table) {
                    this.renderBody();
                }
                break;
            case "collapseActions":
                if (this.table) {
                    this.renderTable();
                    this.renderBody();
                }
                break;
        }
    }

    /**
     * Pick the data source based on configuration.
     */
    srcChanged() {
        this.setupDataSource();
        this.#clearSelectionIfNeeded();
        return this.refresh();
    }

    showPageSizeChanged() {
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
        this.selectPerPage?.closest(".dg-select-field")?.toggleAttribute("hidden", !this.options.showPageSize);
    }

    responsiveChanged() {
        this.runPlugins("responsiveChanged", this.options.responsive);
        this.renderTable();
        this.renderBody();
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

    selectableChanged() {
        this.renderTable();
        this.renderBody();
    }

    /**
     * singleSelect implies selectable: enforce the invariant without clobbering
     * an explicit selectable option when singleSelect is turned back off.
     */
    #syncSelectionOptions() {
        normalizeSelectionOptions(this.options);
    }

    singleSelectChanged() {
        this.#syncSelectionOptions();

        // Switching from multi to single select restarts from an empty
        // selection, so the "singleSelect implies at most one selected row"
        // invariant always holds without an arbitrary pick among the previous
        // ids (which may also be a mode "all" selection).
        if (this.options.singleSelect) {
            this.#clearSelectionIfNeeded();
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
            addSelectOption(this.selectPerPage, v, v, v === this.#query.pageSize);
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
        input.value = this.#query.search;

        const field = document.createElement("span");
        field.className = "dg-search-field";
        const icon = document.createElement("span");
        icon.className = "dg-search-icon";
        icon.setAttribute("aria-hidden", "true");
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
        if (value === this.#query.search) {
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
    #adoptDeclarativeTable() {
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
            this.#initialQuery.sort = sort;
            this.#query.sort = sort;
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
    #wrapScroll() {
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
        this.#adoptDeclarativeTable();
        this.table = this.querySelector("table");
        this.#wrapScroll();
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
        this.#syncSelectionOptions();

        // Core UI is delegated to the host: the instance is its own event
        // listener and routes bubbled events to the matching control. This
        // keeps rerendered chrome (filters, sort headers) working without
        // reinstalling per-element listeners.
        on(this, CORE_EVENTS, this);
        this.showPageSizeChanged();

        this.setupDataSource();
        this.setupInitialState();

        for (const plugin of Object.values(this.#plugins)) {
            await plugin.connected?.();
        }

        // Display even if we don't have data
        this.setAttribute("dir", this.options.dir);
        this.snapColumnsChanged();
        this.populatePageSizes();
        this.updateLabels();
        this.renderSearch();

        await this.init();
    }

    _disconnected() {
        this.#loadObserver?.disconnect();
        this.#loadObserver = null;
        this.#controller?.abort();
        // Cancel any pending per-input debounce before it can fire on a
        // detached element.
        for (const input of this.querySelectorAll("input")) {
            textInputState.get(input)?.apply.cancel();
            textInputState.delete(input);
        }

        off(this, CORE_EVENTS, this);
        if (this.#frozenFrame !== null) {
            cancelAnimationFrame(this.#frozenFrame);
            this.#frozenFrame = null;
        }

        for (const plugin of Object.values(this.#plugins)) {
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
                this.#handleClick(event, target);
                break;
            case "change":
                this.#handleChange(event, target);
                break;
            case "input":
                this.#handleInput(target);
                break;
            case "keydown":
                this.#handleKeydown(/** @type {KeyboardEvent} */ (event), target);
                break;
            case "mouseover":
                this.#handleMouseover(target);
                break;
            case "compositionstart":
                this.#handleComposition(target, true);
                break;
            case "compositionend":
                this.#handleComposition(target, false);
                break;
            default:
                super.handleEvent(event);
        }
    }

    /**
     * A control is owned by this grid when it lives inside this host (not a
     * nested grid), so bubbled events from an inner grid never affect the outer
     * one.
     * @public
     * @plugin
     * @param {Element|null|undefined} element
     * @returns {Boolean}
     */
    ownsControl(element) {
        return Boolean(element && element.closest("data-grid") === this);
    }

    /**
     * Expose the full text through the native tooltip when a data cell is
     * visually truncated. Resolve this on hover so the measurement always
     * reflects the current column width, including user resizing.
     * @param {Element} target
     */
    #handleMouseover(target) {
        const cell = /** @type {HTMLTableCellElement|null} */ (target.closest("tbody td"));
        if (!cell || !this.ownsControl(cell)) {
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
    #cancelTextInputs(root) {
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
    #handleClick(event, target) {
        const pager = target.closest(".dg-btn-first, .dg-btn-prev, .dg-btn-next, .dg-btn-last");
        if (pager && this.ownsControl(pager)) {
            if (pager.classList.contains("dg-btn-first")) return this.getFirst();
            if (pager.classList.contains("dg-btn-prev")) return this.getPrev();
            if (pager.classList.contains("dg-btn-next")) return this.getNext();
            if (pager.classList.contains("dg-btn-last")) return this.getLast();
            return;
        }

        // Only the sort button itself delegates sorting, so a click on any other
        // header control (resize handle, ...) never triggers a sort.
        const sortButton = target.closest(".dg-sort");
        if (sortButton && this.ownsControl(sortButton)) {
            const th = /** @type {HTMLTableCellElement} */ (sortButton.closest("th.dg-sortable"));
            if (th) {
                return this.sortData(th);
            }
        }

        // Data row clicks follow the delegated rowClick policy. Responsive and
        // detail rows are not dg-data-row and never match.
        const tr = /** @type {HTMLTableRowElement|null} */ (target.closest("tr.dg-data-row"));
        if (tr && this.ownsControl(tr) && this.options.rowClick !== "none") {
            const rowIndex = Number(tr.dataset.rowIndex);
            const row = this.rows[rowIndex];
            if (row) {
                return this.#handleRowClick(event, row, rowIndex);
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
    #isRowClickExcluded(event) {
        const selector = this.#excludedRowElementSelector;
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
    #handleRowClick(event, row, rowIndex) {
        if (this.#isRowClickExcluded(event)) {
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
    #handleChange(event, target) {
        const pageSize = target.closest(".dg-select-per-page");
        if (this.ownsControl(pageSize)) {
            return this.changePerPage();
        }

        const page = target.closest(".dg-input-page");
        if (this.ownsControl(page)) {
            return this.gotoPage();
        }

        // Select column filters apply on change; text filters run through input.
        const filter = /** @type {HTMLSelectElement|null} */ (target.closest(this.#filterSelector));
        if (filter && this.ownsControl(filter) && /select/i.test(filter.tagName)) {
            return this.filterData();
        }

        // Multi-select checkboxes apply on change like selects do
        const multi = target.closest(".dg-multiselect");
        if (multi && this.ownsControl(multi)) {
            updateMultiSelectSummary(/** @type {HTMLElement} */ (multi));
            return this.filterData();
        }
    }

    /**
     * @param {Element} target
     * @returns {void}
     */
    #handleInput(target) {
        const search = target.closest(".dg-search");
        if (this.ownsControl(search)) {
            this.#clearSelectionIfNeeded();
            const state = textInputState.get(/** @type {HTMLInputElement} */ (search));
            if (state && !state.composing) {
                state.apply();
            }
            return;
        }

        const filter = target.closest(this.#filterSelector);
        if (this.ownsControl(filter)) {
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
    #handleKeydown(event, target) {
        if (event.key === "Enter") {
            const page = target.closest(".dg-input-page");
            if (this.ownsControl(page)) {
                event.preventDefault();
                return this.gotoPage();
            }
            const state = textInputState.get(/** @type {HTMLInputElement} */ (target));
            if (this.ownsControl(target) && state && !state.composing && !event.isComposing) {
                event.preventDefault();
                state.apply.flush();
                return;
            }
        }

        if (event.key === "Escape") {
            const input = /** @type {HTMLInputElement} */ (target);
            const state = textInputState.get(input);
            if (this.ownsControl(target.closest(".dg-search")) && state && input.value) {
                input.value = "";
                state.apply.cancel();
                return this.commitSearch();
            }
            const filter = /** @type {HTMLInputElement|null} */ (target.closest(this.#filterSelector));
            if (this.ownsControl(filter) && state && input.value) {
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
    #handleComposition(target, composing) {
        const input = /** @type {HTMLInputElement} */ (target.closest(`.dg-search, ${this.#filterSelector}`));
        if (!input || !this.ownsControl(input)) {
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
        if (this.#deferInitialLoad()) {
            // Build the chrome and mark the grid initialized now; only the
            // first async data source load is deferred until it's near the
            // viewport (or an explicit load/refresh is requested).
            this.configureUi();
            this.classList.add("dg-initialized"); //acts as a flag to prevent unnecessary server calls down the chain.
            this.fireEvents = true;
            this.#lazyPending = true;
            this.#observeInitialLoad();
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
    #deferInitialLoad() {
        return (
            this.options.loading === "lazy" &&
            !this.#initialResult &&
            (Boolean(this.options.src) || Boolean(this.options.dataSource))
        );
    }

    /**
     * Watch the grid and trigger the first load once it is near the viewport.
     * The observer is intended to be one-shot and is disconnected on the first
     * intersection.
     */
    #observeInitialLoad() {
        this.#loadObserver = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }
                this.#loadObserver?.disconnect();
                this.#loadObserver = null;
                this.#lazyPending = false;
                this.load().finally(() => this.configureUi());
            },
            { rootMargin: "200px 0px" },
        );
        this.#loadObserver.observe(this);
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
    #createColumnCell(tag, column) {
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
     * @public
     * @plugin
     */
    syncColumnVisibility() {
        this.#columns = this.buildColumns();
        for (const column of this.getColumns()) {
            const id = this.getColumnId(column);
            const hidden = isColumnHidden(column);
            for (const cell of this.querySelectorAll(`[data-column-id="${id}"]`)) {
                cell.toggleAttribute("hidden", hidden);
                cell.classList.toggle("dg-responsive-hidden", Boolean(column.responsiveHidden));
            }
        }
        this.#syncSpanningCells();
        this.renderFooter();
        this.queueFrozenSync();
    }

    /** Keep auxiliary full-width rows aligned with the visible column list. */
    #syncSpanningCells() {
        const colspan = Math.max(1, this.columnsLength(true));
        for (const cell of this.querySelectorAll("[data-dg-span-columns]")) {
            cell.setAttribute("colspan", String(colspan));
        }
    }

    /** Queue one frozen-column geometry pass for the next frame. */
    queueFrozenSync() {
        if (this.#frozenFrame !== null) {
            return;
        }
        this.#frozenFrame = requestAnimationFrame(() => {
            this.#frozenFrame = null;
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

        if (render) this.syncColumnVisibility();

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

        if (render) this.syncColumnVisibility();

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
        this.#setNoData(this.tbody);
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
        const sel = this.#selection;
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
            mode: this.#selection.mode,
            ids: new Set(this.#selection.ids),
            except: new Set(this.#selection.except),
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
        const sel = this.#selection;
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
        this.#selectionChanged();
    }

    /**
     * Deselect a row.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    deselectRow(row, index = 0) {
        const key = this.resolveRowKey(row, index);
        const sel = this.#selection;
        if (sel.mode === "all") {
            sel.except.add(key);
        } else {
            sel.ids.delete(key);
        }
        this.#selectionChanged();
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
            this.#selection = { mode: "explicit", ids, except: new Set() };
        } else {
            this.#selection = { mode: "all", ids: new Set(), except: new Set() };
        }
        this.#selectionChanged();
    }

    /**
     * Reset the selection and refresh the UI.
     * @public
     */
    clearSelection() {
        this.#selection = { mode: "explicit", ids: new Set(), except: new Set() };
        this.#selectionChanged();
    }

    /**
     * Clear the selection only when it is not already empty, to avoid firing a
     * `selectionChange` on every population change once nothing is selected.
     */
    #clearSelectionIfNeeded() {
        const selection = this.#selection;
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
    #selectionChanged() {
        const tbody = this.tbody;
        if (tbody) {
            const trs = Array.from(tbody.querySelectorAll("tr.dg-data-row"));
            for (let i = 0; i < this.rows.length; i++) {
                const tr = trs[i];
                if (!tr) {
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
        return this.setQuery({ page: Math.max(1, this.#query.page - 1) });
    }

    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    getNext() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: this.#query.page + 1 });
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
        const clamped = Number.isFinite(page) ? Math.min(Math.max(1, page), pages) : this.#query.page;
        if (clamped === this.#query.page) {
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
        const s = (this.#query.sort || []).find((x) => x.field === field);
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
    #sort(columnName, direction) {
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
        return this.#sort(columnName, "asc");
    }

    /**
     * @public
     * @param {String} columnName
     * @returns {Promise<void>}
     */
    sortDesc(columnName) {
        return this.#sort(columnName, "desc");
    }

    /**
     * @public
     * @param {String} columnName
     * @returns {Promise<void>}
     */
    sortNone(columnName) {
        return this.#sort(columnName, "none");
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    clearFilters() {
        const inputs = /** @type {NodeListOf<HTMLInputElement|HTMLSelectElement|HTMLDivElement>} */ (
            this.querySelectorAll(this.#filterSelector)
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
            this.querySelectorAll(this.#filterSelector)
        );
        for (const input of inputs) {
            const name = input.dataset.name;
            if (!name) {
                continue;
            }
            const filter = this.#readFilterControl(input);
            if (filter) {
                filters[name] = filter;
            }
        }
        return this.setQuery({ filters });
    }

    /**
     * Translate one filter control into canonical query state.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLDivElement} input
     * @returns {FilterState|undefined}
     */
    #readFilterControl(input) {
        if (input.dataset.filterMode === "multi") {
            const values = readMultiSelect(input);
            return values.length ? { operator: "in", value: values } : undefined;
        }
        const value = /** @type {HTMLInputElement|HTMLSelectElement} */ (input).value;
        if (!value) {
            return undefined;
        }
        const mode = input.dataset.filterMode;
        if (mode === "text") {
            return parseTextFilterQuery(value);
        }
        if (mode === "boolean") {
            return { operator: "eq", value: value === "true" };
        }
        if (mode === "number") {
            const parsed = parseTextFilterQuery(value);
            const number = Number(parsed.value);
            const isPercent = input.dataset.percent === "true";
            return {
                operator: parsed.operator,
                value: Number.isFinite(number) ? (isPercent ? number / 100 : number) : parsed.value,
            };
        }
        if (mode === "date") {
            return parseDateFilterQuery(value);
        }
        return { operator: /select/i.test(input.tagName) ? "eq" : "contains", value };
    }

    renderTable() {
        this.log("render table");

        this.#columns = this.buildColumns();
        this.runPlugins("beforeRender");
        this.#renderContext = "table";
        this.updateTableLabel();
        this.renderHeader();
        this.renderFooter();
        this.runPlugins("afterRender", this.#renderContext);
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
            tr.appendChild(
                this.#createHeaderColumn(column, {
                    sampleTh: /** @type {HTMLTableCellElement} */ (sampleTh),
                    availableWidth,
                    colMaxWidth,
                }),
            );
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

        this.#fitHeaderWidths(thead, tr, availableWidth);
    }

    /**
     * @param {Column} column
     * @param {{ sampleTh: HTMLTableCellElement, availableWidth: Number, colMaxWidth: Number }} layout
     * @returns {HTMLTableCellElement}
     */
    #createHeaderColumn(column, { sampleTh, availableWidth, colMaxWidth }) {
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
        // Plugin renderers only add structure; every column still receives the
        // same geometry, visibility and alignment contract.
        applyColumnDefinition(th, column);
        const align = getColumnAlign(column);
        if (align) {
            th.dataset.align = align;
        }
        return th;
    }

    /**
     * Compress explicit header widths when they overflow the viewport.
     * @param {HTMLTableSectionElement} thead
     * @param {HTMLTableRowElement} tr
     * @param {Number} availableWidth
     */
    #fitHeaderWidths(thead, tr, availableWidth) {
        if (!thead || thead.offsetWidth <= availableWidth) {
            return;
        }
        this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
        const scrollbarWidth = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
        let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
        if (this.options.responsive) {
            diff += scrollbarWidth;
        }
        const thWithWidth = /** @type {NodeListOf<HTMLTableCellElement>} */ (tr.querySelectorAll("th[width]"));
        for (const th of thWithWidth) {
            if (th.classList.contains("dg-not-resizable") || diff <= 0) {
                continue;
            }
            const actualWidth = Number.parseInt(th.getAttribute("width") ?? "");
            const minWidth = Number.parseInt(th.dataset.minWidth ?? "") || 0;
            if (actualWidth > minWidth) {
                const newWidth = Math.max(minWidth, actualWidth - diff);
                diff -= actualWidth - newWidth;
                th.setAttribute("width", String(newWidth));
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
        if (this.options.responsive) {
            th.setAttribute("data-responsive", String(column.responsive || ""));
        }
        this.#applyHeaderSizing(th, column, sampleTh);
        this.#renderHeaderContent(th, column, sortable);
    }

    /**
     * Apply the intrinsic minimum and optional preferred width of a header.
     * @param {HTMLTableCellElement} th
     * @param {Column} column
     * @param {HTMLTableCellElement|undefined} sampleTh
     */
    #applyHeaderSizing(th, column, sampleTh) {
        // Column sizing contract: the minimum is the largest of the intrinsic
        // header width, an explicit minWidth and the formatter floor; the
        // preferred width is the explicit `width` or the formatter suggestion;
        // without a preferred width the column stays flexible and absorbs the
        // remaining space. Never emit an invalid width: no attribute at all.
        const defaults = getFormatDefaults(column.format, column.formatOptions);
        const intrinsicWidth = getTextWidth(column.title ?? "", sampleTh ?? document.body, true) + 20;
        const effectiveMin = Math.max(MIN_COLUMN_WIDTH, intrinsicWidth, column.minWidth ?? 0, defaults?.minWidth ?? 0);
        th.dataset.minWidth = `${effectiveMin}`;

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
    }

    /**
     * Render a plain title or the sortable header control.
     * @param {HTMLTableCellElement} th
     * @param {Column} column
     * @param {Boolean} sortable
     */
    #renderHeaderContent(th, column, sortable) {
        if (sortable) {
            th.classList.add("dg-sortable");
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
            const th = this.#createColumnCell("th", column);

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
            this.#cancelTextInputs(oldRow);
        }
        if (thead && oldRow) {
            thead.replaceChild(tr, oldRow);
        } else if (thead && !tr.parentNode) {
            thead.appendChild(tr);
        }

        this.#registerFilterInputs(tr);
    }

    /**
     * Register the transient IME/debounce state of text filter inputs. Event
     * handling itself remains delegated to the host.
     * @param {HTMLTableRowElement} tr
     */
    #registerFilterInputs(tr) {
        for (const el of tr.querySelectorAll(this.#filterSelector)) {
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
            const filterState = /** @type {FilterState|undefined} */ (this.#query.filters?.[field]);
            if (filterState) {
                this.#writeFilterControl(filter, filterState);
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
     * Reflect canonical query state into one filter control.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLDivElement} filter
     * @param {FilterState} filterState
     */
    #writeFilterControl(filter, filterState) {
        const mode = filter.dataset.filterMode;
        if (mode === "multi") {
            setMultiSelectValues(filter, Array.isArray(filterState.value) ? filterState.value : []);
            return;
        }
        if (mode === "text") {
            /** @type {HTMLInputElement} */ (filter).value = formatTextFilterQuery(filterState);
            return;
        }
        if (mode === "number") {
            const numericValue = Number(filterState.value);
            const value =
                filter.dataset.percent === "true" && Number.isFinite(numericValue)
                    ? numericValue * 100
                    : filterState.value;
            /** @type {HTMLInputElement} */ (filter).value = formatTextFilterQuery({
                operator: filterState.operator,
                value,
            });
            return;
        }
        if (mode === "date") {
            /** @type {HTMLInputElement} */ (filter).value = formatDateFilterQuery(filterState);
            return;
        }
        /** @type {HTMLInputElement|HTMLSelectElement} */ (filter).value =
            filter.dataset.percent === "true"
                ? String(Number(filterState.value) * 100)
                : String(filterState.value ?? "");
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
        const filter = isSelect
            ? this.#createSelectFilter(column, type)
            : this.#configureTextFilter(document.createElement("input"), column, type);
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
        // Allows binding filter to this column
        filter.dataset.name = column.field ?? "";
        filter.id = randstr("dg-filter-");
        // Don't use aria-label as it triggers autocomplete
        filter.setAttribute("aria-labelledby", relatedTh.getAttribute("id") ?? "");
        return filter;
    }

    /**
     * @param {Column} column
     * @param {"select"|"boolean"} type
     * @returns {HTMLSelectElement}
     */
    #createSelectFilter(column, type) {
        const filter = document.createElement("select");
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
            for (const option of options) {
                addSelectOption(filter, String(option.value), option.text);
            }
        } else {
            for (const option of this.getFilterOptions(column)) {
                addSelectOption(filter, String(option.value), option.text);
            }
        }
        return filter;
    }

    /**
     * @param {HTMLInputElement} input
     * @param {Column} column
     * @param {"text"|"number"|"date"} type
     * @returns {HTMLInputElement}
     */
    #configureTextFilter(input, column, type) {
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
        return input;
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
        this.#columns = this.buildColumns();
        this.runPlugins("beforeRender");
        this.#renderContext = "body";

        const tbody = document.createElement("tbody");
        const prev = this.tbody;
        const message = prev?.getAttribute("data-empty-message") ?? "";

        for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
            tbody.appendChild(this.#renderDataRow(this.rows[rowIndex], rowIndex));
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

        this.runPlugins("afterRender", this.#renderContext);
        this.queueFrozenSync();

        if (this.hasDataError || this.rows.length) {
            this.removeAttribute("data-empty");
        } else {
            this.setAttribute("data-empty", "");
        }

        dispatch(this, "bodyRendered");
    }

    /**
     * Render one record row and its cells.
     * @param {Record<string, any>} item
     * @param {Number} rowIndex
     * @returns {HTMLTableRowElement}
     */
    #renderDataRow(item, rowIndex) {
        const tr = document.createElement("tr");
        // Explicit marker lets selection, fixed-height and responsive logic
        // ignore detail rows.
        tr.classList.add("dg-data-row");
        tr.dataset.rowIndex = String(rowIndex);
        if (this.options.rowClick === "select" && this.options.selectable) {
            tr.classList.add("dg-clickable-row");
        }

        for (const column of this.getColumns()) {
            if (!column) {
                console.error("Empty column found!", this.getColumns());
                continue;
            }
            const field = column.field;
            if (column.attr) {
                if (field && item[field] != null) {
                    if (column.attr === "class") {
                        tr.classList.add(...item[field].trim().split(/\s+/));
                    } else {
                        tr.setAttribute(column.attr, item[field]);
                    }
                }
                continue;
            }

            const td = this.#createColumnCell("td", column);
            if (column.wrap ?? this.options.wrap) {
                td.classList.add("dg-wrap");
            }
            td.setAttribute("data-name", column.title ?? "");

            const ctx = {
                grid: this,
                column,
                row: item,
                rowIndex,
                value: field ? item[field] : undefined,
                tr,
            };
            const cellClass = typeof column.cellClass === "function" ? column.cellClass(ctx) : column.cellClass;
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

        dispatch(this, "rowRendered", { rowData: item, tr });
        return tr;
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
        if (this.btnFirst) this.btnFirst.disabled = this.#query.page <= 1;
        if (this.btnPrev) this.btnPrev.disabled = this.#query.page <= 1;
        if (this.btnNext) this.btnNext.disabled = this.#query.page >= this.pages;
        if (this.btnLast) this.btnLast.disabled = this.#query.page >= this.pages;
        this.updateMetaLabel();
        this.updatePageStatus();
        tfoot.toggleAttribute("hidden", this.options.autohidePager && this.#query.pageSize > this.total);
    }

    /**
     * @public
     * @returns {number}
     */
    totalPages() {
        // At least one page: zero results is the logical page 1/1, never 1/0.
        return Math.max(1, Math.ceil(this.total / (this.#query.pageSize || 1)));
    }

    /**
     * Make sure the current page is still valid
     */
    fixPage() {
        if (!this.inputPage) return this;
        this.pages = this.totalPages();
        if (this.#query.page > this.pages) {
            this.#query.page = Math.max(1, this.pages);
        }
        if (this.#query.page < 1) {
            this.#query.page = 1;
        }
        // Show current page in input
        this.inputPage.max = `${this.pages}`;
        this.inputPage.value = `${this.#query.page}`;
        this.inputPage.disabled = this.pages < 2;
        this.updatePageStatus();
        return this;
    }
}

export { DataGrid };
export default DataGrid;
