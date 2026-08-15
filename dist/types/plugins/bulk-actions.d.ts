import BasePlugin from "../core/base-plugin.js";
/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
declare class BulkActions extends BasePlugin {
    bar: HTMLDivElement | undefined;
    connected(): void;
    disconnected(): void;
    /**
     * @param {Event} event
     */
    handleEvent(event: Event): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
    /**
     * Render the bulk action bar reflecting the current selection.
     */
    render(): void;
}
export default BulkActions;
//# sourceMappingURL=bulk-actions.d.ts.map