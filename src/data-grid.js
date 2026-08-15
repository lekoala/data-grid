/**
 * Data Grid Web component
 *
 * Credits for inspiration
 * @link https://github.com/riverside/zino-grid
 */

import BaseElement from "./core/base-element.js";
import { ArrayDataSource, FetchDataSource } from "./data-source.js";
import addSelectOption from "./utils/addSelectOption.js";
import debounce from "./utils/debounce.js";
import getTextWidth from "./utils/getTextWidth.js";
import interpolate from "./utils/interpolate.js";
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

/**
 * Column definition
 * @typedef Column
 * @property {String} field - the key in the data
 * @property {String} title - the title to display in the header (defaults to "field" if not set)
 * @property {Number} [width] - the width of the column (auto otherwise)
 * @property {String} [class] - class to set on the column (target body or header with th.class or td.class)
 * @property {String} [attr] - don't render the column and set a matching attribute on the row with the value of the field
 * @property {Boolean} [hidden] - hide the column
 * @property {Boolean} [noSort] - allow disabling sort for a given column
 * @property {String | Function} [format] - custom data formatting
 * @property {String} [defaultFormatValue] - default value to use for formatting
 * @property {String} [transform] - custom value transformation
 * @property {Boolean} [editable] - replace with input (EditableColumn module)
 * @property {String} [editableType] - type of input (EditableColumn module)
 * @property {Number} [responsive] - the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)
 * @property {Boolean} [responsiveHidden] - hidden through responsive module (ResponsiveGrid module)
 * @property {String} [filterType] - defines a filter field type ("text" or "select" - defaults to "text")
 * @property {Array} [filterList] - defines a custom array to populate a filter select field in the format of [{value: "", text: ""},...]. When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records.
 * @property {Object} [firstFilterOption] - defines an object for the first option element of the filter select field. defaults to {value: "", text: ""}
 */

/**
 * Row action
 * @typedef Action
 * @property {String} title - the title of the button
 * @property {String} name - the name of the action
 * @property {String} class - the class for the button
 * @property {String} url - link for the action
 * @property {String} html - custom button data
 * @property {Boolean} [confirm] - needs confirmation
 * @property {Boolean} default - is the default row action
 */

// Import definitions without importing the actual file
/** @typedef {import('./plugins/autosize-column').default} AutosizeColumn */
/** @typedef {import('./plugins/column-resizer').default} ColumnResizer */
/** @typedef {import('./plugins/context-menu').default} ContextMenu */
/** @typedef {import('./plugins/draggable-headers').default} DraggableHeaders */
/** @typedef {import('./plugins/editable-column').default} EditableColumn */
/** @typedef {import('./plugins/fixed-height').default} FixedHeight */
/** @typedef {import('./plugins/responsive-grid').default} ResponsiveGrid */
/** @typedef {import('./plugins/row-actions').default} RowActions */
/** @typedef {import('./plugins/selectable-rows').default} SelectableRows */
/** @typedef {import('./plugins/touch-support').default} TouchSupport */
/** @typedef {import('./plugins/spinner-support').default} SpinnerSupport */
/** @typedef {import('./plugins/save-state').default} SaveState */

/**
 * These plugins are all optional
 * @typedef {Object} Plugins
 * @property {ColumnResizer} [ColumnResizer] resize handlers in the headers
 * @property {ContextMenu} [ContextMenu] menu to show/hide columns
 * @property {DraggableHeaders} [DraggableHeaders] draggable headers columns
 * @property {EditableColumn} [EditableColumn] draggable headers columns
 * @property {TouchSupport} [TouchSupport] touch swipe
 * @property {SelectableRows} [SelectableRows] create a column with checkboxes to select rows
 * @property {FixedHeight} [FixedHeight] allows having fixed height tables
 * @property {AutosizeColumn} [AutosizeColumn] compute ideal width based on column content
 * @property {ResponsiveGrid} [ResponsiveGrid] hide/show column on the fly
 * @property {RowActions} [RowActions] add action on rows
 * @property {SpinnerSupport} [SpinnerSupport] inserts a spinning icon element to indicate grid loading.
 * @property {SaveState} [SaveState] stores grid filter, sort, and paging.
 */

