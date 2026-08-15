import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/shortcuts.js";

/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
class BulkActions extends BasePlugin {
    connected() {
        const grid = this.grid;
        this.bar = document.createElement("div");
        this.bar.className = "dg-bulk-actions";
        this.bar.hidden = true;
        const table = grid.querySelector("table");
        if (table) {
            grid.insertBefore(this.bar, table);
        } else {
            grid.appendChild(this.bar);
        }
        grid.addEventListener("selectionChange", this);
        this.render();
    }

    disconnected() {
        this.grid.removeEventListener("selectionChange", this);
        this.bar?.remove();
    }

    /**
     * @param {Event} event
     */
    handleEvent(event) {
        if (event.type === "selectionChange") {
            this.render();
        }
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context === "body") {
            this.render();
        }
    }

    updateLabels() {
        this.render();
    }

    /**
     * Render the bulk action bar reflecting the current selection.
     */
    render() {
        const grid = this.grid;
        const bulkActions = grid.options.bulkActions ?? [];
        if (!this.bar || !bulkActions.length) {
            return;
        }
        const selection = grid.getSelectionState();
        const hasSelection = selection.mode === "all" || selection.ids.size > 0;
        this.bar.hidden = !hasSelection;
        if (!hasSelection) {
            return;
        }

        while (this.bar.firstChild) {
            this.bar.removeChild(this.bar.firstChild);
        }

        const count = selection.mode === "all" ? Math.max(0, grid.total - selection.except.size) : selection.ids.size;
        const countEl = document.createElement("span");
        countEl.className = "dg-bulk-count";
        countEl.textContent = grid.formatLabel(grid.labels.selectedCount, { count });
        this.bar.appendChild(countEl);

        for (const action of bulkActions) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.action = action.name;
            if (action.intent) {
                button.dataset.intent = action.intent;
            }
            button.textContent = action.label ?? action.name;
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                dispatch(grid, "bulkAction", {
                    action: action.name,
                    selection: grid.getSelectionState(),
                    query: grid.query,
                });
            });
            this.bar.appendChild(button);
        }
    }
}

export default BulkActions;
