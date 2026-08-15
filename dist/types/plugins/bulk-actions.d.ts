export default BulkActions;
/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
declare class BulkActions extends BasePlugin {
    bar: HTMLDivElement | undefined;
    /**
     * Render the bulk action bar reflecting the current selection.
     */
    render(): void;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=bulk-actions.d.ts.map