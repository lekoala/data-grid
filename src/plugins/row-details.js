import BasePlugin from "../core/base-plugin.js";
import applyContent from "../utils/applyContent.js";
import { dispatch } from "../utils/shortcuts.js";

const DETAILS_CLASS = "dg-row-details";

/** Expandable, application-rendered content associated with a data row. */
class RowDetails extends BasePlugin {
    /** @param {import("../data-grid.js").default} grid */
    constructor(grid) {
        super(grid);
        /** @type {Set<String>} */
        this.expanded = new Set();
        /** @type {Set<String>} */
        this.collapsed = new Set();
    }

    /** @param {import("../data-grid.js").Column[]} columns */
    extendColumns(columns) {
        if (typeof this.grid.options.rowDetails !== "function") {
            return;
        }
        columns.unshift({
            id: "$details",
            virtual: true,
            position: "start",
            frozen: "start",
            width: 40,
            sortable: false,
            title: "",
            class: `${DETAILS_CLASS}-toggle`,
            renderHeaderCell: (th) => th.classList.add("dg-not-resizable", "dg-not-sortable"),
            renderFilterCell: () => {},
            renderCell: (ctx) => this.createToggle(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
        });
    }

    /** @public @param {String} rowKey @returns {Boolean} */
    isExpanded(rowKey) {
        return this.expanded.has(String(rowKey));
    }

    /** @public @param {String} rowKey */
    expand(rowKey) {
        this._change(rowKey, true);
    }

    /** @public @param {String} rowKey */
    collapse(rowKey) {
        this._change(rowKey, false);
    }

    /** @public @param {String} rowKey */
    toggle(rowKey) {
        this._change(rowKey, !this.isExpanded(rowKey));
    }

    /** @public */
    collapseAll() {
        for (const key of this.expanded) {
            this.collapsed.add(key);
        }
        this.expanded.clear();
        this.grid.renderBody();
    }

    /** @param {String} rowKey @param {Boolean} expanded */
    _change(rowKey, expanded) {
        const key = String(rowKey);
        const index = this.grid.rows.findIndex((row, rowIndex) => this.grid.resolveRowKey(row, rowIndex) === key);
        if (index < 0) {
            return;
        }
        if (expanded) {
            this.expanded.add(key);
            this.collapsed.delete(key);
        } else {
            this.expanded.delete(key);
            this.collapsed.add(key);
        }
        const tr = this.grid.tbody?.querySelector(`tr.dg-data-row[data-row-index="${index}"]`);
        if (tr) {
            this._setRowExpanded(/** @type {HTMLTableRowElement} */ (tr), this.grid.rows[index], index, expanded, true);
        }
    }

    /** @param {Number} rowIndex */
    _detailId(rowIndex) {
        return `dg-row-detail-${this.grid.id}-${rowIndex}`;
    }

    /** @param {import("../data-grid.js").CellContext} ctx @returns {HTMLButtonElement} */
    createToggle({ row = {}, rowIndex = 0 }) {
        const key = this.grid.resolveRowKey(row, rowIndex);
        const expanded = this.isExpanded(key);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dg-clickable-cell ${DETAILS_CLASS}-toggle-control`;
        button.setAttribute("aria-controls", this._detailId(rowIndex));
        this._syncToggle(button, row, rowIndex, expanded);
        button.innerHTML += `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            this.toggle(key);
        });
        return button;
    }

    /** @param {HTMLButtonElement} button @param {Record<string, any>} row @param {Number} rowIndex @param {Boolean} expanded */
    _syncToggle(button, row, rowIndex, expanded) {
        button.setAttribute("aria-expanded", String(expanded));
        button.setAttribute(
            "aria-label",
            this.grid.formatLabel(expanded ? this.grid.labels.hideDetails : this.grid.labels.showDetails, {
                row: this.grid.getRowLabel(row, rowIndex),
            }),
        );
        button.classList.toggle(`${DETAILS_CLASS}-toggle-control-open`, expanded);
    }

    /**
     * @param {HTMLTableRowElement} tr
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {Boolean} expanded
     * @param {Boolean} emit
     */
    _setRowExpanded(tr, row, rowIndex, expanded, emit) {
        const key = this.grid.resolveRowKey(row, rowIndex);
        const button = /** @type {HTMLButtonElement|null} */ (tr.querySelector(`.${DETAILS_CLASS}-toggle-control`));
        if (button) {
            this._syncToggle(button, row, rowIndex, expanded);
        }
        const id = this._detailId(rowIndex);
        const current = document.getElementById(id);
        if (!expanded) {
            current?.remove();
        } else if (!current) {
            const renderer = this.grid.options.rowDetails;
            if (typeof renderer !== "function") {
                return;
            }
            const detailRow = document.createElement("tr");
            detailRow.id = id;
            detailRow.className = `${DETAILS_CLASS}-row`;
            const td = document.createElement("td");
            td.colSpan = Math.max(1, this.grid.columnsLength(true));
            applyContent(td, renderer({ row, rowKey: key, grid: this.grid }));
            detailRow.appendChild(td);

            const responsiveRow = tr.nextElementSibling?.classList.contains("dg-responsive-child-row")
                ? tr.nextElementSibling
                : null;
            const anchor = responsiveRow || tr;
            anchor.parentNode?.insertBefore(detailRow, anchor.nextSibling);
        }
        if (emit) {
            dispatch(this.grid, "rowDetailsToggle", { row, rowKey: key, expanded });
        }
    }

    /** @param {import("../core/base-plugin.js").RenderContext} context */
    afterRender(context) {
        if (context !== "body" || typeof this.grid.options.rowDetails !== "function") {
            return;
        }
        for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
            const rowIndex = Number.parseInt(/** @type {HTMLElement} */ (tr).dataset.rowIndex ?? "0", 10) || 0;
            const row = this.grid.rows[rowIndex];
            if (!row) {
                continue;
            }
            const key = this.grid.resolveRowKey(row, rowIndex);
            if (this.grid.options.rowDetailsStartOpen && !this.collapsed.has(key)) {
                this.expanded.add(key);
            }
            if (this.expanded.has(key)) {
                this._setRowExpanded(/** @type {HTMLTableRowElement} */ (tr), row, rowIndex, true, false);
            }
        }
    }

    updateLabels() {
        for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
            const rowIndex = Number.parseInt(/** @type {HTMLElement} */ (tr).dataset.rowIndex ?? "0", 10) || 0;
            const row = this.grid.rows[rowIndex];
            const button = /** @type {HTMLButtonElement|null} */ (tr.querySelector(`.${DETAILS_CLASS}-toggle-control`));
            if (row && button) {
                this._syncToggle(button, row, rowIndex, this.isExpanded(this.grid.resolveRowKey(row, rowIndex)));
            }
        }
    }
}

export default RowDetails;
