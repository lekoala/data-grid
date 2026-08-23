import BasePlugin from "../core/base-plugin.js";

const SELECTABLE_CLASS = "dg-selectable";
const SELECT_ALL_CLASS = "dg-select-all";

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
            frozen: "start",
            width: 40,
            sortable: false,
            title: "",
            class: SELECTABLE_CLASS,
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: () => this.createFilterCell(),
            renderCell: (ctx) => this.createDataCell(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
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

    updateLabels() {
        if (this.selectAll) {
            this.selectAll.setAttribute("aria-label", this.grid.labels.selectAll);
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
        const inputs = /** @type {HTMLInputElement[]} */ (
            Array.from(tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`))
        );
        for (const input of inputs) {
            const tr = input.closest("tr");
            if (!tr) {
                continue;
            }
            const index = Number.parseInt(tr.dataset.rowIndex ?? "", 10);
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
        let visible = 0;
        let checked = 0;
        const tbody = grid.tbody;
        if (tbody) {
            const inputs = /** @type {HTMLInputElement[]} */ (
                Array.from(tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`))
            );
            for (const input of inputs) {
                if (this.visibleOnly && input.closest("tr[hidden]")) {
                    continue;
                }
                visible += 1;
                if (input.checked) {
                    checked += 1;
                }
            }
        }
        this.selectAll.indeterminate = checked > 0 && checked < visible;
        this.selectAll.checked = visible > 0 && checked === visible;
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add("dg-not-resizable", "dg-not-sortable");

        this.selectAll = document.createElement("input");
        this.selectAll.type = "checkbox";
        this.selectAll.classList.add(SELECT_ALL_CLASS);
        this.selectAll.setAttribute("aria-label", this.grid.labels.selectAll);
        this.selectAll.addEventListener("change", () => {
            if (this.selectAll?.checked) {
                this.grid.selectAll();
            } else {
                this.grid.clearSelection();
            }
        });

        const label = document.createElement("label");
        label.hidden = this.isSingleSelect;
        // Same full-cell centering box as the row checkboxes
        label.classList.add("dg-clickable-cell");
        label.appendChild(this.selectAll);

        th.appendChild(label);
        this.syncSelectAll();
    }

    createFilterCell() {}

    /**
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {HTMLElement}
     */
    createDataCell({ row, rowIndex }) {
        const grid = this.grid;

        const input = document.createElement("input");
        input.type = this.isSingleSelect ? "radio" : "checkbox";
        input.checked = row ? grid.isRowSelected(row, rowIndex ?? 0) : false;
        input.setAttribute(
            "aria-label",
            grid.formatLabel(grid.labels.selectRow, { row: grid.getRowLabel(row ?? {}, rowIndex ?? 0) }),
        );
        if (this.isSingleSelect) {
            input.name = `dg-row-select-${grid.id}`;
        }

        // Label need to take full space thanks to css to make the whole cell clickable
        const label = document.createElement("label");
        label.classList.add("dg-clickable-cell");
        label.appendChild(input);

        // Prevent unwanted click behaviour on the row (default action, etc.)
        label.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        if (this.isSingleSelect) {
            // Radio buttons can't be unchecked natively: control the state manually
            input.addEventListener("click", (event) => {
                event.preventDefault();
                if (row && grid.isRowSelected(row, rowIndex ?? 0)) {
                    grid.deselectRow(row, rowIndex ?? 0);
                } else if (row) {
                    grid.selectRow(row, rowIndex ?? 0);
                }
            });
        } else {
            input.addEventListener("change", () => {
                if (row) {
                    grid.toggleRow(row, rowIndex ?? 0);
                }
            });
        }

        return label;
    }
}

export default SelectableRows;
