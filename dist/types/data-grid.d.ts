export default DataGrid;
export type DataSource = import("./data-source.js").DataSource;
export type QueryState = import("./data-source.js").QueryState;
export type PageResult = import("./data-source.js").PageResult;
export type FilterState = import("./data-source.js").FilterState;
export type FilterOption = import("./data-source.js").FilterOption;
/**
 * Column definition
 */
export type Column = {
    /**
     * - the key in the data
     */
    field?: string | undefined;
    /**
     * - stable identifier (defaults to field). Plugin columns use "$..." ids.
     */
    id?: string | undefined;
    /**
     * - injected by a plugin
     */
    virtual?: boolean | undefined;
    /**
     * - order group for plugin columns
     */
    position?: "end" | "start" | undefined;
    /**
     * - the title to display in the header (defaults to "field" if not set)
     */
    title?: string | undefined;
    /**
     * - the width of the column (auto otherwise)
     */
    width?: number | undefined;
    /**
     * - class to set on the column (target body or header with th.class or td.class)
     */
    class?: string | undefined;
    /**
     * - don't render the column and set a matching attribute on the row with the value of the field
     */
    attr?: string | undefined;
    /**
     * - hide the column
     */
    hidden?: boolean | undefined;
    /**
     * - allow disabling sort for a given column
     */
    noSort?: boolean | undefined;
    /**
     * - custom value transformation
     */
    transform?: string | undefined;
    /**
     * - replace with input (EditableColumn module)
     */
    editable?: boolean | undefined;
    /**
     * - type of input (EditableColumn module)
     */
    editableType?: string | undefined;
    /**
     * - (value, { row, column, grid }) => Boolean | error message (EditableColumn module)
     */
    validate?: ((value: any, ctx: Object) => (boolean | string)) | undefined;
    /**
     * - the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)
     */
    responsive?: number | undefined;
    /**
     * - hidden through responsive module (ResponsiveGrid module)
     */
    responsiveHidden?: boolean | undefined;
    /**
     * - defines a filter field type ("text" or "select" - defaults to "text")
     */
    filterType?: string | undefined;
    /**
     * - defines a custom array to populate a filter select field in the format of [{value: "", text: ""},...]. When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records.
     */
    filterList?: any[] | undefined;
    /**
     * - defines an object for the first option element of the filter select field. defaults to {value: "", text: ""}
     */
    firstFilterOption?: import("./data-source.js").FilterOption | undefined;
    /**
     * - optional custom header cell renderer (the core creates the <th>)
     */
    renderHeaderCell?: ((th: HTMLTableCellElement, ctx: Object) => void) | undefined;
    /**
     * - optional custom filter cell renderer (the core creates the <th>)
     */
    renderFilterCell?: ((th: HTMLTableCellElement, ctx: Object) => void) | undefined;
    /**
     * - optional custom cell renderer returning content (primitive -> textContent, Node -> append, { html } -> innerHTML)
     */
    renderCell?: ((ctx: Object) => (any)) | undefined;
};
/**
 * Render context passed to header/filter/cell renderers. Only `grid` and
 * `column` are always present.
 */
export type CellContext = {
    grid: DataGrid;
    column: Column;
    row?: Record<string, any> | undefined;
    rowIndex?: number | undefined;
    value?: any;
    tr?: HTMLTableRowElement | undefined;
    sampleTh?: HTMLTableCellElement | undefined;
    availableWidth?: number | undefined;
    colMaxWidth?: number | undefined;
};
/**
 * Row action
 */
export type Action = {
    /**
     * - the name of the action (button[data-action])
     */
    name: string;
    /**
     * - the button label and accessible name
     */
    label?: string | undefined;
    /**
     * - "default" | "primary" | "danger" (defaults to "default")
     */
    intent?: string | undefined;
    /**
     * - link for the action (string with {field} interpolation or (row) => string)
     */
    href?: string | Function | undefined;
    /**
     * - (row) => Boolean, hides the action when falsy
     */
    visible?: Function | undefined;
    /**
     * - (row) => Boolean, disables the button when truthy
     */
    disabled?: Function | undefined;
    /**
     * - ({ action, row, grid }) => content, replaces the button content (label stays the accessible name)
     */
    render?: Function | undefined;
    /**
     * - needs confirmation
     */
    confirm?: boolean | undefined;
    /**
     * - is the default row action
     */
    default?: boolean | undefined;
    /**
     * - the class for the button
     */
    class?: string | undefined;
};
/**
 * Bulk action applied to the whole selection, server-first.
 */
