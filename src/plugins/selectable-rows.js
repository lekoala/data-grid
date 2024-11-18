import BasePlugin from "../core/base-plugin.js";
import { dispatch, findAll, hasClass, setAttribute } from "../utils/shortcuts.js";

const SELECTABLE_CLASS = "dg-selectable";
const SELECT_ALL_CLASS = "dg-select-all";
const CHECKBOX_CLASS = "form-check-input"; //bs5

/**
 * Allows to select rows
 */
class SelectableRows extends BasePlugin {
    disconnected() {
        if (this.selectAll) {
            this.selectAll.removeEventListener("change", this);
        }
    }

    /**
     * @param {String} key Return a specific key (eg: id) instead of the whole row
     * @returns {Array}
     */
    getSelection(key = null) {
        const grid = this.grid;
        const selectedData = [];

        const inputs = findAll(grid, `tbody .${SELECTABLE_CLASS} input:checked`);

        for (const checkbox of inputs) {
            const idx = Number.parseInt(checkbox.dataset.id);
            const item = grid.data[idx - 1];
            if (!item) {
                console.warn(`Item ${idx} not found`);
            }
            if (key) {
                selectedData.push(item[key]);
            } else {
                selectedData.push(item);
            }
        }
        return selectedData;
    }

    /**
     * Uncheck box if hidden and visible only
     * @param {HTMLTableSectionElement} tbody
     */
    clearCheckboxes(tbody) {
        const grid = this.grid;
        if (!grid.options.selectVisibleOnly) {
            return;
        }
        const inputs = findAll(tbody, `tr[hidden] .${SELECTABLE_CLASS} input`);
        for (const input of inputs) {
            input.checked = false;
        }
        this.selectAll.checked = false;
    }

    colIndex() {
        return this.grid.startColIndex() - 2;
    }

    /**
     * @param {HTMLTableRowElement} tr
     */
    createHeaderCol(tr) {
        const th = document.createElement("th");
        setAttribute(th, "scope", "col");
        setAttribute(th, "role", "columnheader button");
        setAttribute(th, "aria-colindex", this.colIndex());
        th.classList.add(...[SELECTABLE_CLASS, "dg-not-resizable", "dg-not-sortable"]);
        th.tabIndex = 0;

        this.selectAll = document.createElement("input");
        this.selectAll.type = "checkbox";
        this.selectAll.classList.add(SELECT_ALL_CLASS);
        this.selectAll.classList.add(CHECKBOX_CLASS);
        this.selectAll.addEventListener("change", this);

        const label = document.createElement("label");
        label.appendChild(this.selectAll);

        th.appendChild(label);

        th.setAttribute("width", "40");
        tr.appendChild(th);
    }

    /**
     * @param {HTMLTableRowElement} tr
     */
    createFilterCol(tr) {
        const th = document.createElement("th");
        setAttribute(th, "role", "columnheader button");
        setAttribute(th, "aria-colindex", this.colIndex());
        th.classList.add(SELECTABLE_CLASS);
        th.tabIndex = 0;

        tr.appendChild(th);
    }

    /**
     * Handles the selectAll checkbox when any other .dg-selectable checkbox is checked on table body.
     * It should check selectAll if all is checked
     * It should uncheck selectAll if any is unchecked
     * @param {HTMLTableSectionElement} tbody
     */
    shouldSelectAll(tbody) {
        if (!this.selectAll) {
            return;
        }
        // Delegate listener for change events on input checkboxes
        tbody.addEventListener("change", this);
        // Make sure state is up to date
        tbody.dispatchEvent(new Event("change"));
    }

    /**
     * @param {HTMLTableRowElement} tr
     */
    createDataCol(tr) {
        // Create col
        const td = document.createElement("td");
        setAttribute(td, "role", "gridcell button");
        setAttribute(td, "aria-colindex", this.colIndex());
        td.classList.add(SELECTABLE_CLASS);

        // Create input
        const selectOne = document.createElement("input");
        // Alias row id for easy retrieval in getSelection
        selectOne.dataset.id = tr.getAttribute("aria-rowindex");
        selectOne.type = "checkbox";
        selectOne.classList.add(CHECKBOX_CLASS);
        // Label need to take full space thanks to css to make the whole cell clickable
        const label = document.createElement("label");
        label.classList.add("dg-clickable-cell");
        label.appendChild(selectOne);
        td.appendChild(label);

        // Prevent unwanted click behaviour on row
        label.addEventListener("click", this);

        tr.appendChild(td);
    }

    /**
     * @param {Event} e
     */
    onclick(e) {
        e.stopPropagation();
    }

    /**
     * Handle change event on select all or any select checkbox in the table body
     * @param {import("../utils/shortcuts.js").FlexibleEvent} e
     */
    onchange(e) {
        const grid = this.grid;
        if (hasClass(e.target, SELECT_ALL_CLASS)) {
            const visibleOnly = grid.options.selectVisibleOnly;
            const inputs = findAll(grid, `tbody .${SELECTABLE_CLASS} input`);
            for (const cb of inputs) {
                if (visibleOnly && !cb.offsetWidth) {
                    return;
                }
                cb.checked = this.selectAll.checked;
            }
            dispatch(grid, "rowsSelected", {
                selection: this.getSelection(),
            });
        } else {
            if (!e.target.closest(`.${SELECTABLE_CLASS}`)) {
                return;
            }
            const totalCheckboxes = findAll(grid, `tbody .${SELECTABLE_CLASS} input[type=checkbox]`);
            // @ts-ignore
            const totalChecked = totalCheckboxes.filter((n) => n.checked);
            this.selectAll.checked = totalChecked.length === totalCheckboxes.length;

            dispatch(grid, "rowsSelected", {
                selection: grid.getSelection(),
            });
        }
    }
}

export default SelectableRows;
