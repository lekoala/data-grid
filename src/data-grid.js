/**
 * Data Grid Web component
 * https://github.com/lekoala/data-grid
 */

import BaseElement from "./core/base-element.js";
import { ArrayDataSource, FetchDataSource } from "./data-source.js";
import addSelectOption from "./utils/addSelectOption.js";
import debounce from "./utils/debounce.js";
import getTextWidth from "./utils/getTextWidth.js";
import randstr from "./utils/randstr.js";
import {
    $,
    addClass,
    ce,
    dispatch,
    find,
    findAll,
    hasClass,
    on,
    removeAttribute,
    setAttribute,
    toggleClass,
} from "./utils/shortcuts.js";

/** @typedef {import("./data-source.js").DataSource} DataSource */
/** @typedef {import("./data-source.js").QueryState} QueryState */
/** @typedef {import("./data-source.js").PageResult} PageResult */
/** @typedef {import("./data-source.js").FilterState} FilterState */
/** @typedef {import("./data-source.js").FilterOption} FilterOption */

/**
 * Column definition
 * @typedef Column
 * @property {String} [field] - the key in the data
 * @property {String} [id] - stable identifier (defaults to field). Plugin columns use "$..." ids.
 * @property {Boolean} [virtual] - injected by a plugin
 * @property {"start"|"end"} [position] - order group for plugin columns
 * @property {String} [title] - the title to display in the header (defaults to "field" if not set)
 * @property {Number} [width] - the width of the column (auto otherwise)
 * @property {String} [class] - class to set on the column (target body or header with th.class or td.class)
 * @property {String} [attr] - don't render the column and set a matching attribute on the row with the value of the field
 * @property {Boolean} [hidden] - hide the column
 * @property {Boolean} [sortable] - disable sorting for this column (defaults to the grid-wide `sortable`)
 * @property {Boolean} [filterable] - disable filtering for this column (defaults to the grid-wide `filterable`)
 * @property {String} [transform] - custom value transformation
 * @property {Boolean} [editable] - replace with input (EditableColumn module)
 * @property {String} [editableType] - type of input (EditableColumn module)
 * @property {(value: *, ctx: Object) => (Boolean | String)} [validate] - (value, { row, column, grid }) => Boolean | error message (EditableColumn module)
 * @property {Number} [responsive] - the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)
 * @property {Boolean} [responsiveHidden] - hidden through responsive module (ResponsiveGrid module)
 * @property {String} [filterType] - defines a filter field type ("text" or "select" - defaults to "text")
 * @property {Array<any>} [filterList] - defines a custom array to populate a filter select field in the format of [{value: "", text: ""},...]. When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records.
 * @property {FilterOption} [firstFilterOption] - defines an object for the first option element of the filter select field. defaults to {value: "", text: ""}
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
 * Row action
 * @typedef Action
 * @property {String} name - the name of the action (button[data-action])
 * @property {String} [label] - the button label and accessible name
 * @property {String} [intent] - "default" | "primary" | "danger" (defaults to "default")
 * @property {String | Function} [href] - link for the action (string with {field} interpolation or (row) => string)
 * @property {Function} [visible] - (row) => Boolean, hides the action when falsy
 * @property {Function} [disabled] - (row) => Boolean, disables the button when truthy
 * @property {Function} [render] - ({ action, row, grid }) => content, replaces the button content (label stays the accessible name)
 * @property {Boolean} [confirm] - needs confirmation
 * @property {Boolean} [default] - is the default row action
 * @property {String} [class] - the class for the button
 */

