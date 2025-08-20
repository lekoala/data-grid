// @ts-nocheck
import BasePlugin from "../core/base-plugin.js";
import { dispatch, findAll, hasClass, setAttribute, $, $$ } from "../utils/shortcuts.js";

const SELECTABLE_CLASS = "dg-selectable";
const SELECT_ALL_CLASS = "dg-select-all";
const CHECKBOX_CLASS = "form-check-input"; //bs5

/**
 * Allows to select rows
 */
class SelectableRows extends BasePlugin {
    #cbSelector = `tbody tr${this.visibleOnly ? ":not([hidden])" : ""} .${SELECTABLE_CLASS} input[type=checkbox]`;
    #inputSelector = `tbody .${SELECTABLE_CLASS} input`;

    disconnected() {
        if (this.selectAll) {
            this.selectAll.removeEventListener("change", this);
        }
    }

    get isSingleSelect() {
        return this.grid.options.singleSelect;
    }

    get visibleOnly() {
        return this.grid.options.selectVisibleOnly;
    }

    /**
     * Get selected rows or fields.
     * Returns full rows, a single field's values, or objects with specified fields.
     * In single select mode, returns a single item.
     * @param {...string} keys Field names to select.
     * @returns {Array|Object} Selected data.
     */
    getSelection(...keys) {
        const grid = this.grid;
        const selectedData = [];

        const inputs = findAll(grid, `${this.#inputSelector}:checked`);

        for (const checkbox of inputs) {
            const idx = Number.parseInt(checkbox.dataset.id);
            const item = grid.data[idx - 1];
            if (!item) {
                console.warn(`Item ${idx} not found`);
                continue;
            }
            if (keys.length === 0) {
                selectedData.push(item);
            } else if (keys.length === 1) {
                selectedData.push(item[keys[0]]);
            } else {
                selectedData.push(Object.fromEntries(keys.map(k => [k, item[k]])));
            }
        }
        return this.isSingleSelect ? selectedData[0] ?? {} : selectedData;
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
            if (this.isSingleSelect) {
                input.dataset.toggled = "false"; // Reset toggled state for radio buttons
            }
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
        label.hidden = this.isSingleSelect;
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
        const input = document.createElement("input");
        // Alias row id for easy retrieval in getSelection
        input.dataset.id = tr.getAttribute("aria-rowindex");
        input.type = this.isSingleSelect ? "radio" : "checkbox";
        input.classList.add(CHECKBOX_CLASS);
        if (this.isSingleSelect) {
            input.name = "dg-row-select";
            input.dataset.toggled = "false";
        }

        // Label need to take full space thanks to css to make the whole cell clickable
        const label = document.createElement("label");
        label.classList.add("dg-clickable-cell");

        label.appendChild(input);
        td.appendChild(label);

        // Prevent unwanted click behaviour on row
        label.addEventListener("click", this);

        tr.appendChild(td);
    }

    /**
     * @param {Event} e
     */
    onclick(e) {
        if (!this.isSingleSelect) return e.stopPropagation();

        // Implements radio button toggle behaviour for selecting and unselecting a row
        const el = e.target,
            unchecked = el.dataset.toggled !== "true";
        unchecked && $$(`${this.#cbSelector.replace("checkbox", "radio")}`, this.grid)?.forEach(r => {
            // Uncheck all other radios in the same group and reset their data-toggled
            if (r.name === el.name && r !== el) r.checked = r.dataset.toggled = false;
        });
        el.checked = el.dataset.toggled = unchecked;
        !unchecked && this.onchange(e); // Fires rowsSelected event
    }

    /**
     * Handle change event on select all or any select checkbox in the table body
     * @param {import("../utils/shortcuts.js").FlexibleEvent} e
     */
    onchange(e) {
        const el = e.target, grid = this.grid;
        if (hasClass(e.target, SELECT_ALL_CLASS)) {
            findAll(grid, this.#inputSelector).forEach(cb => {
                if (!this.visibleOnly || cb.offsetWidth) cb.checked = this.selectAll.checked;
            });
        } else if (el.matches(this.#cbSelector)) {
            if (!el.closest(`.${SELECTABLE_CLASS}`)) return;
            const totalCheckboxes = findAll(grid, this.#cbSelector);
            this.selectAll.checked = totalCheckboxes.every(n => n.checked);
        }
        if (el.matches(`.${SELECT_ALL_CLASS},${this.#inputSelector}`)) {
            dispatch(el, "rowsSelected", {
                selection: grid.getSelection()
            }, true);
        }
    }
}

export default SelectableRows;
