import BasePlugin from "../core/base-plugin.js";
import interpolate from "../utils/interpolate.js";
import { dispatch, on, setAttribute } from "../utils/shortcuts.js";

/**
 * Add action on rows
 */
class RowActions extends BasePlugin {
  /**
   *
   * @param {HTMLTableRowElement} tr
   */
  makeActionHeader(tr) {
    let actionsTh = document.createElement("th");
    setAttribute(actionsTh, "role", "columnheader button");
    setAttribute(actionsTh, "aria-colindex", this.grid.columnsLength(true));
    actionsTh.classList.add(...["dg-actions", "dg-not-sortable", "dg-not-resizable", this.actionClass]);
    actionsTh.tabIndex = 0;
    tr.appendChild(actionsTh);
  }

  /**
   *
   * @param {HTMLTableRowElement} tr
   */
  makeActionFilter(tr) {
    let actionsTh = document.createElement("th");
    actionsTh.setAttribute("role", "columnheader button");
    actionsTh.setAttribute("aria-colindex", "" + this.grid.columnsLength(true));
    actionsTh.classList.add(...["dg-actions", this.actionClass]);
    actionsTh.tabIndex = 0;
    tr.appendChild(actionsTh);
  }

  /**
   * @param {HTMLTableRowElement} tr
   * @param {Object} item
   */
  makeActionRow(tr, item) {
    const labels = this.grid.labels;
    const td = document.createElement("td");
    setAttribute(td, "role", "gridcell");
    setAttribute(td, "aria-colindex", this.grid.columnsLength(true));
    td.classList.add(...["dg-actions", this.actionClass]);
    td.tabIndex = 0;

    // Add menu toggle
    let actionsToggle = document.createElement("button");
    actionsToggle.classList.add("dg-actions-toggle");
    actionsToggle.innerHTML = "☰";
    td.appendChild(actionsToggle);
    on(actionsToggle, "click", (ev) => {
      ev.stopPropagation();
      ev.target.parentElement.classList.toggle("dg-actions-expand");
    });

    this.grid.options.actions.forEach((action) => {
      let button = document.createElement("button");
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
          let c = confirm(labels.areYouSure);
          if (!c) {
            ev.preventDefault();
            return;
          }
        }
        dispatch(this.grid, "action", {
          data: item,
          action: action.name,
        });
      };
      button.addEventListener("click", actionHandler);
      td.appendChild(button);

      // Row action
      if (action.default) {
        tr.classList.add("dg-actionable");
        tr.addEventListener("click", actionHandler);
      }
    });

    tr.appendChild(td);
  }

  get actionClass() {
    if (this.grid.options.actions.length < 3 && !this.grid.options.collapseActions) {
      return "dg-actions-" + this.grid.options.actions.length;
    }
    return "dg-actions-more";
  }
}

export default RowActions;
