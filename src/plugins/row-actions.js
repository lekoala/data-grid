import BasePlugin from "../core/base-plugin.js";
import interpolate from "../utils/interpolate.js";
import { dispatch, on } from "../utils/shortcuts.js";

/**
 * Add action on rows
 */
class RowActions extends BasePlugin {
    /**
     * @returns {Boolean}
     */
    hasActions() {
        return this.grid.options.actions.length > 0;
    }

    /**
     * Inject the actions column at the end.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.grid.options.actions.length) {
            return;
        }
        columns.push({
            id: "$actions",
            virtual: true,
            position: "end",
            noSort: true,
            title: "",
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: (th) => this.createFilterCell(th),
            renderCell: (td, ctx) => this.makeActionRow(td, ctx),
        });
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add(...["dg-actions", "dg-not-sortable", "dg-not-resizable", this.actionClass]);
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createFilterCell(th) {
        th.classList.add(...["dg-actions", this.actionClass]);
    }

    /**
     * @param {HTMLTableCellElement} td
     * @param {Object} ctx
     */
    makeActionRow(td, ctx) {
        const grid = this.grid;
        const item = ctx.row;
        const labels = this.grid.labels;
        td.classList.add(...["dg-actions", this.actionClass]);

        // Add menu toggle
        const actionsToggle = document.createElement("button");
        actionsToggle.classList.add("dg-actions-toggle");
        actionsToggle.innerHTML = "☰";
        td.appendChild(actionsToggle);
        on(actionsToggle, "click", (ev) => {
            ev.stopPropagation();
            ev.target.parentElement.classList.toggle("dg-actions-expand");
        });

        for (const action of grid.options.actions) {
            const button = document.createElement("button");
            button.dataset.action = action.name;
            if (action.html) {
                button.innerHTML = action.html;
            } else {
                button.innerText = action.title ?? action.name;
            }
            if (action.title) {
                button.title = action.title;
            }
            if (action.url) {
                button.type = "submit";
                button.formAction = interpolate(action.url, item);
            }
            if (action.class) {
                button.classList.add(...action.class.split(" "));
            }
            const actionHandler = (ev) => {
                ev.stopPropagation();
                if (action.confirm) {
                    const c = confirm(labels.areYouSure);
                    if (!c) {
                        ev.preventDefault();
                        return;
                    }
                }
                dispatch(grid, "action", {
                    data: item,
                    action: action.name,
                });
            };
            button.addEventListener("click", actionHandler);
            td.appendChild(button);

            // Row action
            if (action.default) {
                const tr = td.parentElement;
                tr.classList.add("dg-actionable");
                tr.addEventListener("click", actionHandler);
            }
        }
    }

    get actionClass() {
        if (this.grid.options.actions.length < 3 && !this.grid.options.collapseActions) {
            return `dg-actions-${this.grid.options.actions.length}`;
        }
        return "dg-actions-more";
    }
}

export default RowActions;