/**
 * Available data grid options, plugins included
 * @typedef Options
 * @property {?String} id Custom id for the grid
 * @property {?String} src An URL to a server-side endpoint (FetchDataSource)
 * @property {Object} params Extra constant HTTP params passed to FetchDataSource
 * @property {DataSource} [dataSource] Custom data source (defaults to FetchDataSource or ArrayDataSource)
 * @property {Boolean} debug Log actions in DevTools console
 * @property {Boolean} sortable Allows a sort by column functionality
 * @property {Boolean} filterable Allows a filtering functionality
 * @property {String} dir Dir
 * @property {Array} pageSizes Available page size options
 * @property {Boolean} showPageSize Shows the page size select element
 * @property {Column[]} columns Available columns
 * @property {Action[]} actions Row actions (RowActions module)
 * @property {Boolean} collapseActions Group actions (RowActions module)
 * @property {Boolean} expand  Allow cell content to spawn over multiple lines
 * @property {Boolean} resizable Make columns resizable (ColumnResizer module)
 * @property {Boolean} selectable Allow multi-selecting rows with a checkboxes (SelectableRows module)
 * @property {Boolean} selectVisibleOnly Select all only selects visible rows (SelectableRows module)
 * @property {Boolean} singleSelect Enables single row select with radio buttons - no need to set selectable (SelectableRows module)
 * @property {Boolean} autosize Compute column sizes based on given data (Autosize module)
 * @property {Boolean} autoheight Adjust height so that it matches table size (FixedHeight module)
 * @property {Boolean} autohidePager auto-hides the pager when number of records falls below the selected page size
 * @property {Boolean} menu Right click menu on column headers (ContextMenu module)
 * @property {Boolean} reorder Allows a column reordering functionality (DraggableHeaders module)
 * @property {Boolean} responsive Change display mode on small screens (ResponsiveGrid module)
 * @property {Boolean} responsiveToggle Show toggle column (ResponsiveGrid module)
 * @property {Boolean} filterOnEnter Toggles the ability to filter column data by pressing the Enter or Return key
 * @property {String} spinnerClass Sets a space-delimited string of css classes for a spinner (use spinner-border css class for bootstrap 5 spinner)
 * @property {Number} filterKeypressDelay Sets a keypress delay time in milliseconds before triggering filter operation.
 * @property {Boolean} saveState Enable/disable save state plugin (SaveState module)
 * @property {?String} errorMessage A generic text to be displayed in footer when error occurs.
 * @property {?String} noData A custom text to be displayed when no data is loaded. This is different from the generic labels.noData that applies for data-grid as a component.
 * @property {QueryState} [initialQuery] Initial runtime query state
 * @property {PageResult} [initialResult] Initial result to display without loading the data source
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
 * @property {String} of
 * @property {String} items
 * @property {String} resizeColumn
 * @property {String} noData
 * @property {String} areYouSure
 * @property {String} networkError
 */

/**
 * List of registered plugins
 * @type {Plugins}
 */
let plugins = {};

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
    of: "of",
    items: "items",
    resizeColumn: "Resize column",
    noData: "No data",
    areYouSure: "Are you sure?",
    networkError: "Network response error",
};

/**
 * Build a fresh, normalized QueryState.
 * @param {QueryState} [query]
 * @returns {QueryState}
 */
function normalizeQuery(query) {
    const q = /** @type {QueryState} */ (query || {});
    const page = Math.floor(Number(q.page)) || 1;
    const pageSize = Math.floor(Number(q.pageSize)) || 10;
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
            if (filter && typeof filter === "object" && "value" in filter) {
                filters[key] = { operator: filter.operator ?? "contains", value: filter.value };
            }
        }
    }
    return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), sort, filters };
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
    if (column.hidden) {
        setAttribute(el, "hidden", "");
        if (column.responsiveHidden) {
            addClass(el, "dg-responsive-hidden");
        }
    }
    if (column.noSort && el.tagName === "TH") {
        addClass(el, "dg-not-sortable");
    }
}

/**
 */
class DataGrid extends BaseElement {
    _filterSelector = "[id^=dg-filter]";
    _excludedRowElementSelector = "a,button,input,select,textarea";
    _excludedKeys = [
        37,
        39,
        38,
        40,
        45,
        36,
        35,
        33,
        34,
        27,
        20,
        16,
        17,
        91,
        92,
        18,
        93,
        144,
        231,
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Insert",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Escape",
        "CapsLock",
        "Shift",
        "Control",
        "Meta",
        "Alt",
        "ContextMenu",
        "NumLock",
        "Unidentified",
    ];

    _ready() {
        setAttribute(this, "id", this.options.id ?? randstr("el-"), true);

        // Make the IDE happy
        /**
         * @type {Options}
         */
        this.options = this.options || this.defaultOptions;
        if (this.options.singleSelect) this.options.selectable = true; // singleSelect implies selectable

        // Init values
        this.fireEvents = false;

        /**
         * @type {Plugins}
         */
        this.plugins = {};
        // Init plugins
        for (const [pluginName, pluginClass] of Object.entries(plugins)) {
            // @ts-expect-error until we can set typeof import ...
            this.plugins[pluginName] = new pluginClass(this);
        }

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

        this._requestSeq = 0;
        this._controller = null;
        /**
         * Optional initial result, can be set as a property before connection
         * @type {PageResult|null}
         */
        this.initialResult = null;
        this._initialResult = this.options.initialResult || this.initialResult || null;

        /**
         * Rows of the current page
         * @type {Array}
         */
        this.rows = [];
        /**
         * Total number of rows matching the current query
         * @type {Number}
         */
        this.total = 0;
        /**
         * Meta information returned by the data source
         * @type {Object}
         */
        this.meta = {};
        /**
         * @type {Number}
         */
        this.pages = 0;
        /**
         * @type {Boolean}
         */
        this.loading = false;
        /**
         * @type {?Error}
         */
        this.error = null;
    }

