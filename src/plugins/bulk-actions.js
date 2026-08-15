import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/shortcuts.js";

/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
class BulkActions extends BasePlugin {
    /** @type {HTMLDivElement|null} */
    bar = null;
    /** @type {HTMLSpanElement|null} */
    countEl = null;
    /** @type {HTMLButtonElement[]|null} */
    buttons = null;

    connected() {
        const grid = this.grid;
        const bulkActions = grid.options.bulkActions ?? [];
        if (!bulkActions.length) {
            return;
        }

        // Build the toolbar once: it stays visible and only its state changes.
        // Keeping the DOM stable avoids layout shifts and focus loss.
        const bar = document.createElement("div");
        bar.className = "dg-bulk-actions";
        this.bar = bar;

        this.countEl = document.createElement("span");
        this.countEl.className = "dg-bulk-count";
        bar.appendChild(this.countEl);

        this.buttons = bulkActions.map((action) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.action = action.name;
            if (action.intent) {
                button.dataset.intent = action.intent;
            }
            button.textContent = action.label ?? action.name;
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                if (button.disabled) {
                    return;
                }
                dispatch(grid, "bulkAction", {
                    action: action.name,
                    selection: grid.getSelectionState(),
                    query: grid.query,
                });
            });
            bar.appendChild(button);
            return button;
        });

        const table = grid.querySelector("table");
        if (table) {
            grid.insertBefore(bar, table);
        } else {
            grid.appendChild(bar);
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
     * Reflect the current selection on the toolbar state.
     */
    render() {
        if (!this.bar || !this.countEl || !this.buttons?.length) {
            return;
        }
        const grid = this.grid;
        const selection = grid.getSelectionState();
        const count = selection.mode === "all" ? Math.max(0, grid.total - selection.except.size) : selection.ids.size;

        this.countEl.textContent = grid.formatLabel(grid.labels.selectedCount, { count });
        for (const button of this.buttons) {
            button.disabled = count === 0;
        }
    }
}

export default BulkActions;
