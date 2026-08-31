import BasePlugin from "../core/base-plugin.js";
import applyContent from "../utils/applyContent.js";
import { createDisclosureButton } from "../utils/disclosureButton.js";
import { dispatch } from "../utils/dispatch.js";
import { createSpanningRow } from "../utils/spanningRow.js";

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

    connected() {
        this.grid.addEventListener("click", this);
    }

    disconnected() {
        this.grid.removeEventListener("click", this);
    }

    /**
     * Delegate the expand/collapse toggle. The row is resolved from the DOM
     * (`data-row-index`) through the model (`grid.rows`), so the toggle keeps
     * working across body rerenders without re-attaching anything.
     * @param {MouseEvent} event
     */
    onclick(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        const button = target.closest(`.${DETAILS_CLASS}-toggle-control`);
        if (!button) {
            return;
        }
        event.stopPropagation();

        const tr = /** @type {HTMLTableRowElement|null} */ (button.closest("tr.dg-data-row"));
        if (!tr) {
            return;
        }
        const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "", 10);
        const row = this.grid.rows[rowIndex];
        if (!Number.isInteger(rowIndex) || !row) {
            return;
        }
        const key = this.grid.resolveRowKey(row, rowIndex);
        this.toggle(key);
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
            class: `dg-disclosure-cell ${DETAILS_CLASS}-toggle`,
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
        this.#change(rowKey, true);
    }

    /** @public @param {String} rowKey */
    collapse(rowKey) {
        this.#change(rowKey, false);
    }

    /** @public @param {String} rowKey */
    toggle(rowKey) {
        this.#change(rowKey, !this.isExpanded(rowKey));
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
    #change(rowKey, expanded) {
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
            this.#setRowExpanded(/** @type {HTMLTableRowElement} */ (tr), this.grid.rows[index], index, expanded, true);
        }
    }

    /** @param {Number} rowIndex */
    #detailId(rowIndex) {
        return `dg-row-detail-${this.grid.id}-${rowIndex}`;
    }

    /** @param {import("../data-grid.js").CellContext} ctx @returns {HTMLButtonElement} */
    createToggle({ row = {}, rowIndex = 0 }) {
        const key = this.grid.resolveRowKey(row, rowIndex);
        const expanded = this.isExpanded(key);
        const button = createDisclosureButton(`${DETAILS_CLASS}-toggle-control`);
        button.setAttribute("aria-controls", this.#detailId(rowIndex));
        this.#syncToggle(button, row, rowIndex, expanded);
        return button;
    }

    /** @param {HTMLButtonElement} button @param {Record<string, any>} row @param {Number} rowIndex @param {Boolean} expanded */
    #syncToggle(button, row, rowIndex, expanded) {
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
    #setRowExpanded(tr, row, rowIndex, expanded, emit) {
        const key = this.grid.resolveRowKey(row, rowIndex);
        const button = /** @type {HTMLButtonElement|null} */ (tr.querySelector(`.${DETAILS_CLASS}-toggle-control`));
        if (button) {
            this.#syncToggle(button, row, rowIndex, expanded);
        }

        // The toggle governs the whole expansion surface of the row, so a
        // responsive section that has no control of its own follows it. Told
        // before the detail row is inserted: the responsive child row then
        // already sits right after the data row, which is where it belongs.
        // The dependency is one way on purpose — revealing responsive values
        // is cheap, rendering application details is not.
        const responsive = /** @type {any} */ (this.grid.getPlugin("ResponsiveGrid"));
        if (typeof responsive?.followDisclosure === "function") {
            responsive.followDisclosure(tr, expanded);
        }

        const id = this.#detailId(rowIndex);
        const current = document.getElementById(id);
        if (!expanded) {
            current?.remove();
        } else if (!current) {
            const renderer = this.grid.options.rowDetails;
            if (typeof renderer !== "function") {
                return;
            }
            const { row: detailRow, cell: td } = createSpanningRow(this.grid, {
                id,
                className: `${DETAILS_CLASS}-row`,
            });
            applyContent(td, renderer({ row, rowKey: key, grid: this.grid }));

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
                this.#setRowExpanded(/** @type {HTMLTableRowElement} */ (tr), row, rowIndex, true, false);
            }
        }
    }

    updateLabels() {
        for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
            const rowIndex = Number.parseInt(/** @type {HTMLElement} */ (tr).dataset.rowIndex ?? "0", 10) || 0;
            const row = this.grid.rows[rowIndex];
            const button = /** @type {HTMLButtonElement|null} */ (tr.querySelector(`.${DETAILS_CLASS}-toggle-control`));
            if (row && button) {
                this.#syncToggle(button, row, rowIndex, this.isExpanded(this.grid.resolveRowKey(row, rowIndex)));
            }
        }
    }
}

export default RowDetails;
