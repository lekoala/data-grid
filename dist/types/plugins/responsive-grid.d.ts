export default ResponsiveGrid;
/**
 * Responsive data grid
 */
declare class ResponsiveGrid extends BasePlugin {
    observerBlocked: boolean;
    prevAction: string | null;
    unblockTimeout: NodeJS.Timeout | null;
    _lastEntry: ResizeObserverEntry | null;
    _scheduleResize: () => void;
    observer: ResizeObserver;
    observe(): void;
    unobserve(): void;
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
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=responsive-grid.d.ts.map