    static template() {
        return `
<table role="grid" >
    <thead role="rowgroup">
        <tr role="row" aria-rowindex="1" class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr role="row" aria-rowindex="2" class="dg-head-filters"></tr>
    </thead>
    <tbody role="rowgroup" data-empty="${labels.noData}"></tbody>
    <tfoot role="rowgroup" hidden>
        <tr role="row" aria-rowindex="1">
            <td role="gridcell">
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
                <div class="dg-meta">
                  <span class="dg-low">0</span> - <span class="dg-high">0</span> ${labels.of} <span class="dg-total">0</span> ${labels.items}
                </div>
            </div>
            </td>
        </tr>
    </tfoot>
    <ul class="dg-menu" hidden></ul>
</table>
`;
    }

    /**
     * @returns {Labels}
     */
    get labels() {
        return labels;
    }

    /**
     * @returns {Labels}
     */
    static getLabels() {
        return labels;
    }

    /**
     * @param {Object} v
     */
    static setLabels(v) {
        labels = Object.assign(labels, v);
    }

    /** Gets the text to be displayed when no data is loaded. */
    get noData() {
        return this.options.noData || this.labels.noData;
    }

    /**
     * @param {HTMLTableSectionElement} tbody
     */
    #setNoData(tbody) {
        if (!this.hasDataError && tbody.getAttribute("data-empty") !== this.noData) {
            tbody.setAttribute("data-empty", this.noData);
        }
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
            noSort: false,
            responsive: 1,
            responsiveHidden: false,
            format: "",
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
            pageSizes: [10, 25, 50, 100, 250],
            showPageSize: true,
            columns: [],
            actions: [],
            collapseActions: false,
            selectable: false,
            selectVisibleOnly: true,
            singleSelect: false,
            resizable: false,
            autosize: true,
            expand: false,
            autoheight: true,
            autohidePager: false,
            responsive: false,
            responsiveToggle: true,
            filterOnEnter: true,
            filterKeypressDelay: 500,
            spinnerClass: "",
            saveState: false,
            errorMessage: "",
            noData: "",
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
     * @returns {QueryState}
     */
    get query() {
        return normalizeQuery(this._query);
    }

    /**
     * Convenience read-only accessor for the current page.
     * @returns {Number}
     */
    get page() {
        return this._query.page;
    }

    /**
     * @param {Plugins} list
     */
    static registerPlugins(list) {
        plugins = list;
    }

    /**
     * @param {String} plugin
     */
    static unregisterPlugins(plugin = null) {
        if (plugin === null) {
            plugins = {};
        } else {
            delete plugins[plugin];
        }
    }

    /**
     * @returns {Plugins}
     */
    static registeredPlugins() {
        return plugins;
    }

    /**
     * @param {Object|Array} columns
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
     * @returns {Array}
     */
    static get observedAttributes() {
        return [
            "src",
            "sortable",
            "filterable",
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
        ];
    }

    /** @returns {HTMLTableSectionElement} */
    get thead() {
        //@ts-expect-error
        return $("thead", this);
    }

    /** @returns {HTMLTableSectionElement} */
    get tbody() {
        //@ts-expect-error
        return $("tbody", this);
    }

