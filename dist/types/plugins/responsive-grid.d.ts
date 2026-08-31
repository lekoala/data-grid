import BasePlugin from "../core/base-plugin.js";
export type ResponsiveItem = {
    th: HTMLElement;
    column: import("../data-grid.js").Column | null;
};
export type ResponsiveLayout = {
    items: ResponsiveItem[];
    visible: ResponsiveItem[];
    preferredWidth: (th: HTMLElement) => number;
    requiredWidth: (visibleItems: ResponsiveItem[]) => number;
    isColumnHidden: (column: import("../data-grid.js").Column | null) => boolean;
};
/**
 * Responsive data grid
 */
declare class ResponsiveGrid extends BasePlugin {
    #private;
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
    /**
     * Inject the responsive toggle column. The column always exists when
     * responsive is active so the row structure stays stable during resize;
     * it is simply hidden until at least one column is responsiveHidden.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns: import("../data-grid.js").Column[]): void;
    /**
     * Apply responsive hide/show using the last observed size, or an explicit
     * viewport width supplied by a caller that already measured it.
     * @param {Number} [width]
     */
    resize(width?: number): void;
    /**
     * Follow the shared disclosure control: the row details toggle governs the
     * whole expansion surface of its row, responsive values included. No-op
     * unless responsive has yielded its own toggle, so an explicit
     * `responsiveToggle: false` keeps its section governed by
     * `responsiveStartOpen` alone.
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    followDisclosure(tr: HTMLTableRowElement, expanded: boolean): void;
    updateLabels(): void;
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