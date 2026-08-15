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
     * @param {Event} ev
     */
    onclick(ev: Event): void;
}
export default ResponsiveGrid;
//# sourceMappingURL=responsive-grid.d.ts.map