export type BulkAction = {
    /**
     * - the name of the action
     */
    name: string;
    /**
     * - the label of the button
     */
    label: string;
    /**
     * - "default" | "primary" | "danger" (defaults to "default")
     */
    intent?: string | undefined;
};
/**
 * Row selection state. Single source of truth, lives in the core.
 * - "explicit": the selected row keys are in `ids`
 * - "all": every matching row is selected except the ones in `except` (server-first)
 */
export type SelectionState = {
    mode: "explicit" | "all";
    /**
     * - selected row keys (mode "explicit")
     */
    ids: Set<string>;
    /**
     * - unselected row keys (mode "all")
     */
    except: Set<string>;
};
export type Plugin = import("./core/base-plugin.js").Plugin;
export type PluginConstructor = import("./core/base-plugin.js").PluginConstructor;
export type PluginRegistry = import("./core/base-plugin.js").PluginRegistry;
export type PluginInstances = import("./core/base-plugin.js").PluginInstances;
/**
 * Available data grid options, plugins included
 */
export type Options = {
    /**
     * Custom id for the grid
     */
    id: string | null;
    /**
     * An URL to a server-side endpoint (FetchDataSource)
     */
    src: string | null;
    /**
     * Extra constant HTTP params passed to FetchDataSource
     */
    params: Object;
    /**
     * Custom data source (defaults to FetchDataSource or ArrayDataSource)
     */
    dataSource?: import("./data-source.js").DataSource | null | undefined;
    /**
     * Log actions in DevTools console
     */
    debug: boolean;
    /**
     * Allows a sort by column functionality
     */
    sortable: boolean;
    /**
     * Allows a filtering functionality
     */
    filterable: boolean;
    /**
     * Dir
     */
    dir: string;
    /**
     * Row density (maps to --dg-padding-* tokens)
     */
    density?: "default" | "compact" | "comfortable" | undefined;
    /**
     * Available page size options
     */
    pageSizes: Array<any>;
    /**
     * Shows the page size select element
     */
    showPageSize: boolean;
    /**
     * Available columns
     */
    columns: Column[];
    /**
     * Row actions (RowActions module)
     */
    actions: Action[];
    /**
     * - global action renderer: ({ action, row, grid }) => content, applied when an action has no render
     */
    actionRenderer?: Function | undefined;
    /**
     * Group actions (RowActions module)
     */
    collapseActions: boolean;
    /**
     * Allow cell content to spawn over multiple lines
     */
    expand: boolean;
    /**
     * Make columns resizable (ColumnResizer module)
     */
    resizable: boolean;
    /**
     * Allow multi-selecting rows with a checkboxes (SelectableRows module)
     */
    selectable: boolean;
    /**
     * Select all only selects visible rows (SelectableRows module)
     */
    selectVisibleOnly: boolean;
    /**
     * Enables single row select with radio buttons - no need to set selectable (SelectableRows module)
     */
    singleSelect: boolean;
    /**
     * The field name or a function resolving a stable row key (defaults to "id")
     */
    rowKey?: string | Function | undefined;
    /**
     * Field name or (row, index) => string resolving the human-readable label of a row, used for accessible control names (falls back to rowKey, then index)
     */
    rowLabel?: string | Function | null | undefined;
    /**
     * Bulk actions applied to the current selection (BulkActions module)
     */
    bulkActions?: BulkAction[] | undefined;
    /**
     * Compute column sizes based on given data (Autosize module)
     */
    autosize: boolean;
    /**
     * Adjust height so that it matches table size (FixedHeight module)
     */
    autoheight: boolean;
    /**
     * auto-hides the pager when number of records falls below the selected page size
     */
    autohidePager: boolean;
    /**
     * Right click menu on column headers (ContextMenu module)
     */
    menu: boolean;
    /**
     * Allows a column reordering functionality (DraggableHeaders module)
     */
    reorder: boolean;
    /**
     * Change display mode on small screens (ResponsiveGrid module)
     */
    responsive: boolean;
    /**
     * Show toggle column (ResponsiveGrid module)
     */
    responsiveToggle: boolean;
    /**
     * Toggles the ability to filter column data by pressing the Enter or Return key
     */
    filterOnEnter: boolean;
    /**
     * Sets a space-delimited string of css classes for a spinner (use spinner-border css class for bootstrap 5 spinner)
     */
    spinnerClass: string;
    /**
     * Sets a keypress delay time in milliseconds before triggering filter operation.
     */
    filterKeypressDelay: number;
    /**
     * Enable/disable save state plugin (SaveState module)
     */
    saveState: boolean;
    /**
     * A generic text to be displayed in footer when error occurs.
     */
    errorMessage: string | null;
    /**
     * A custom text to be displayed when no data is loaded. This is different from the generic labels.noData that applies for data-grid as a component.
     */
    noData: string | null;
    /**
     * A table caption, providing the accessible name of the table (falls back to aria-labelledby, then aria-label)
     */
    caption: string | null;
    /**
     * Initial runtime query state
     */
    initialQuery?: import("./data-source.js").QueryState | null | undefined;
    /**
     * Initial result to display without loading the data source
     */
    initialResult?: import("./data-source.js").PageResult | null | undefined;
    /**
     * Grid-level editor validator, fallback when a column has no validate (EditableColumn module)
     */
    validate?: ((value: any, ctx: Object) => (boolean | string)) | undefined;
};
/**
 * Available labels that can be translated
 */