    /** @returns {HTMLTableSectionElement} */
    get tfoot() {
        //@ts-expect-error
        return $("tfoot", this);
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
            const pageSize = Number.parseInt(this.getAttribute("page-size"));
            if (pageSize) {
                this._query.pageSize = pageSize;
                this._initialQuery.pageSize = pageSize;
            }
        }
        if (this.hasAttribute("page")) {
            const page = Number.parseInt(this.getAttribute("page"));
            if (page) {
                this._query.page = page;
                this._initialQuery.page = page;
            }
        }
    }

    /**
     * Merge a patch into the query state and reload.
     * Changing filters, sort or pageSize resets the page to 1 unless an explicit
     * page is provided in the patch.
     * @param {Object} patch
     * @returns {Promise}
     */
    setQuery(patch) {
        const next = normalizeQuery(this._query);
        const touchesPopulation =
            patch.filters !== undefined || patch.sort !== undefined || patch.pageSize !== undefined;
        if (patch.pageSize !== undefined) next.pageSize = patch.pageSize;
        if (patch.sort !== undefined) next.sort = patch.sort;
        if (patch.filters !== undefined) next.filters = patch.filters;
        if (touchesPopulation && patch.page === undefined) next.page = 1;
        if (patch.page !== undefined) next.page = patch.page;
        this._query = normalizeQuery(next);
        return this.refresh();
    }

    /**
     * Reset the query to its initial state and reload.
     * @returns {Promise}
     */
    resetQuery() {
        this._query = normalizeQuery(this._initialQuery);
        return this.refresh();
    }

    /**
     * Reload the result matching the current query.
     * @returns {Promise}
     */
    refresh() {
        return this.load();
    }

    /**
     * Single load path: abort previous request, load the current query,
     * protect against stale responses, then render.
     * @returns {Promise}
     */
    async load() {
        const requestId = ++this._requestSeq;
        this._controller?.abort();
        const controller = new AbortController();
        this._controller = controller;

        this.loading = true;
        this.error = null;
        this.classList.add("dg-loading");
        this.classList.remove("dg-empty", "dg-network-error");

        try {
            let result;
            if (this._initialResult) {
                result = this._initialResult;
                this._initialResult = null;
            } else {
                result = await this.dataSource.load(this.query, { signal: controller.signal });
            }
            if (requestId !== this._requestSeq) return;
            this.applyResult(result);
        } catch (err) {
            if (requestId !== this._requestSeq) return;
            if (err?.name === "AbortError" || controller.signal.aborted) return;
            this.error = err;
            this.classList.add("dg-empty", "dg-network-error");
            this.tbody?.setAttribute(
                "data-empty",
                this.options.errorMessage || err.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || labels.networkError,
            );
            dispatch(this, "loadError", err);
        } finally {
            if (requestId === this._requestSeq) {
                this.loading = false;
                this.classList.remove("dg-loading");
            }
        }
    }

    /**
     * Apply a PageResult and render.
     * @param {PageResult|Array} result
     */
    applyResult(result) {
        const page = Array.isArray(result) ? { rows: result, total: result.length, meta: {} } : result;
        this.rows = page.rows || [];
        this.total = page.total ?? this.rows.length;
        this.meta = page.meta || {};

        // Make sure we have a proper set of columns
        if (this.options.columns.length === 0 && this.rows.length) {
            this.options.columns = this.convertColumns(Object.keys(this.rows[0]));
        } else {
            this.options.columns = this.convertColumns(this.options.columns);
        }

        this.fixPage();
        this.renderBody();
    }

    /**
     * Pick the data source based on configuration.
     */
    srcChanged() {
        this.setupDataSource();
        return this.refresh();
    }

    dirChanged() {
        setAttribute(this, "dir", this.options.dir);
    }

    showPageSizeChanged() {
        this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    }

    responsiveChanged() {
        if (!this.plugins.ResponsiveGrid) {
            return;
        }
        if (this.options.responsive) {
            this.plugins.ResponsiveGrid.observe();
        } else {
            this.plugins.ResponsiveGrid.unobserve();
        }
    }

    menuChanged() {
        this.renderHeader();
    }

    selectableChanged() {
        this.renderTable();
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

    async _connected() {
        /**
         * @type {HTMLTableElement}
         */
        this.table = this.querySelector("table");
        /**
         * @type {HTMLInputElement}
         */
        this.btnFirst = this.querySelector(".dg-btn-first");
        /**
         * @type {HTMLInputElement}
         */
        this.btnPrev = this.querySelector(".dg-btn-prev");
        /**
         * @type {HTMLInputElement}
         */
        this.btnNext = this.querySelector(".dg-btn-next");
        /**
         * @type {HTMLInputElement}
         */
        this.btnLast = this.querySelector(".dg-btn-last");
        /**
         * @type {HTMLSelectElement}
         */
        this.selectPerPage = this.querySelector(".dg-select-per-page");
        /**
         * @type {HTMLInputElement}
         */
        this.inputPage = this.querySelector(".dg-input-page");

        this.getFirst = this.getFirst.bind(this);
        this.getPrev = this.getPrev.bind(this);
        this.getNext = this.getNext.bind(this);
        this.getLast = this.getLast.bind(this);
        this.changePerPage = this.changePerPage.bind(this);
        this.gotoPage = this.gotoPage.bind(this);

        this.btnFirst.addEventListener("click", this.getFirst);
        this.btnPrev.addEventListener("click", this.getPrev);
        this.btnNext.addEventListener("click", this.getNext);
        this.btnLast.addEventListener("click", this.getLast);
        this.selectPerPage.addEventListener("change", this.changePerPage);
        this.selectPerPage.toggleAttribute("hidden", !this.options.showPageSize);
        this.inputPage.addEventListener("input", this.gotoPage);

        this.setupDataSource();
        this.setupInitialState();

        for (const plugin of Object.values(this.plugins)) {
            await plugin.connected();
        }

        // Display even if we don't have data
        this.dirChanged();
        this.populatePageSizes();

        await this.init();
    }

    _disconnected() {
        this._controller?.abort();
        this.btnFirst?.removeEventListener("click", this.getFirst);
        this.btnPrev?.removeEventListener("click", this.getPrev);
        this.btnNext?.removeEventListener("click", this.getNext);
        this.btnLast?.removeEventListener("click", this.getLast);
        this.selectPerPage?.removeEventListener("change", this.changePerPage);
        this.inputPage?.removeEventListener("input", this.gotoPage);

        for (const plugin of Object.values(this.plugins)) {
            plugin.disconnected();
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
     * @param {string} field
     * @returns {Column}
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

    getColProp(field, prop) {
        const c = this.getCol(field);
        return c ? c[prop] : null;
    }

    setColProp(field, prop, val) {
        const c = this.getCol(field);
        if (c) {
            c[prop] = val;
        }
    }

    visibleColumns() {
        return this.options.columns.filter((col) => {
            return !col.hidden;
        });
    }

    hiddenColumns() {
        return this.options.columns.filter((col) => {
            return col.hidden === true;
        });
    }

    showColumn(field, render = true) {
        this.setColProp(field, "hidden", false);

        // We need to render the whole table otherwise layout fixed won't do its job
        if (render) this.renderTable();

        dispatch(this, "columnVisibility", {
            col: field,
            visibility: "visible",
        });
    }

    hideColumn(field, render = true) {
        this.setColProp(field, "hidden", true);

        // We need to render the whole table otherwise layout fixed won't do its job
        if (render) this.renderTable();

        dispatch(this, "columnVisibility", {
            col: field,
            visibility: "hidden",
        });
    }

    /**
     * Returns the starting index of actual data
     * @returns {Number}
     */
    startColIndex() {
        let start = 1;
        if (this.options.selectable && this.plugins.SelectableRows) {
            start++;
        }
        if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
            start++;
        }
        return start;
    }

    /**
     * @returns {Boolean}
     */
    isSticky() {
        return this.hasAttribute("sticky");
    }

    /**
     * @param {Boolean} visibleOnly
     * @returns {Number}
     */
    columnsLength(visibleOnly = false) {
        let len = 0;
        // One column per (visible) column
        for (const col of this.options.columns) {
            if (visibleOnly && col.hidden) {
                continue;
            }
            if (!col.attr) {
                len++;
            }
        }
        // Add one col for selectable checkbox at the beginning
        if (this.options.selectable && this.plugins.SelectableRows) {
            len++;
        }
        // Add one col for actions at the end
        if (this.options.actions.length && this.plugins.RowActions) {
            len++;
        }
        // Add one col for the responsive toggle
        if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
            len++;
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
        if (this.options.responsive && this.plugins.ResponsiveGrid) {
            // Let the observer make the table visible
        } else {
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
     * Get selected rows or specific fields from selected rows.
     * If no keys are provided, returns the full row objects.
     * If one key is provided, returns an array of values for that key.
     * If multiple keys are provided, returns an array of objects with those keys and values.
     * In single select mode, returns a single object or value.
     * @param {...String} keys - Field names to select from each row.
     * @returns {Array|Object} Selected rows, values, or objects depending on selection and keys.
     */
    getSelection(...keys) {
        if (!this.plugins.SelectableRows) {
            return [];
        }
        return this.plugins.SelectableRows.getSelection(...keys);
    }

    getFirst() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: 1 });
    }

    getLast() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: this.pages });
    }

    getPrev() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: Math.max(1, this._query.page - 1) });
    }

    getNext() {
        if (this.loading) {
            return;
        }
        return this.setQuery({ page: this._query.page + 1 });
    }

    gotoPage(event) {
        if (event.type === "keypress") {
            const key = event.keyCode || event.key;
            if (key === 13 || key === "Enter") {
                event.preventDefault();
            } else {
                return;
            }
        }
        const page = Number.parseInt(this.inputPage.value);
        if (page) {
            return this.setQuery({ page });
        }
    }

    /**
     * This is the callback for the select control
     */
    changePerPage() {
        const pageSize = Number.parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value);
        return this.setQuery({ pageSize });
    }

    /**
     * Compute the aria-sort value for a column based on the current query.
     * @param {String} field
     * @returns {"ascending"|"descending"|"none"}
     */
    getColumnSort(field) {
        const s = (this._query.sort || []).find((x) => x.field === field);
        if (!s) {
            return "none";
        }
        return s.direction === "asc" ? "ascending" : "descending";
    }

    /**
     * Trigger sort based on the current header state.
     * @param {Element} baseCol The column that was clicked or null to use current sort
     */
    sortData(baseCol = null) {
        this.log("sort data");

        let col = baseCol;

        // Early exit
        if (col && this.getColProp(col.getAttribute("field"), "noSort")) {
            this.log("sorting prevented because column is not sortable");
            return;
        }
        if (this.plugins.ColumnResizer?.isResizing) {
            this.log("sorting prevented because resizing");
            return;
        }

        // We clicked on a column, update sort state
        if (col === null) {
            // Or fetch current sort
            col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
        }
        if (!col) {
            return;
        }

        const current = col.getAttribute("aria-sort");
        let next;
        if (!current || current === "none") {
            next = "ascending";
        } else if (current === "ascending") {
            next = "descending";
        } else {
            next = "none";
        }

        const sort =
            next === "none"
                ? []
                : [{ field: col.getAttribute("field"), direction: next === "ascending" ? "asc" : "desc" }];

        // Reflect the sort state on the headers immediately
        const headers = findAll(this, "thead tr.dg-head-columns th");
        for (const th of headers) {
            if (!th.hasAttribute("aria-sort")) {
                continue;
            }
            const match = sort.find((s) => s.field === th.getAttribute("field"));
            th.setAttribute("aria-sort", match ? (match.direction === "asc" ? "ascending" : "descending") : "none");
        }

        return this.setQuery({ sort });
    }

    _sort(columnName, direction) {
        return this.setQuery({ sort: direction === "none" ? [] : [{ field: columnName, direction }] });
    }

    sortAsc = (columnName) => this._sort(columnName, "asc");
    sortDesc = (columnName) => this._sort(columnName, "desc");
    sortNone = (columnName) => this._sort(columnName, "none");

    clearFilters() {
        const inputs = findAll(this, this._filterSelector);
        for (const input of inputs) {
            input.value = "";
        }
        return this.filterData();
    }

    /**
     * Collect current filter inputs into the query and reload.
     */
    filterData() {
        this.log("filter data");

        const filters = {};
        const inputs = findAll(this, this._filterSelector);
        for (const input of inputs) {
            const value = input.value;
            if (value) {
                const isSelect = /select/i.test(input.tagName);
                filters[input.dataset.name] = {
                    operator: isSelect ? "eq" : "contains",
                    value,
                };
            }
        }
        return this.setQuery({ filters });
    }

    renderTable() {
        this.log("render table");

        if (this.options.menu && this.plugins.ContextMenu) {
            this.plugins.ContextMenu.createMenu();
        }

        this.renderHeader();
        this.renderFooter();
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

        if (this.options.resizable && this.plugins.ColumnResizer) {
            this.plugins.ColumnResizer.renderResizer(labels.resizeColumn);
        }

        dispatch(this, "headerRendered");
    }

    renderFooter() {
        this.log("render footer");

        const tfoot = this.tfoot;
        if (!tfoot) return;
        const td = tfoot.querySelector("td");
        tfoot.removeAttribute("hidden");
        setAttribute(td, "colspan", this.columnsLength(true));
        tfoot.style.display = "";
    }

    /**
     * Create the column headers based on column definitions and set options
     * @param {HTMLTableSectionElement} thead
     */
    createColumnHeaders(thead) {
        // @link https://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively
        const availableWidth = this.clientWidth;
        const colMaxWidth = Math.round((availableWidth / this.columnsLength(true)) * 2);

        let idx = 0;
        let tr;

        // Create row
        tr = ce("tr");
        this.headerRow = tr;
        tr.setAttribute("role", "row");
        tr.setAttribute("aria-rowindex", "1");
        tr.setAttribute("class", "dg-head-columns");

        // We need a real th from the dom to compute the size
        let sampleTh = thead?.querySelector("tr.dg-head-columns th");
        this.log("createColumnHeaders - sampleTh", sampleTh);
        if (!sampleTh) {
            sampleTh = ce("th");
            thead?.querySelector("tr").appendChild(sampleTh);
        }

        if (this.options.selectable && this.plugins.SelectableRows) {
            this.plugins.SelectableRows.createHeaderCol(tr);
        }
        if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
            this.plugins.ResponsiveGrid.createHeaderCol(tr);
        }

        // Create columns
        idx = 0;
        let totalWidth = 0;
        this.log("createColumnHeaders - columns", this.options.columns);

        for (const column of this.options.columns) {
            if (column.attr) {
                continue;
            }
            const colIdx = idx + this.startColIndex();
            const th = ce("th");
            th.setAttribute("scope", "col");
            th.setAttribute("role", "columnheader");
            th.setAttribute("aria-colindex", `${colIdx}`);
            th.setAttribute("id", randstr("dg-col-"));
            if (this.options.sortable && !column.noSort) {
                th.setAttribute("aria-sort", this.getColumnSort(column.field));
            }
            th.setAttribute("field", column.field);
            if (this.plugins.ResponsiveGrid && this.options.responsive) {
                setAttribute(th, "data-responsive", column.responsive || "");
            }
            // Make sure the header fits (+ add some room for sort icon if necessary)
            const computedWidth = getTextWidth(column.title, sampleTh, true) + 20;
            th.dataset.minWidth = `${computedWidth}`;
            applyColumnDefinition(th, column);
            th.tabIndex = 0;
            th.textContent = column.title;

            let w = 0;
            // Autosize small based on first/last row ?
            // Take into account minWidth of the header and max available size based on col numbers
            if (this.options.autosize && this.plugins.AutosizeColumn) {
                const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
                w = this.plugins.AutosizeColumn.computeSize(
                    th,
                    column,
                    Number.parseInt(th.dataset.minWidth),
                    colAvailableWidth,
                );
            } else {
                w = Math.max(Number.parseInt(th.dataset.minWidth), Number.parseInt(th.getAttribute("width")));
            }

            setAttribute(th, "width", w);
            if (column.hidden) {
                th.setAttribute("hidden", "");
            } else {
                totalWidth += w;
            }

            // Reorder columns with drag/drop
            if (this.options.reorder && this.plugins.DraggableHeaders) {
                this.plugins.DraggableHeaders.makeHeaderDraggable(th);
            }

            tr.appendChild(th);
            idx++;
        }

        // There is too much available width, and we want to avoid fixed layout to split remaining amount
        if (totalWidth < availableWidth) {
            const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
            if (visibleCols.length) {
                const lastCol = visibleCols[visibleCols.length - 1];
                removeAttribute(lastCol, "width");
            }
        }

        // Actions
        if (this.options.actions.length && this.plugins.RowActions) {
            this.plugins.RowActions.makeActionHeader(tr);
        }

        thead?.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));

        // Once columns are inserted, we have an actual dom to query
        if (thead && thead.offsetWidth > availableWidth) {
            this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
            const scrollbarWidth = this.offsetWidth - this.clientWidth;
            let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
            if (this.options.responsive && this.plugins.ResponsiveGrid) {
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
                const actualWidth = Number.parseInt(th.getAttribute("width"));
                const minWidth = th.dataset.minWidth ? Number.parseInt(th.dataset.minWidth) : 0;
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

        // Context menu
        if (this.options.menu && this.plugins.ContextMenu) {
            this.plugins.ContextMenu.attachContextMenu();
        }

        // Sort col on click and on Enter/Space for keyboard users
        const rowsWithSort = findAll(tr, "[aria-sort]");
        for (const sortableRow of rowsWithSort) {
            sortableRow.addEventListener("click", () => this.sortData(sortableRow));
            sortableRow.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.sortData(sortableRow);
                }
            });
        }

        this.table && setAttribute(this.table, "aria-colcount", this.columnsLength(true));
    }

    createColumnFilters(thead) {
        let idx = 0;
        let tr;

        // Create row for filters
        tr = ce("tr");
        tr.setAttribute("role", "row");
        tr.setAttribute("aria-rowindex", "2");
        tr.setAttribute("class", "dg-head-filters");
        if (!this.options.filterable) {
            tr.setAttribute("hidden", "");
        }

        if (this.options.selectable && this.plugins.SelectableRows) {
            this.plugins.SelectableRows.createFilterCol(tr);
        }
        if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
            this.plugins.ResponsiveGrid.createFilterCol(tr);
        }

        this.log("createColumnFilters - columns", this.options.columns);
        for (const column of this.options.columns) {
            if (column.attr) {
                continue;
            }
            const colIdx = idx + this.startColIndex();
            const relatedTh = thead?.querySelector(`tr.dg-head-columns th[aria-colindex="${colIdx}"]`);
            if (!relatedTh) {
                console.warn("Related th not found", colIdx);
                continue;
            }
            const th = ce("th");
            th.setAttribute("aria-colindex", `${colIdx}`);

            const filter = this.createFilterElement(column, relatedTh);
            if (!this.options.filterable) {
                th.tabIndex = 0;
            } else {
                filter.tabIndex = 0;
            }

            if (column.hidden) {
                th.setAttribute("hidden", "");
            }

            // Reflect the current query filters into the input
            const filterState = this._query.filters?.[column.field];
            if (filterState) {
                filter.value = filterState.value ?? "";
            }

            th.appendChild(filter);
            tr.appendChild(th);
            idx++;
        }

        // Actions
        if (this.options.actions.length && this.plugins.RowActions) {
            this.plugins.RowActions.makeActionFilter(tr);
        }

        thead?.replaceChild(tr, thead.querySelector("tr.dg-head-filters"));

        if (typeof this.options.filterKeypressDelay !== "number" || this.options.filterOnEnter)
            this.options.filterKeypressDelay = 0;

        // Filter content by field events
        const filteredRows = findAll(tr, this._filterSelector);
        for (const el of filteredRows) {
            const isSelect = /select/i.test(el.tagName);
            const eventName = isSelect ? "change" : "keyup";
            const eventHandler = debounce((e) => {
                const key = e.keyCode || e.key;
                const isKeyPressFilter = !this.options.filterOnEnter && !this._excludedKeys.some((k) => k === key);
                if (key === 13 || key === "Enter" || isKeyPressFilter || e.type === "change" || e.type === "paste") {
                    this.filterData.call(this);
                }
            }, this.options.filterKeypressDelay);
            el.addEventListener(eventName, eventHandler);
            if (!isSelect) {
                // Add paste event support for text input filters
                el.addEventListener("paste", eventHandler);
            }
        }
    }

    createFilterElement(column, relatedTh) {
        const isSelect = column.filterType === "select";
        const filter = isSelect ? ce("select") : ce("input");
        if (isSelect) {
            if (!Array.isArray(column.filterList)) {
                // Gets unique values from the full local collection when available
                const sourceRows = this.dataSource instanceof ArrayDataSource ? this.dataSource.rows : this.rows;
                const uniqueValues = [...new Set((sourceRows ?? []).map((e) => e[column.field]))]
                    .filter((v) => v)
                    .sort();
                column.filterList = [column.firstFilterOption || this.defaultColumn.firstFilterOption].concat(
                    uniqueValues.map((e) => ({ value: e, text: e })),
                );
            }

            for (const e of column.filterList) {
                const opt = ce("option");
                opt.value = e.value;
                opt.text = e.text;

                if (filter instanceof HTMLSelectElement) {
                    filter.add(opt);
                }
            }
        } else {
            //@ts-expect-error
            filter.type = "text";
            filter.inputMode = "search";
            filter.autocomplete = "off";
            filter.spellcheck = false;
        }
        // Allows binding filter to this column
        filter.dataset.name = column.field;
        filter.id = randstr("dg-filter-");
        // Don't use aria-label as it triggers autocomplete
        filter.setAttribute("aria-labelledby", relatedTh.getAttribute("id"));
        return filter;
    }

    /**
     * Render the rows of the current page into tbody
     * It will call paginate() at the end
     */
    renderBody() {
        this.log("render body");
        let tr;
        let td;
        let idx;
        const tbody = ce("tbody");

        let i = 0;
        for (const item of this.rows) {
            tr = ce("tr");
            setAttribute(tr, "role", "row");
            setAttribute(tr, "aria-rowindex", i + 1);
            tr.tabIndex = 0;

            if (this.options.selectable && this.plugins.SelectableRows) {
                this.plugins.SelectableRows.createDataCol(tr);
            }
            if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
                this.plugins.ResponsiveGrid.createDataCol(tr);
            }

            // Expandable
            if (this.options.expand) {
                tr.classList.add("dg-expandable");

                on(tr, "click", (ev) => {
                    if (ev.target.matches(this._excludedRowElementSelector)) return;
                    if (this.plugins.ResponsiveGrid) {
                        this.plugins.ResponsiveGrid.blockObserver();
                    }
                    toggleClass(ev.currentTarget, "dg-expanded");
                    if (this.plugins.ResponsiveGrid) {
                        this.plugins.ResponsiveGrid.unblockObserver();
                    }
                });
            }

            idx = 0;

            for (const column of this.options.columns) {
                if (!column) {
                    console.error("Empty column found!", this.options.columns);
                }
                // It should be applied as an attr of the row
                if (column.attr) {
                    if (item[column.field]) {
                        // Special case if we try to write over the class attr
                        if (column.attr === "class") {
                            addClass(tr, item[column.field]);
                        } else {
                            tr.setAttribute(column.attr, item[column.field]);
                        }
                    }
                    return;
                }
                td = ce("td");
                td.setAttribute("role", "gridcell");
                td.setAttribute("aria-colindex", `${idx + this.startColIndex()}`);
                applyColumnDefinition(td, column);
                // This is required for pure css responsive layout
                td.setAttribute("data-name", column.title);
                td.tabIndex = -1;

                // Inline editing ...
                if (column.editable && this.plugins.EditableColumn) {
                    addClass(td, "dg-editable-col");
                    this.plugins.EditableColumn.makeEditableInput(td, column, item, i);
                } else {
                    // ... or formatting
                    const v = item[column.field] ?? "";
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
                    if (column.format) {
                        // Only use formatting with values or if defaultFormatValue is set
                        if (column.defaultFormatValue !== undefined && (tv === "" || tv === null)) {
                            tv = `${column.defaultFormatValue}`;
                        }
                        if (typeof column.format === "string" && tv) {
                            td.innerHTML = interpolate(
                                column.format,
                                Object.assign(
                                    {
                                        _v: v,
                                        _tv: tv,
                                    },
                                    item,
                                ),
                            );
                        } else if (column.format instanceof Function) {
                            const val = column.format.call(this, { column, rowData: item, cellData: tv, td, tr });
                            td.innerHTML = val || tv || v;
                        }
                    } else {
                        td.textContent = tv;
                    }
                }
                tr.appendChild(td);
                idx++;
            }

            // Actions
            if (this.options.actions.length && this.plugins.RowActions) {
                this.plugins.RowActions.makeActionRow(tr, item);
            }

            tbody.appendChild(tr);

            dispatch(this, "rowRendered", { rowData: item, tr });
            i++;
        }

        tbody.setAttribute("role", "rowgroup");

        // Keep data empty message
        const prev = this.tbody;
        prev && tbody.setAttribute("data-empty", prev.getAttribute("data-empty"));
        this.table?.replaceChild(tbody, prev);

        if (this.plugins.FixedHeight) {
            this.plugins.FixedHeight.createFakeRow();
        }

        this.paginate();

        if (this.plugins.SelectableRows) {
            this.plugins.SelectableRows.shouldSelectAll(tbody);
        }

        this.classList.toggle("dg-empty", !this.rows.length);

        setAttribute(this.table, "aria-rowcount", this.rows.length);

        dispatch(this, "bodyRendered");
    }

    paginate() {
        this.log("paginate");

        const total = this.total;
        const p = this._query.page || 1;
        const tfoot = this.tfoot;
        if (!tfoot) return;

        // Refresh page count in case we added/removed a page
        this.pages = this.totalPages();

        let high = p * this._query.pageSize;
        let low = high - this._query.pageSize + 1;

        if (high > total) {
            high = total;
        }
        if (!total) {
            low = 0;
        }

        if (this.options.selectable && this.plugins.SelectableRows) {
            this.plugins.SelectableRows.clearCheckboxes(this.tbody);
        }

        // Store default height and update styles if needed
        if (this.plugins.FixedHeight) {
            this.plugins.FixedHeight.updateFakeRow();
        }

        // Enable/disable buttons if shown
        if (this.btnFirst) {
            this.btnFirst.disabled = this._query.page <= 1;
            this.btnPrev.disabled = this._query.page <= 1;
            this.btnNext.disabled = this._query.page >= this.pages;
            this.btnLast.disabled = this._query.page >= this.pages;
        }
        tfoot.querySelector(".dg-low").textContent = low.toString();
        tfoot.querySelector(".dg-high").textContent = high.toString();
        tfoot.querySelector(".dg-total").textContent = `${this.total}`;
        tfoot.toggleAttribute("hidden", this.options.autohidePager && this._query.pageSize > this.total);
    }

    /**
     * @returns {number}
     */
    totalPages() {
        return Math.ceil(this.total / (this._query.pageSize || 1));
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
