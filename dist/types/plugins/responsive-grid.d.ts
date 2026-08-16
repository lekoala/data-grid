import BasePlugin from "../core/base-plugin.js";
/**
 * Responsive data grid
 */
declare class ResponsiveGrid extends BasePlugin {
    observerBlocked: boolean;
    unblockTimeout: number | null;
    _lastEntry: ResizeObserverEntry | null;
    _lastProcessedWidth: number | null;
    _scheduleResize: () => void;
    observer: ResizeObserver;
    _observed: HTMLDivElement | null | undefined;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * @param {Boolean} enabled
     */
    responsiveChanged(enabled: boolean): void;
    observe(): void;
    unobserve(): void;
    /**
     * Inject the responsive toggle column. The column always exists when
     * responsive is active so the row structure stays stable during resize;
     * it is simply hidden until at least one column is responsiveHidden.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns: import("../data-grid.js").Column[]): void;
    blockObserver(): void;
    unblockObserver(): void;
    /**
     * @returns {Boolean}
     */
    hasHiddenColumns(): boolean;
    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th: HTMLTableCellElement): void;
    createFilterCell(): void;
    /**
     * @returns {HTMLElement}
     */
    createDataCell(): HTMLElement;
    /**
     * Apply responsive hide/show based on the last observed size.
     */
    resize(): void;
    computeLabelWidth(): number;
    /**
     * @param {Event} ev
     */
    onmousedown(ev: Event): void;
    /**
     * The real rendered record rows (excludes responsive child rows and fake
     * empty/error rows).
     * @returns {HTMLTableRowElement[]}
     */
    _dataRows(): HTMLTableRowElement[];
    /**
     * A column is essential for the current view when it must never be hidden:
     * `responsive: 0`, an actively sorted column, an actively filtered column,
     * or one the author has manually hidden (already not rendered). Essential
     * columns are excluded from the hideable candidates.
     * @param {import("../data-grid.js").Column|null|undefined} column
     * @returns {Boolean}
     */
    _isEssential(column: import("../data-grid.js").Column | null | undefined): boolean;
    /**
     * Reorder a data row's direct cells to the canonical column order of
     * `grid.getColumns()`, so cells restored from a detail row never end up in
     * the wrong position.
     * @param {HTMLTableRowElement} tr
     */
    _canonicalizeRow(tr: HTMLTableRowElement): void;
    /**
     * Reflect the expanded state on the toggle column icon (no-op when there is
     * no toggle column, i.e. `responsiveToggle: false`).
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    _setToggleIcon(tr: HTMLTableRowElement, expanded: boolean): void;
    /**
     * Set a single row to the given expanded state. The row owns its state via
     * the `data-responsive-expanded` attribute: `"true"` open, `"false"`
     * collapsed, missing = undecided (seeded from `responsiveStartOpen`).
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    _setRowExpanded(tr: HTMLTableRowElement, expanded: boolean): void;
    /**
     * Normalize the table back to its canonical tabular representation: every
     * cell moved into a detail row is returned to its owning data row, in
     * column order, and the detail wrappers are removed. The row expansion
     * state attribute is left untouched.
     */
    _restoreDetails(): void;
    /**
     * Rebuild responsive detail rows from the canonical representation after
     * the hidden-column set changes. Rows that are open (or seeded open by
     * `responsiveStartOpen`) have their hidden values moved into a fresh detail
     * row; user-collapsed rows stay collapsed.
     */
    _rebuildDetails(): void;
    /**
     * Expand every data row whose (materialized) expansion state is open. Rows
     * with no state yet are seeded from `responsiveStartOpen`.
     */
    _seedRows(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * @param {Event} ev
     */
    onclick(ev: Event): void;
}
export default ResponsiveGrid;
//# sourceMappingURL=responsive-grid.d.ts.map