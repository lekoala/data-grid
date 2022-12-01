import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/shortcuts.js";

/**
 * Allows to select rows
 */
class SelectableRows extends BasePlugin {
  constructor(grid) {
    super(grid);
  }
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
    let selectedData = [];

    Array.from(grid.querySelectorAll("tbody .dg-selectable input:checked")).forEach((checkbox) => {
      if (!(checkbox instanceof HTMLElement)) {
        return;
      }
      const idx = parseInt(checkbox.dataset.id);
      const item = grid.data[idx - 1];
      if (!item) {
        console.warn(`Item ${idx} not found`);
      }
      if (key) {
        selectedData.push(item[key]);
      } else {
        selectedData.push(item);
      }
    });
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
    tbody.querySelectorAll("tr[hidden] .dg-selectable input").forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = false;
      }
    });
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createHeaderCol(tr) {
    let th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.setAttribute("role", "columnheader button");
    th.setAttribute("aria-colindex", "1");
    th.classList.add(...["dg-selectable", "dg-not-resizable", "dg-not-sortable"]);
    th.tabIndex = 0;

    this.selectAll = document.createElement("input");
    this.selectAll.type = "checkbox";
    this.selectAll.classList.add("dg-select-all");
    this.selectAll.addEventListener("change", this);

    let label = document.createElement("label");
    label.appendChild(this.selectAll);

    th.appendChild(label);

    th.setAttribute("width", "40");
    tr.appendChild(th);
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createFilterCol(tr) {
    let th = document.createElement("th");
    th.setAttribute("role", "columnheader button");
    th.setAttribute("aria-colindex", "1");
    th.classList.add("dg-selectable");
    th.tabIndex = 0;

    let label = document.createElement("label");
    th.appendChild(label);
    tr.appendChild(th);
  }

  /**
   * Handles the selectAll checkbox when any other .dg-selectable checkbox is checked.
   * It should check selectAll if all is checked
   * It should uncheck selectAll if any is unchecked
   * @param {HTMLTableSectionElement} tbody
   */
  shouldSelectAll(tbody) {
    const grid = this.grid;
    if (!this.selectAll) {
      return;
    }
    // Delegate listener for change events on input checkboxes
    tbody.addEventListener("change", (e) => {
      if (e.target instanceof HTMLInputElement) {
        if (!e.target.closest(".dg-selectable")) {
          return;
        }
        const totalCheckboxes = grid.querySelectorAll("tbody .dg-selectable input[type=checkbox]");
        // @ts-ignore
        const totalChecked = Array.from(totalCheckboxes).filter((n) => n.checked);
        this.selectAll.checked = totalChecked.length == totalCheckboxes.length;

        dispatch(grid, "rowsSelected", {
          selection: grid.getSelection(),
        });
      }
    });
    tbody.dispatchEvent(new Event("change"));
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createDataCol(tr) {
    // Create col
    let td = document.createElement("td");
    td.setAttribute("role", "gridcell button");
    td.setAttribute("aria-colindex", "1");
    td.classList.add("dg-selectable");

    // Create input
    let selectOne = document.createElement("input");
    // Alias row id for easy retrieval in getSelection
    selectOne.dataset.id = tr.getAttribute("aria-rowindex");
    selectOne.type = "checkbox";
    // Label need to take full space thanks to css to make the whole cell clickable
    let label = document.createElement("label");
    label.appendChild(selectOne);
    td.appendChild(label);

    // Prevent unwanted click behaviour on row
    label.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    tr.appendChild(td);
  }

  /**
   * Reflect state
   * @param {Event} e
   */
  onchange(e) {
    const grid = this.grid;
    const visibleOnly = grid.options.selectVisibleOnly;
    grid.querySelectorAll("tbody .dg-selectable input").forEach((cb) => {
      if (!(cb instanceof HTMLInputElement)) {
        return;
      }
      if (visibleOnly && !cb.offsetWidth) {
        return;
      }
      cb.checked = this.selectAll.checked;
    });

    dispatch(grid, "rowsSelected", {
      selection: this.getSelection(),
    });
  }
}

export default SelectableRows;