/**
 * Bulk action applied to the whole selection, server-first.
 * @typedef BulkAction
 * @property {String} name - the name of the action
 * @property {String} label - the label of the button
 * @property {String} [intent] - "default" | "primary" | "danger" (defaults to "default")
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
 * @property {Boolean} debug Log actions in DevTools console
 * @property {Boolean} sortable Allows a sort by column functionality
 * @property {Boolean} filterable Allows a filtering functionality
 * @property {String} dir Dir
 * @property {"compact"|"default"|"comfortable"} [density] Row density (maps to --dg-padding-* tokens)
 * @property {Array<any>} pageSizes Available page size options
 * @property {Boolean} showPageSize Shows the page size select element
 * @property {Column[]} columns Available columns
 * @property {Action[]} actions Row actions (RowActions module)
 * @property {Function} [actionRenderer] - global action renderer: ({ action, row, grid }) => content, applied when an action has no render
 * @property {Boolean} collapseActions Group actions (RowActions module)
 * @property {Boolean} expand  Allow cell content to spawn over multiple lines
 * @property {Boolean} resizable Make columns resizable (ColumnResizer module)
 * @property {Boolean} selectable Allow multi-selecting rows with a checkboxes (SelectableRows module)
 * @property {Boolean} selectVisibleOnly Select all only selects visible rows (SelectableRows module)
 * @property {Boolean} singleSelect Enables single row select with radio buttons - no need to set selectable (SelectableRows module)
 * @property {String | Function} [rowKey] The field name or a function resolving a stable row key (defaults to "id")
 * @property {String | Function | null} [rowLabel] Field name or (row, index) => string resolving the human-readable label of a row, used for accessible control names (falls back to rowKey, then index)
 * @property {BulkAction[]} [bulkActions] Bulk actions applied to the current selection (BulkActions module)
 * @property {Boolean} autosize Compute column sizes based on given data (Autosize module)
 * @property {Boolean} autoheight Adjust height so that it matches table size (FixedHeight module)
 * @property {Boolean} autohidePager auto-hides the pager when number of records falls below the selected page size
 * @property {Boolean} menu Right click menu on column headers (ContextMenu module)
 * @property {Boolean} reorder Allows a column reordering functionality (DraggableHeaders module)
 * @property {Boolean} responsive Change display mode on small screens (ResponsiveGrid module)
 * @property {Boolean} responsiveToggle Show toggle column (ResponsiveGrid module)
 * @property {Number} filterDelay Debounce delay in milliseconds before a text filter is applied (0 = immediate). Enter and select changes apply immediately.
 * @property {Boolean} searchable Show the global search input (core, not a plugin)
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
 * @property {String} resultCount
 * @property {String} selectedCount
 * @property {String} selectAll
 * @property {String} selectRow
 * @property {String} toggleActions
 * @property {String} resizeColumn
 * @property {String} search
 * @property {String} noData
 * @property {String} loading
 * @property {String} areYouSure
 * @property {String} networkError
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
 * @type {Labels}
 */
let labels = {
    itemsPerPage: "Items per page",
    gotoPage: "Go to page",
    gotoFirstPage: "Go to first page",
    gotoPrevPage: "Go to previous page",
    gotoNextPage: "Go to next page",
    gotoLastPage: "Go to last page",
    pageRange: "{from} - {to} of {total} items",
    resultCount: "{count} items",
    selectedCount: "{count} selected",
    selectAll: "Select all rows",
    selectRow: "Select {row}",
    toggleActions: "Toggle row actions",
    resizeColumn: "Resize column",
    search: "Search",
    noData: "No data",
    loading: "Loading…",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
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
            // the operator works without a value (empty/notEmpty).
            const hasValue = value !== undefined && value !== null && value !== "";
            if (hasValue || operator === "empty" || operator === "notEmpty") {
                filters[key] = /** @type {FilterState} */ (hasValue ? { operator, value } : { operator });
            }
        }
    }
    return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), search, sort, filters };
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
 * Apply a renderer result to a cell.
 * primitive -> textContent, Node -> append, { html } -> innerHTML (opt-in).
 * @param {HTMLElement} el
 * @param {*} content
 */