export type Labels = {
    itemsPerPage: string;
    gotoPage: string;
    gotoFirstPage: string;
    gotoPrevPage: string;
    gotoNextPage: string;
    gotoLastPage: string;
    of: string;
    items: string;
    selected: string;
    selectAll: string;
    toggleActions: string;
    resizeColumn: string;
    noData: string;
    loading: string;
    areYouSure: string;
    networkError: string;
};
/**
 */
export class DataGrid extends BaseElement {
    /**
     * @public
     * @returns {Labels}
     */
    public static getLabels(): Labels;
    /**
     * @public
     * @param {Object} v
     */
    public static setLabels(v: Object): void;
    /**
     * Register plugin constructors, keyed by name. The core instantiates them
     * on each DataGrid construction. Names are not limited to built-in plugins.
     * @public
     * @param {PluginRegistry} list
     */
    public static registerPlugins(list: PluginRegistry): void;
    /**
     * @public
     * @param {?String} [plugin]
     */
    public static unregisterPlugins(plugin?: string | null): void;
    /**
     * @public
     * @returns {PluginRegistry}
     */
    public static registeredPlugins(): PluginRegistry;
    _filterSelector: string;
    _excludedRowElementSelector: string;
    _excludedKeys: (string | number)[];
    /**
     * Instantiated plugins, keyed by their registration name.
     * @type {PluginInstances}
     */
    plugins: PluginInstances;
    /**
     * Initial query used by resetQuery()
     * @type {QueryState}
     */
    _initialQuery: QueryState;
    /**
     * Runtime query state, single source of truth
     * @type {QueryState}
     */
    _query: QueryState;
    /**
     * Selection state, single source of truth for row selection
     * @type {SelectionState}
     */
    _selection: SelectionState;
    /**
     * @type {Number}
     */
    _requestSeq: number;
    /**
     * @type {?AbortController}
     */
    _controller: AbortController | null;
    /**
     * Optional initial result, can be set as a property before connection
     * @type {PageResult|null}
     */
    initialResult: PageResult | null;
    /**
     * @type {PageResult|null}
     */
    _initialResult: PageResult | null;
    /**
     * Rows of the current page
     * @type {Array<Record<string, any>>}
     */
    rows: Array<Record<string, any>>;
    /**
     * Total number of rows matching the current query
     * @type {Number}
     */
    total: number;
    /**
     * Meta information returned by the data source
     * @type {Record<string, any>}
     */
    meta: Record<string, any>;
    /**
     * @type {Number}
     */
    pages: number;
    /**
     * @type {Boolean}
     */
    loading: boolean;
    /**
     * @type {?Error}
     */
    error: Error | null;
    /**
     * Normalized columns of the current render cycle
     * @type {Column[]}
     */
    _columns: Column[];
    /**
     * The active data source, set by setupDataSource().
     * @type {DataSource|null}
     */
    dataSource: DataSource | null;
    /**
     * DOM refs set on connect from the rendered template.
     * @type {HTMLTableElement|null}
     */
    table: HTMLTableElement | null;
    /** @type {HTMLInputElement|null} */
    btnFirst: HTMLInputElement | null;
    /** @type {HTMLInputElement|null} */
    btnPrev: HTMLInputElement | null;
    /** @type {HTMLInputElement|null} */
    btnNext: HTMLInputElement | null;
    /** @type {HTMLInputElement|null} */
    btnLast: HTMLInputElement | null;
    /** @type {HTMLSelectElement|null} */
    selectPerPage: HTMLSelectElement | null;
    /** @type {HTMLInputElement|null} */
    inputPage: HTMLInputElement | null;
    /** @type {HTMLTableRowElement|null} */
    headerRow: HTMLTableRowElement | null;
    /** @type {Number|null} */
    rowHeight: number | null;
    /**
     * Current render context, set by renderTable/renderBody.
     * @type {import("./core/base-plugin.js").RenderContext|null}
     */
    _renderContext: import("./core/base-plugin.js").RenderContext | null;
    /**
     * Instantiate the registered plugin constructors.
     * @returns {PluginInstances}
     */
    _initPlugins(): PluginInstances;
    /**
     * @public
     * @returns {Labels}
     */
    public get labels(): Labels;
    /** Gets the text to be displayed when no data is loaded.
     * @public */
    public get noData(): string;
    /**
     * @returns {Column}
     */
    get defaultColumn(): Column;
    /**
     * @returns {Options}
     */
    get defaultOptions(): Options;
    /**
     * Determines if the grid is initialized.
     * @returns {Boolean}
     */
    get isInit(): boolean;
    /**
     * Determines if data load has failed.
     * @returns {Boolean}
     */
    get hasDataError(): boolean;
    /**
     * Snapshot of the current query state.
     * @public
     * @returns {QueryState}
     */
    public get query(): QueryState;
    /**
     * Convenience read-only accessor for the current page.
     * @public
     * @returns {Number}
     */
    public get page(): number;
    /**
     * Run a lifecycle hook on all registered plugins, in registration order.
     * @param {String} hook
     * @param {...any} args
     */
    runPlugins(hook: string, ...args: any[]): void;
    /**
     * Build the normalized column list: base columns + plugin columns, ordered.
     * @returns {Column[]}
     */
    buildColumns(): Column[];
    /**
     * The normalized column list of the current render cycle.
     * @public
     * @returns {Column[]}
     */
    public getColumns(): Column[];
    /**
     * @param {Record<string, any>|Array<any>} columns
     * @returns {Column[]}
     */
    convertColumns(columns: Record<string, any> | Array<any>): Column[];
    /** @returns {HTMLTableSectionElement} */
    get thead(): HTMLTableSectionElement;
    /** @returns {HTMLTableSectionElement} */
    get tbody(): HTMLTableSectionElement;
    /** @returns {HTMLTableSectionElement} */
    get tfoot(): HTMLTableSectionElement;
    /**
     * Pick the data source based on configuration.
     */
    setupDataSource(): void;
    /**
     * Seed the initial query from optional page / page-size attributes.
     */
    setupInitialState(): void;
    /**
     * Merge a patch into the query state and reload.
     * Changing filters, sort or pageSize resets the page to 1 unless an explicit
     * page is provided in the patch.
     * @public
     * @param {Partial<QueryState>} patch
     * @returns {Promise<void>}
     */
    public setQuery(patch: Partial<QueryState>): Promise<void>;
    /**
     * Reset the query to its initial state and reload.
     * @public
     * @returns {Promise<void>}
     */
    public resetQuery(): Promise<void>;
    /**
     * Reload the result matching the current query.
     * @public
     * @returns {Promise<void>}
     */
    public refresh(): Promise<void>;
    /**
     * Single load path: abort previous request, load the current query,
     * protect against stale responses, then render.
     * @public
     * @returns {Promise<void>}
     */
    public load(): Promise<void>;
    /**
     * Apply a PageResult and render.
     * @param {PageResult} result
     */
    applyResult(result: PageResult): void;
    /**
     * Pick the data source based on configuration.
     */
    srcChanged(): Promise<void>;
    dirChanged(): void;
    showPageSizeChanged(): void;
    responsiveChanged(): void;
    menuChanged(): void;
    selectableChanged(): void;
    reorderChanged(): void;
    sortableChanged(): void;
    filterableChanged(): void;
    /**
     * Populate the page size select according to options
     */
    populatePageSizes(): void;
    _connected(): Promise<void>;
    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    public getFirst(): Promise<void> | undefined;
    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    public getPrev(): Promise<void> | undefined;
    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    public getNext(): Promise<void> | undefined;
    /**
     * @public
     * @returns {Promise<void>|undefined}
     */
    public getLast(): Promise<void> | undefined;
    /**
     * This is the callback for the select control
     * @returns {Promise<void>|undefined}
     */
    changePerPage(): Promise<void> | undefined;
    /**
     * @param {Event|KeyboardEvent} event
     * @returns {Promise<void>|undefined}
     */
    gotoPage(event: Event | KeyboardEvent): Promise<void> | undefined;
    init(): Promise<void>;
    /**
     * @param {String} field
     * @returns {Column|null}
     */
    getCol(field: string): Column | null;
    /**
     * @param {String} field
     * @param {String} prop
     * @returns {any}
     */
    getColProp(field: string, prop: string): any;
    /**
     * @param {String} field
     * @param {String} prop
     * @param {any} val
     */
    setColProp(field: string, prop: string, val: any): void;
    visibleColumns(): Column[];
    hiddenColumns(): Column[];
    /**
     * @public
     * @param {String} field
     * @param {Boolean} [render]
     */
    public showColumn(field: string, render?: boolean): void;
    /**
     * @public
     * @param {String} field
     * @param {Boolean} [render]
     */
    public hideColumn(field: string, render?: boolean): void;
    /**
     * Number of rendered columns of the current column list.
     * @param {Boolean} visibleOnly
     * @returns {Number}
     */
    columnsLength(visibleOnly?: boolean): number;
    /**
     * Global configuration and renderTable
     * This should be called after your data has been loaded
     */
    configureUi(): this;
    /**
     * Resolve the stable key of a row.
     * @param {Record<string, any>} row
     * @param {Number} [index] Fallback index (current page) when the row has no key
     * @returns {String}
     */
    resolveRowKey(row: Record<string, any>, index?: number): string;
    /**
     * Human-readable label of a row, used for accessible control names.
     * Resolved from `options.rowLabel` (field or function), falling back to
     * the row key, then the row index.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     * @returns {String}
     */
    public getRowLabel(row: Record<string, any>, index?: number): string;
    /**
     * Whether a row is part of the current selection.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     * @returns {Boolean}
     */
    public isRowSelected(row: Record<string, any>, index?: number): boolean;
    /**
     * Snapshot of the current selection state.
     * @public
     * @returns {SelectionState}
     */
    public getSelectionState(): SelectionState;
    /**
     * Select a row (single select keeps at most one key).
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    public selectRow(row: Record<string, any>, index?: number): void;
    /**
     * Deselect a row.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    public deselectRow(row: Record<string, any>, index?: number): void;
    /**
     * Toggle the selection state of a row.
     * @public
     * @param {Record<string, any>} row
     * @param {Number} [index]
     */
    public toggleRow(row: Record<string, any>, index?: number): void;
    /**
     * Select all visible rows (or everything when selectVisibleOnly is false).
     * @public
     */
    public selectAll(): void;
    /**
     * Reset the selection and refresh the UI.
     * @public
     */
    public clearSelection(): void;
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
    public getSelection(...keys: string[]): Array<any> | Object;
    /**
     * Reflect the selection on the DOM and notify listeners.
     * The core owns the tr[data-selected] state attribute.
     */
    _selectionChanged(): void;
    /**
     * Sort direction of a column based on the current query.
     * @param {String} field
     * @returns {"asc"|"desc"|null}
     */
    getColumnSortDirection(field: string): "asc" | "desc" | null;
    /**
     * Trigger sort based on the current header state.
     * @param {?Element} [baseCol] The column that was clicked or null to use current sort
     * @returns {Promise<void>|undefined}
     */
    sortData(baseCol?: Element | null): Promise<void> | undefined;
    /**
     * @param {String} columnName
     * @param {"asc"|"desc"|"none"} direction
     * @returns {Promise<void>}
     */
    _sort(columnName: string, direction: "asc" | "desc" | "none"): Promise<void>;
    /** @public @param {String} columnName */
    public sortAsc: (columnName: string) => Promise<void>;
    /** @public @param {String} columnName */
    public sortDesc: (columnName: string) => Promise<void>;
    /** @public @param {String} columnName */
    public sortNone: (columnName: string) => Promise<void>;
    /**
     * @public
     * @returns {Promise<void>}
     */
    public clearFilters(): Promise<void>;
    /**
     * Collect current filter inputs into the query and reload.
     */
    filterData(): Promise<void>;
    renderTable(): void;
    /**
     * Give the table an accessible name: a real <caption> when options.caption
     * is set, otherwise propagate the host aria-labelledby / aria-label.
     */
    updateTableLabel(): void;
    /**
     * Create table header
     * - One row for the column headers
     * - One row for the filters
     */
    renderHeader(): void;
    renderFooter(): void;
    /**
     * Create the column headers based on the normalized column list.
     * The core creates the <th> and its structural attributes, then a column
     * renderHeaderCell (or the default renderer) fills it.
     * @param {HTMLTableSectionElement} thead
     */
    createColumnHeaders(thead: HTMLTableSectionElement): void;
    /**
     * Default header cell renderer for base columns.
     * @param {HTMLTableCellElement} th
     * @param {CellContext} ctx
     */
    renderDefaultHeaderCell(th: HTMLTableCellElement, ctx: CellContext): void;
    /**
     * @param {HTMLTableSectionElement} thead
     */
    createColumnFilters(thead: HTMLTableSectionElement): void;
    /**
     * Default filter cell renderer for base columns.
     * @param {HTMLTableCellElement} th
     * @param {Column} column
     * @param {HTMLTableCellElement} relatedTh
     */
    renderDefaultFilterCell(th: HTMLTableCellElement, column: Column, relatedTh: HTMLTableCellElement): void;
    /**
     * @param {Column} column
     * @param {HTMLTableCellElement} relatedTh
     * @returns {HTMLInputElement|HTMLSelectElement}
     */
    createFilterElement(column: Column, relatedTh: HTMLTableCellElement): HTMLInputElement | HTMLSelectElement;
    /**
     * Resolve the options of a select filter, directly consumable by the
     * <select>. Never derives from the currently loaded page: for a server
     * grid the options must come from meta.filters or an explicit list.
     * @public
     * @param {Column} column
     * @returns {Array<import("./data-source.js").FilterOption>}
     */
    public getFilterOptions(column: Column): Array<import("./data-source.js").FilterOption>;
    /**
     * Render the rows of the current page into tbody
     * It will call paginate() at the end
     */
    renderBody(): void;
    /**
     * Default cell renderer for base columns (transform).
     * Editable cells are marked for the EditableColumn plugin.
     * @param {HTMLTableCellElement} td
     * @param {CellContext} ctx
     */
    renderDefaultCell(td: HTMLTableCellElement, ctx: CellContext): void;
    paginate(): void;
    /**
     * @public
     * @returns {number}
     */
    public totalPages(): number;
    /**
     * Make sure the current page is still valid
     */
    fixPage(): this;
    #private;
}
import BaseElement from "./core/base-element.js";
//# sourceMappingURL=data-grid.d.ts.map