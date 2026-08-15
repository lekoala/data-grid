// @ts-nocheck
import BasePlugin from "../core/base-plugin.js";
import { setAttribute } from "../utils/shortcuts.js";

const SELECTABLE_CLASS = "dg-selectable";
const SELECT_ALL_CLASS = "dg-select-all";
const CHECKBOX_CLASS = "form-check-input"; //bs5

/**
 * Allows to select rows
 */
class SelectableRows extends BasePlugin {
    get isSingleSelect() {
        return this.grid.options.singleSelect;
    }

    get visibleOnly() {
        return this.grid.options.selectVisibleOnly;
    }

    connected() {
        this.grid.addEventListener("selectionChange", this);
    }

    disconnected() {
        this.grid.removeEventListener("selectionChange", this);
    }

    /**
     * @param {Event} event
     */
    handleEvent(event) {
        if (event.type === "selectionChange") {
            this.syncSelection();
        }
    }

    /**
     * Inject the selection column at the start.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.grid.options.selectable) {
            return;
        }
        columns.unshift({
            id: "$selection",
            virtual: true,
            position: "start",
            noSort: true,
            title: "",
            class: SELECTABLE_CLASS,
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: (th) => this.createFilterCell(th),
            renderCell: (ctx) => this.createDataCell(ctx),
        });
    }

    /**
     * After a render cycle, reflect the selection state on the checkboxes.
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context === "body") {
            this.syncSelection();
        } else if (context === "table") {
            this.syncSelectAll();
        }
    }

    /**
     * Reflect the current selection state on the body checkboxes.
     */
    syncSelection() {
        const grid = this.grid;
        if (!grid.options.selectable) {
            return;
        }
        const tbody = grid.tbody;
        if (!tbody) {
            return;
        }
        const inputs = tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`);
        const trs = Array.from(tbody.querySelectorAll("tr"));
        for (const input of inputs) {
            const tr = input.closest("tr");
            if (!tr) {
                continue;
            }
            const index = trs.indexOf(tr);
            const row = grid.rows[index];
            if (row === undefined) {
                continue;
            }
            input.checked = grid.isRowSelected(row, index);
        }
        this.syncSelectAll();
    }

    /**
     * Keep the header select-all checkbox in sync with the body.
     */
    syncSelectAll() {
        const grid = this.grid;
        if (!this.selectAll || !grid.options.selectable) {
            return;
        }
        const visible = [];
        const tbody = grid.tbody;
        if (tbody) {
            const inputs = tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`);
            for (const input of inputs) {
                if (this.visibleOnly && input.closest("tr[hidden]")) {
                    continue;
                }
                visible.push(input);
            }
        }
        const checked = visible.filter((input) => input.checked).length;
        this.selectAll.indeterminate = checked > 0 && checked < visible.length;
        this.selectAll.checked = visible.length > 0 && checked === visible.length;
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        setAttribute(th, "width", "40");
        th.classList.add("dg-not-resizable", "dg-not-sortable");

        this.selectAll = document.createElement("input");
        this.selectAll.type = "checkbox";
        this.selectAll.classList.add(SELECT_ALL_CLASS, CHECKBOX_CLASS);
        this.selectAll.addEventListener("change", () => {
            if (this.selectAll.checked) {
                this.grid.selectAll();
            } else {
                this.grid.clearSelection();
            }
        });

        const label = document.createElement("label");
        label.hidden = this.isSingleSelect;
        label.appendChild(this.selectAll);

        th.appendChild(label);
        this.syncSelectAll();
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createFilterCell() {}

    /**
     * @param {Object} ctx
     * @returns {HTMLElement}
     */
    createDataCell({ row, rowIndex }) {
        const grid = this.grid;

        const input = document.createElement("input");
        input.type = this.isSingleSelect ? "radio" : "checkbox";
        input.classList.add(CHECKBOX_CLASS);
        input.checked = grid.isRowSelected(row, rowIndex);
        if (this.isSingleSelect) {
            input.name = "dg-row-select";
        }

        // Label need to take full space thanks to css to make the whole cell clickable
        const label = document.createElement("label");
        label.classList.add("dg-clickable-cell");
        label.appendChild(input);

        // Prevent unwanted click behaviour on row (expand, default action...)
        label.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        if (this.isSingleSelect) {
            // Radio buttons can't be unchecked natively: control the state manually
            input.addEventListener("click", (event) => {
                event.preventDefault();
                if (grid.isRowSelected(row, rowIndex)) {
                    grid.deselectRow(row, rowIndex);
                } else {
                    grid.selectRow(row, rowIndex);
                }
            });
        } else {
            input.addEventListener("change", () => {
                grid.toggleRow(row, rowIndex);
            });
        }

        return label;
    }
}

export default SelectableRows;