function applyCellContent(el, content) {
    if (content === undefined || content === null) {
        return;
    }
    if (content instanceof Node) {
        el.appendChild(content);
        return;
    }
    if (typeof content === "object" && content.html !== undefined) {
        el.innerHTML = content.html;
        return;
    }
    el.textContent = content;
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
 * Column definition will update some props on the html element
 * @param {HTMLElement} el
 * @param {Column} column
 */
function applyColumnDefinition(el, column) {
    if (column.width) {
        setAttribute(el, "width", column.width);
    }
    if (column.class) {
        addClass(el, column.class);
    }
    if (isColumnHidden(column)) {
        setAttribute(el, "hidden", "");
        if (column.responsiveHidden) {
            addClass(el, "dg-responsive-hidden");
        }
    }
    if (column.sortable === false && el.tagName === "TH") {
        addClass(el, "dg-not-sortable");
    }
}

/**
 */
class DataGrid extends BaseElement {
    _filterSelector = "[id^=dg-filter]";
    _excludedRowElementSelector = "a,button,input,select,textarea";

    /**
     * Instantiated plugins, keyed by their registration name.
     * @type {PluginInstances}
     */
    plugins = this._initPlugins();

    /**
     * Initial query used by resetQuery()
     * @type {QueryState}
     */
    _initialQuery = normalizeQuery(this.options.initialQuery);

    /**
     * Runtime query state, single source of truth
     * @type {QueryState}
     */
    _query = normalizeQuery(this._initialQuery);

    /**
     * Selection state, single source of truth for row selection
     * @type {SelectionState}
     */
    _selection = { mode: "explicit", ids: new Set(), except: new Set() };

    /**
     * @type {Number}
     */
    _requestSeq = 0;

    /**
     * @type {?AbortController}
     */
    _controller = null;

    /**
     * Optional initial result, can be set as a property before connection
     * @type {PageResult|null}
     */
    initialResult = null;

    /**
     * @type {PageResult|null}
     */
    _initialResult = this.options.initialResult || this.initialResult || null;

    /**
     * Rows of the current page
     * @type {Array<Record<string, any>>}
     */
    rows = [];

    /**
     * Total number of rows matching the current query
     * @type {Number}
     */
    total = 0;

    /**
     * Meta information returned by the data source
     * @type {Record<string, any>}
     */
    meta = {};

    /**
     * @type {Number}
     */
    pages = 0;

    /**
     * @type {Boolean}
     */
    loading = false;

    /**
     * @type {?Error}
     */
    error = null;

    /**
     * Normalized columns of the current render cycle
     * @type {Column[]}
     */
    _columns = [];

    /**
     * The active data source, set by setupDataSource().
     * @type {DataSource|null}
     */
    dataSource = null;

    /**
     * DOM refs set on connect from the rendered template.
     * @type {HTMLTableElement|null}
     */
    table = null;

    /** @type {HTMLInputElement|null} */
    btnFirst = null;

    /** @type {HTMLInputElement|null} */
    btnPrev = null;

    /** @type {HTMLInputElement|null} */
    btnNext = null;

    /** @type {HTMLInputElement|null} */
    btnLast = null;

    /** @type {HTMLSelectElement|null} */
    selectPerPage = null;

    /** @type {HTMLInputElement|null} */
    inputPage = null;

    /** @type {HTMLInputElement|null} */
    searchInput = null;

    /** @type {HTMLTableRowElement|null} */
    headerRow = null;

    /** @type {Number|null} */
    rowHeight = null;

    /**
     * Current render context, set by renderTable/renderBody.
     * @type {import("./core/base-plugin.js").RenderContext|null}
     */
    _renderContext = null;

    _ready() {
        this.fireEvents = false;
        setAttribute(this, "id", this.options.id ?? randstr("el-"), true);
        if (this.options.singleSelect) this.options.selectable = true; // singleSelect implies selectable
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
<table>
    <thead>
        <tr class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr class="dg-head-filters"></tr>
    </thead>
    <tbody data-empty-message="${labels.noData}"></tbody>
    <tfoot hidden>
        <tr>
            <td>
            <div class="dg-footer">
                <div class="dg-page-nav">
                  <select class="dg-select-per-page" aria-label="${labels.itemsPerPage}"></select>
                </div>
                <div class="dg-pagination">
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
                <div class="dg-meta">${formatLabel(labels.pageRange, { from: 0, to: 0, total: 0 })}</div>
            </div>
            </td>
        </tr>
    </tfoot>
</table>
<div class="dg-status" role="status" aria-atomic="true"></div>
<ul class="dg-menu" hidden></ul>
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

    updateLabels() {
        if (this.selectPerPage) {
            this.selectPerPage.setAttribute("aria-label", this.labels.itemsPerPage);
        }
        if (this.inputPage) {
            this.inputPage.setAttribute("aria-label", this.labels.gotoPage);
        }
        if (this.searchInput) {
            this.searchInput.setAttribute("aria-label", this.labels.search);
            this.searchInput.setAttribute("placeholder", this.labels.search);
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
            transform: "",
            filterType: "text",
            firstFilterOption: { value: "", text: "" },
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
            collapseActions: false,
            selectable: false,
            selectVisibleOnly: true,
            singleSelect: false,
            rowKey: "id",
            rowLabel: null,
            bulkActions: [],
            resizable: false,
            autosize: true,
            expand: false,
            autoheight: true,
            autohidePager: false,
            responsive: false,
            responsiveToggle: true,
            filterDelay: 300,
            searchable: false,
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
            const fn = Reflect.get(plugin, hook);
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
     * The normalized column list of the current render cycle.
     * @public
     * @returns {Column[]}
     */
    getColumns() {
        return this._columns;
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
            "sortable",
            "filterable",
            "searchable",
            "min-search-length",
            "responsive",
            "selectable",
            "single-select",
            "reorder",
            "menu",
            "expand",
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

    /** @returns {HTMLTableSectionElement} */
    get thead() {
        return /** @type {HTMLTableSectionElement} */ ($("thead", this));
    }

    /** @returns {HTMLTableSectionElement} */
    get tbody() {
        return /** @type {HTMLTableSectionElement} */ ($("tbody", this));
    }

    /** @returns {HTMLTableSectionElement} */
    get tfoot() {
        return /** @type {HTMLTableSectionElement} */ ($("tfoot", this));
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
        const requestId = ++this._requestSeq;
        this._controller?.abort();
        const controller = new AbortController();
        this._controller = controller;

        this.loading = true;
        this.error = null;
        setAttribute(this, "data-loading", "");
        removeAttribute(this, "data-error");
        this.#updateStatus(this.labels.loading);

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
            this.#updateStatus(
                this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData,
            );
        } catch (err) {
            if (requestId !== this._requestSeq) return;
            const e = /** @type {any} */ (err);
            if (e?.name === "AbortError" || controller.signal.aborted) return;
            const message =
                this.options.errorMessage || e?.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || this.labels.networkError;
            this.error = e;
            setAttribute(this, "data-error", "");
            this.tbody?.setAttribute("data-empty-message", message);
            this.#updateStatus(message);
            this.renderBody();
            dispatch(this, "loadError", e);
        } finally {
            if (requestId === this._requestSeq) {
                this.loading = false;
                removeAttribute(this, "data-loading");
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
            this.options.columns = this.convertColumns(Object.keys(this.rows[0]));
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
        setAttribute(this, "dir", this.options.dir);
    }

    showPageSizeChanged() {
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    }

    responsiveChanged() {
        this.runPlugins("responsiveChanged", this.options.responsive);
        this.renderTable();
    }

    menuChanged() {
        this.renderHeader();
    }

    selectableChanged() {
        this.renderTable();
        this.renderBody();
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
            topbar = ce("div");
            topbar.className = "dg-topbar";
            const start = ce("div");
            start.className = "dg-topbar-start";
            const end = ce("div");
            end.className = "dg-topbar-end";
            topbar.append(start, end);
            const table = this.table;
            if (table) {
                this.insertBefore(topbar, table);
            } else {
                this.appendChild(topbar);
            }
        }
        return topbar;
    }

    /**
     * Create (once) or remove the global search input based on the `searchable`
     * option. The control is kept stable across renders to avoid focus loss.
     */
    renderSearch() {
        if (!this.options.searchable) {
            this.searchInput?.remove();
            this.searchInput = null;
            return;
        }
        if (this.searchInput) {
            this.searchInput.setAttribute("aria-label", this.labels.search);
            this.searchInput.setAttribute("placeholder", this.labels.search);
            return;
        }
        const input = ce("input");
        input.type = "search";
        input.className = "dg-search";
        input.setAttribute("placeholder", this.labels.search);
        input.setAttribute("aria-label", this.labels.search);
        input.value = this._query.search;

        // The visible value can temporarily diverge from query.search: it is
        // only committed when it becomes valid (see commitSearch). The
        // selection is invalidated as soon as the value changes, so a bulk
        // action never targets the population of a previous search.
        let composing = false;
        const apply = debounce(() => this.commitSearch(), this.options.searchDelay);
        input.addEventListener("input", () => {
            this._clearSelectionIfNeeded();
            if (!composing) {
                apply();
            }
        });
        input.addEventListener("compositionstart", () => {
            composing = true;
        });
        input.addEventListener("compositionend", () => {
            composing = false;
            apply();
        });
        input.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
            if (composing) {
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                apply.flush();
            } else if (e.key === "Escape" && input.value) {
                input.value = "";
                apply.cancel();
                this.commitSearch();
            }
        });

        this.ensureTopbar().querySelector(".dg-topbar-end")?.appendChild(input);
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

    async _connected() {
        connectedInstances.add(this);
        this.table = this.querySelector("table");
        this.btnFirst = this.querySelector(".dg-btn-first");
        this.btnPrev = this.querySelector(".dg-btn-prev");
        this.btnNext = this.querySelector(".dg-btn-next");
        this.btnLast = this.querySelector(".dg-btn-last");
        this.selectPerPage = this.querySelector(".dg-select-per-page");
        this.inputPage = this.querySelector(".dg-input-page");

        this.getFirst = this.getFirst.bind(this);
        this.getPrev = this.getPrev.bind(this);
        this.getNext = this.getNext.bind(this);
        this.getLast = this.getLast.bind(this);
        this.changePerPage = this.changePerPage.bind(this);
        this.gotoPage = this.gotoPage.bind(this);

        this.btnFirst?.addEventListener("click", this.getFirst);
        this.btnPrev?.addEventListener("click", this.getPrev);
        this.btnNext?.addEventListener("click", this.getNext);
        this.btnLast?.addEventListener("click", this.getLast);
        this.selectPerPage?.addEventListener("change", this.changePerPage);
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
        this.inputPage?.addEventListener("change", this.gotoPage);

        this.setupDataSource();
        this.setupInitialState();

        for (const plugin of Object.values(this.plugins)) {
            await plugin.connected?.();
        }

        // Display even if we don't have data
        this.dirChanged();
        this.populatePageSizes();
        this.updateLabels();
        this.renderSearch();

        await this.init();
    }

    _disconnected() {
        connectedInstances.delete(this);
        this._controller?.abort();
        this.btnFirst?.removeEventListener("click", this.getFirst);
        this.btnPrev?.removeEventListener("click", this.getPrev);
        this.btnNext?.removeEventListener("click", this.getNext);
        this.btnLast?.removeEventListener("click", this.getLast);
        this.selectPerPage?.removeEventListener("change", this.changePerPage);
        this.inputPage?.removeEventListener("change", this.gotoPage);

        for (const plugin of Object.values(this.plugins)) {
            plugin.disconnected?.();
        }
    }

    init() {
        return this.load().finally(() => {
            this.configureUi();

            this.classList.add("dg-initialized"); //acts as a flag to prevent unnecessary server calls down the chain.

            this.fireEvents = true; // We can now fire attributeChangedCallback events

            this.log("initialized");
        });
    }

    /**
     * @param {String} field
     * @returns {Column|null}
     */
    getCol(field) {
        let found = null;

        for (const col of this.options.columns) {
            if (col.field === field) {
                found = col;
            }
        }
        return found;
    }

    /**
     * @param {String} field
     * @param {String} prop
     * @returns {any}
     */
    getColProp(field, prop) {
        const c = this.getCol(field);
        return c ? Reflect.get(c, prop) : null;
    }

    /**
     * @param {String} field
     * @param {String} prop
     * @param {any} val
     */
    setColProp(field, prop, val) {
        const c = this.getCol(field);
        if (c) {
            Reflect.set(c, prop, val);
        }
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
            const id = column.id ?? column.field;
            const hidden = isColumnHidden(column);
            for (const cell of findAll(this, `[data-column-id="${id}"]`)) {
                cell.toggleAttribute("hidden", hidden);
                cell.classList.toggle("dg-responsive-hidden", Boolean(column.responsiveHidden));
            }
        }
        this.renderFooter();
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
            const tr = find(this, "tbody tr") || find(this, "table tr");
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
        const sel = this._selection;
        return sel.mode === "all" ? !sel.except.has(key) : sel.ids.has(key);
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
            const trs = Array.from(tbody.querySelectorAll("tr"));
            for (let i = 0; i < this.rows.length; i++) {
                const tr = trs[i];
                if (!tr || tr.classList.contains("dg-fake-row")) {
                    continue;
                }
                if (this.isRowSelected(this.rows[i], i)) {
                    setAttribute(tr, "data-selected", "");
                } else {
                    removeAttribute(tr, "data-selected");
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
        const headers = findAll(this, "thead tr.dg-head-columns th");
        for (const th of headers) {
            const match = sort.find((s) => s.field === th.getAttribute("field"));
            const indicator = th.querySelector(".dg-sort-indicator");
            if (match) {
                th.setAttribute("aria-sort", match.direction === "asc" ? "ascending" : "descending");
                setAttribute(th, "data-sort", match.direction);
                if (indicator) indicator.textContent = match.direction === "asc" ? "↑" : "↓";
            } else {
                th.removeAttribute("aria-sort");
                th.removeAttribute("data-sort");
                if (indicator) indicator.textContent = "↕";
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

    /** @public @param {String} columnName */
    sortAsc = (columnName) => this._sort(columnName, "asc");
    /** @public @param {String} columnName */
    sortDesc = (columnName) => this._sort(columnName, "desc");
    /** @public @param {String} columnName */
    sortNone = (columnName) => this._sort(columnName, "none");

    /**
     * @public
     * @returns {Promise<void>}
     */
    clearFilters() {
        const inputs = findAll(this, this._filterSelector);
        for (const input of inputs) {
            input.value = "";
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
     * Collect current filter inputs into the query and reload.
     */
    filterData() {
        this.log("filter data");

        /** @type {Record<string, FilterState>} */
        const filters = {};
        const inputs = findAll(this, this._filterSelector);
        for (const input of inputs) {
            const value = input.value;
            const name = input.dataset.name;
            if (value && name) {
                const isSelect = /select/i.test(input.tagName);
                filters[name] = {
                    operator: isSelect ? "eq" : "contains",
                    value,
                };
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
                cap = ce("caption");
                table.insertBefore(cap, table.firstChild);
            }
            cap.textContent = caption;
            table.removeAttribute("aria-labelledby");
            table.removeAttribute("aria-label");
        } else {
            cap?.remove();
            const labelledby = this.getAttribute("aria-labelledby");
            const ariaLabel = this.getAttribute("aria-label");
            if (labelledby) {
                table.setAttribute("aria-labelledby", labelledby);
                table.removeAttribute("aria-label");
            } else if (ariaLabel) {
                table.setAttribute("aria-label", ariaLabel);
                table.removeAttribute("aria-labelledby");
            } else {
                table.removeAttribute("aria-labelledby");
                table.removeAttribute("aria-label");
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
        const availableWidth = this.clientWidth;
        const colMaxWidth = Math.round((availableWidth / this.columnsLength(true)) * 2);

        // Create row
        const tr = ce("tr");
        this.headerRow = tr;
        tr.setAttribute("class", "dg-head-columns");

        // We need a real th from the dom to compute the size
        let sampleTh = /** @type {HTMLTableCellElement | null} */ (thead?.querySelector("tr.dg-head-columns th"));
        this.log("createColumnHeaders - sampleTh", sampleTh);
        if (!sampleTh) {
            sampleTh = ce("th");
            thead?.querySelector("tr")?.appendChild(sampleTh);
        }

        // Create columns
        let totalWidth = 0;
        this.log("createColumnHeaders - columns", this.getColumns());

        for (const column of this.getColumns()) {
            if (column.attr) {
                continue;
            }
            const th = ce("th");
            th.setAttribute("scope", "col");
            setAttribute(th, "data-column-id", column.id ?? column.field);
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
            // the column class (ex: dg-selectable, dg-actions, dg-responsive-toggle)
            // so header and body share the same styling hooks.
            if (column.class) {
                addClass(th, column.class);
            }
            if (isColumnHidden(column)) {
                th.setAttribute("hidden", "");
            }

            tr.appendChild(th);
            if (!isColumnHidden(column)) {
                totalWidth += Number.parseInt(th.getAttribute("width") ?? "") || 0;
            }
        }

        // There is too much available width, and we want to avoid fixed layout to split remaining amount
        if (totalWidth < availableWidth) {
            const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
            if (visibleCols.length) {
                const lastCol = visibleCols[visibleCols.length - 1];
                removeAttribute(lastCol, "width");
            }
        }

        const oldRow = thead?.querySelector("tr.dg-head-columns");
        if (thead && oldRow) {
            thead.replaceChild(tr, oldRow);
        }

        // Once columns are inserted, we have an actual dom to query
        if (thead && thead.offsetWidth > availableWidth) {
            this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
            const scrollbarWidth = this.offsetWidth - this.clientWidth;
            let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
            if (this.options.responsive) {
                diff += scrollbarWidth;
            }
            // Remove diff for columns that can afford it
            const thWithWidth = findAll(tr, "th[width]");

            for (const th of thWithWidth) {
                if (hasClass(th, "dg-not-resizable")) {
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
                    setAttribute(th, "width", newWidth);
                }
            }
        }

        // Sort col on button click (native button handles Enter/Space)
        const sortableHeaders = findAll(tr, "th.dg-sortable");
        for (const th of sortableHeaders) {
            const button = th.querySelector("button[type=button]");
            if (button) {
                button.addEventListener("click", () => this.sortData(th));
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
            setAttribute(th, "data-responsive", column.responsive || "");
        }
        // Make sure the header fits (+ add some room for sort icon if necessary)
        const computedWidth = getTextWidth(column.title ?? "", sampleTh ?? document.body, true) + 20;
        th.dataset.minWidth = `${computedWidth}`;
        applyColumnDefinition(th, column);

        const w = Math.max(Number.parseInt(th.dataset.minWidth ?? ""), Number.parseInt(th.getAttribute("width") ?? ""));
        setAttribute(th, "width", w);
        // Preferred width before the compression phase: ResponsiveGrid reasons
        // on this value instead of the post-compression width.
        th.dataset.preferredWidth = `${w}`;
        if (isColumnHidden(column)) {
            th.setAttribute("hidden", "");
        }

        if (sortable) {
            const direction = this.getColumnSortDirection(column.field ?? "");
            if (direction) {
                th.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
                setAttribute(th, "data-sort", direction);
            }
            const button = ce("button");
            button.type = "button";
            button.classList.add("dg-sort");

            const label = ce("span");
            label.classList.add("dg-sort-label");
            label.textContent = column.title ?? "";

            // Always-visible affordance: neutral glyph when unsorted, the
            // direction glyph when active. Kept out of the accessibility tree
            // (aria-hidden) so the accessible name stays just the column title.
            const indicator = ce("span");
            indicator.classList.add("dg-sort-indicator");
            indicator.setAttribute("aria-hidden", "true");
            if (direction === "asc") {
                indicator.textContent = "↑";
            } else if (direction === "desc") {
                indicator.textContent = "↓";
            } else {
                indicator.textContent = "↕";
            }

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
        const tr = ce("tr");
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
            const th = ce("th");
            setAttribute(th, "data-column-id", column.id ?? column.field);

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
        if (thead && oldRow) {
            thead.replaceChild(tr, oldRow);
        }

        // Filter content by field events: live debounced text filtering,
        // immediate discrete controls, Enter/Escape shortcuts, IME-aware.
        const filteredRows = findAll(tr, this._filterSelector);
        for (const el of filteredRows) {
            if (/select/i.test(el.tagName)) {
                el.addEventListener("change", () => this.filterData());
                continue;
            }

            const input = /** @type {HTMLInputElement} */ (el);
            /** @type {Boolean} */
            let composing = false;
            const apply = debounce(() => this.filterData(), this.options.filterDelay);

            input.addEventListener("input", () => {
                if (!composing) {
                    apply();
                }
            });
            // IME composition (CJK...): only filter once the composition ends,
            // never on intermediate fragments.
            input.addEventListener("compositionstart", () => {
                composing = true;
            });
            input.addEventListener("compositionend", () => {
                composing = false;
                apply();
            });
            input.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
                if (composing) {
                    return;
                }
                if (e.key === "Enter") {
                    // Immediate apply, cancelling any pending debounce
                    e.preventDefault();
                    apply.flush();
                } else if (e.key === "Escape" && input.value) {
                    input.value = "";
                    apply.cancel();
                    this.filterData();
                }
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

        // Reflect the current query filters into the input
        const field = column.field;
        if (field) {
            const filterState = /** @type {FilterState|undefined} */ (this._query.filters?.[field]);
            if (filterState) {
                filter.value = filterState.value ?? "";
            }
        }

        th.appendChild(filter);
    }

    /**
     * @param {Column} column
     * @param {HTMLTableCellElement} relatedTh
     * @returns {HTMLInputElement|HTMLSelectElement}
     */
    createFilterElement(column, relatedTh) {
        const isSelect = column.filterType === "select";
        const filter = isSelect ? ce("select") : ce("input");
        filter.classList.add("dg-filter");
        filter.classList.add("dg-filter-control");
        if (isSelect) {
            for (const e of this.getFilterOptions(column)) {
                const opt = ce("option");
                opt.value = `${e.value}`;
                opt.text = e.text;

                if (filter instanceof HTMLSelectElement) {
                    filter.add(opt);
                }
            }
        } else {
            const input = /** @type {HTMLInputElement} */ (filter);
            input.type = "text";
            input.inputMode = "search";
            input.autocomplete = "off";
            input.placeholder = "Filter…";
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
        const firstFilterOption = column.firstFilterOption ||
            this.defaultColumn.firstFilterOption || { value: "", text: "" };
        // An explicit filter list is authoritative and returned as-is
        if (Array.isArray(column.filterList)) {
            return column.filterList;
        }
        // Server-provided options for server-first grids
        const metaOptions = field ? this.meta?.filters?.[field] : undefined;
        if (Array.isArray(metaOptions)) {
            return [firstFilterOption, ...metaOptions];
        }
        // A local data source owns the full collection and can derive options
        if (this.dataSource instanceof ArrayDataSource) {
            const uniqueValues = [...new Set((this.dataSource.rows ?? []).map((e) => (field ? e[field] : undefined)))]
                .filter((v) => v !== undefined && v !== null && v !== "")
                .sort();
            return [firstFilterOption, ...uniqueValues.map((e) => ({ value: e, text: e }))];
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

        const tbody = ce("tbody");
        const prev = this.tbody;
        const message = prev?.getAttribute("data-empty-message") ?? "";

        let i = 0;
        for (const item of this.rows) {
            const tr = ce("tr");

            // Expandable
            if (this.options.expand) {
                tr.classList.add("dg-expandable");

                on(tr, "click", (ev) => {
                    if (ev.target.matches(this._excludedRowElementSelector)) return;
                    toggleClass(ev.currentTarget, "dg-expanded");
                });
            }

            for (const column of this.getColumns()) {
                if (!column) {
                    console.error("Empty column found!", this.getColumns());
                    continue;
                }
                const field = column.field;
                // It should be applied as an attr of the row
                if (column.attr) {
                    if (field && item[field]) {
                        // Special case if we try to write over the class attr
                        if (column.attr === "class") {
                            addClass(tr, item[field]);
                        } else {
                            tr.setAttribute(column.attr, item[field]);
                        }
                    }
                    continue;
                }
                const td = ce("td");
                setAttribute(td, "data-column-id", column.id ?? field);
                applyColumnDefinition(td, column);
                // Kept for ResponsiveGrid: the expanded child rows label each
                // hidden value with the column title.
                td.setAttribute("data-name", column.title ?? "");

                const ctx = { grid: this, column, row: item, rowIndex: i, value: field ? item[field] : undefined, tr };
                if (column.renderCell) {
                    applyCellContent(td, column.renderCell(ctx));
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
        const colspan = Math.max(1, this.columnsLength(true));
        if (this.hasDataError) {
            const tr = ce("tr");
            tr.classList.add("dg-error-row");
            const td = ce("td");
            td.colSpan = colspan;
            td.textContent = message || this.labels.networkError;
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else if (this.rows.length === 0) {
            const tr = ce("tr");
            tr.classList.add("dg-empty-row");
            const td = ce("td");
            td.colSpan = colspan;
            td.textContent = this.noData;
            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        // Keep data empty message
        if (prev) {
            tbody.setAttribute("data-empty-message", message);
            this.table?.replaceChild(tbody, prev);
        }

        this.paginate();

        this.runPlugins("afterRender", this._renderContext);

        if (this.hasDataError || this.rows.length) {
            removeAttribute(this, "data-empty");
        } else {
            setAttribute(this, "data-empty", "");
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
            addClass(td, "dg-editable-col");
            td.dataset.field = field;
            td.dataset.rowIndex = `${i}`;
        }

        const v = item[field] ?? "";
        let tv;
        // TODO: make this modular
        switch (column.transform) {
            case "uppercase":
                tv = v.toUpperCase();
                break;
            case "lowercase":
                tv = v.toLowerCase();
                break;
            default:
                tv = v;
                break;
        }
        td.textContent = tv;
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
        return this;
    }
}

export { DataGrid };
export default DataGrid;
