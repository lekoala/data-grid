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
    /** @type {HTMLSpanElement|null} */
    countVisible = null;
    /** @type {HTMLSpanElement|null} */
    countStatus = null;
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
        this.countEl.className = "dg-selection-count";
        this.countEl.setAttribute("role", "status");
        this.countEl.setAttribute("aria-live", "polite");
        this.countEl.setAttribute("aria-atomic", "true");
        this.countEl.hidden = true;
        this.countVisible = document.createElement("span");
        this.countVisible.setAttribute("aria-hidden", "true");
        this.countStatus = document.createElement("span");
        this.countStatus.className = "dg-visually-hidden";
        this.countEl.append(this.countVisible, this.countStatus);
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
                const selection = grid.getSelectionState();
                let mustConfirm = Boolean(action.confirm);
                let message = grid.labels.areYouSure;
                if (typeof action.confirm === "string") {
                    message = action.confirm;
                } else if (typeof action.confirm === "function") {
                    const result = action.confirm(selection, { grid, action });
                    if (typeof result === "string") {
                        message = result;
                    } else if (result === false) {
                        mustConfirm = false;
                    }
                }
                if (mustConfirm && !window.confirm(message)) {
                    return;
                }
                dispatch(grid, "bulkAction", {
                    action,
                    name: action.name,
                    selection,
                    query: grid.query,
                    trigger: button,
                });
            });
            bar.appendChild(button);
            return button;
        });

        const table = grid.querySelector("table");
        if (table) {
            grid.ensureTopbar().querySelector(".dg-topbar-start")?.appendChild(bar);
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

        this.countEl.hidden = count === 0;
        if (this.countVisible && this.countStatus) {
            this.countVisible.textContent = `${count}`;
            this.countStatus.textContent = grid.formatLabel(grid.labels.selectedCount, { count });
        }
        for (const button of this.buttons) {
            button.disabled = count === 0;
        }
    }
}

export default BulkActions;
