import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import {
    addClass,
    ce,
    find,
    findAll,
    insertAfter,
    removeAttribute,
    removeClass,
    setAttribute,
} from "../utils/shortcuts.js";

const RESPONSIVE_CLASS = "dg-responsive";
const RESPONSIVE_TOGGLE_WIDTH = 40;
// Restore only when there is real headroom: avoids hide/show flapping when the
// width sits exactly on a priority threshold (grid geometry is 4px based).
const RESTORE_HYSTERESIS = 8;

/**
 * @param {Array<HTMLElement>} list
 * @returns {Array<HTMLElement>}
 */
function sortByPriority(list) {
    return list.sort((a, b) => {
        const v1 = Number.parseInt(a.dataset.responsive ?? "") || 1;
        const v2 = Number.parseInt(b.dataset.responsive ?? "") || 1;
        return v2 - v1;
    });
}

/**
 * Responsive data grid
 */
class ResponsiveGrid extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);

        this.observerBlocked = false;
        this.unblockTimeout = null;
        this._lastEntry = null;
        this._lastProcessedWidth = /** @type {Number|null} */ (null);
        this._scheduleResize = /** @type {() => void} */ (debounce(() => this.resize(), 100));
        this.observer = new ResizeObserver((entries) => {
            this._lastEntry = entries[entries.length - 1];
            this._scheduleResize();
        });
    }

    connected() {
        if (this.grid.options.responsive) {
            this.observe();
        }
    }

    disconnected() {
        this.unobserve();
        if (this.unblockTimeout) {
            clearTimeout(this.unblockTimeout);
        }
    }

    /**
     * @param {Boolean} enabled
     */
    responsiveChanged(enabled) {
        if (enabled) {
            this.observe();
        } else {
            this.unobserve();
        }
    }

    observe() {
        if (!this.grid.options.responsive) {
            return;
        }
        // The table viewport is the real horizontal constraint for responsive
        // columns. The grid no longer owns the scroll (the .dg-scroll wrapper
        // does), so no overflow/display mutation is needed.
        this._observed = this.grid.scrollEl || this.grid;
        this.observer.observe(this._observed);
    }

    unobserve() {
        if (this._observed) {
            this.observer.unobserve(this._observed);
            this._observed = null;
        }
    }

    /**
     * Inject the responsive toggle column. The column always exists when
     * responsive is active so the row structure stays stable during resize;
     * it is simply hidden until at least one column is responsiveHidden.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.grid.options.responsive || !this.grid.options.responsiveToggle) {
            return;
        }
        columns.unshift({
            id: "$responsive",
            virtual: true,
            position: "start",
            width: 40,
            sortable: false,
            title: "",
            class: `${RESPONSIVE_CLASS}-toggle`,
            hidden: !this.hasHiddenColumns(),
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: () => this.createFilterCell(),
            renderCell: () => this.createDataCell(),
        });
    }

    blockObserver() {
        this.observerBlocked = true;
        if (this.unblockTimeout) {
            clearTimeout(this.unblockTimeout);
        }
    }

    unblockObserver() {
        this.unblockTimeout = setTimeout(() => {
            this.observerBlocked = false;
            // Re-evaluate only when a genuinely new inlineSize arrived while the
            // observer was blocked; re-running for the same width is useless
            // (the state is idempotent for a given width).
            const entry = this._lastEntry;
            if (entry) {
                const size = Math.round(this._entryWidth(entry));
                if (size !== this._lastProcessedWidth) {
                    this.resize();
                }
            }
        }, 200); // more than debounce
    }

    /**
     * @param {ResizeObserverEntry} entry
     * @returns {Number}
     */
    _entryWidth(entry) {
        const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
        return Math.round(contentBoxSize?.inlineSize ?? entry.contentRect?.width ?? 0);
    }

    /**
     * @returns {Boolean}
     */
    hasHiddenColumns() {
        for (const col of this.grid.options.columns) {
            if (col.responsiveHidden) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add("dg-not-resizable", "dg-not-sortable");
    }

    createFilterCell() {}

    /**
     * @returns {HTMLElement}
     */
    createDataCell() {
        // Create icon
        const cell = document.createElement("div");
        cell.classList.add("dg-clickable-cell");
        cell.innerHTML = `<svg class='${RESPONSIVE_CLASS}-open' viewbox="0 0 24 24" height="24" width="24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
<svg class='${RESPONSIVE_CLASS}-close' viewbox="0 0 24 24" height="24" width="24" style="display:none">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;

        cell.addEventListener("click", this);
        cell.addEventListener("mousedown", this);

        return cell;
    }

    /**
     * Apply responsive hide/show based on the last observed size.
     */
    resize() {
        const grid = this.grid;
        const table = grid.table;
        const headerRow = grid.headerRow;
        if (this.observerBlocked) {
            return;
        }
        if (!table || !headerRow) {
            return;
        }
        const entry = this._lastEntry;
        if (!entry) {
            return;
        }
        // check inlineSize (width) and not blockSize (height)
        const size = this._entryWidth(entry);
        // The state is idempotent for a given width: skip duplicate evaluations
        // (ex: a resize that merely re-renders after a visibility change).
        if (size === this._lastProcessedWidth) {
            return;
        }
        this._lastProcessedWidth = size;

        // Preferred (ideal) width of each rendered header column, computed once
        // per cycle and cached in a map to avoid repeated getComputedStyle/layout
        // reads. Falls back to the CSS min-width (plugin columns such as actions
        // or selection only declare a min/width in CSS) and finally 0: a column
        // without a declared basis is a stretch column and must not feed its
        // layout-dependent offsetWidth back into the math (that oscillates).
        /** @type {Map<HTMLElement, Number>} */
        const widths = new Map();
        for (const th of findAll(headerRow, "th")) {
            const el = /** @type {HTMLElement} */ (th);
            widths.set(
                el,
                Number.parseInt(el.dataset.preferredWidth ?? "") ||
                    Number.parseInt(el.getAttribute("width") ?? "") ||
                    Number.parseInt(el.dataset.minWidth ?? "") ||
                    Number.parseInt(getComputedStyle(el).minWidth || "") ||
                    0,
            );
        }
        const preferredWidth = (/** @type {HTMLElement} */ th) => widths.get(th) ?? 0;

        // Hideable candidates: data columns only, responsive !== "0", not
        // manually hidden. Ordered most important last (priority order).
        const items = sortByPriority(
            findAll(headerRow, "th[field]")
                .reverse() // Order takes precedence if no priority is set
                .filter((th) => {
                    const column = grid.getCol(th.getAttribute("field") ?? "");
                    // Essential columns (never hidden) are excluded from the
                    // hideable candidates.
                    return column && this._isEssential(column) === false;
                }),
        ).map((th) => {
            return {
                th,
                column: /** @type {import("../data-grid.js").Column|null} */ (
                    grid.getCol(th.getAttribute("field") ?? "")
                ),
            };
        });

        const isColumnHidden = (/** @type {import("../data-grid.js").Column|null} */ column) => {
            return Boolean(column && (column.hidden || column.responsiveHidden));
        };

        // Virtual/fixed columns (selection, actions, ...) consume width without
        // being hideable. The responsive toggle column is excluded: it is
        // reserved separately below, only when columns are hidden.
        const fixedWidth = findAll(headerRow, "th:not([field])")
            .filter((th) => {
                return !th.classList.contains(`${RESPONSIVE_CLASS}-toggle`);
            })
            .reduce((result, th) => {
                return result + preferredWidth(/** @type {HTMLElement} */ (th));
            }, 0);
        const requiredWidth = (/** @type {Array<any>} */ visibleItems) => {
            let total = fixedWidth;
            if (grid.options.responsiveToggle && items.some(({ column }) => column?.responsiveHidden)) {
                total += RESPONSIVE_TOGGLE_WIDTH;
            }
            for (const { th } of visibleItems) {
                total += preferredWidth(th);
            }
            return total;
        };

        // All data columns that are currently rendered (including responsive: 0
        // columns, which never hide but still consume width).
        let visible = findAll(headerRow, "th[field]")
            .map((th) => {
                return {
                    th,
                    column: /** @type {import("../data-grid.js").Column|null} */ (
                        grid.getCol(th.getAttribute("field") ?? "")
                    ),
                };
            })
            .filter(({ column }) => !isColumnHidden(column));
        let changed = false;

        // The table is too wide: hide the next priority column until it fits.
        // Always keep at least one real data column.
        if (requiredWidth(visible) > size) {
            for (const item of items) {
                if (requiredWidth(visible) <= size) {
                    break;
                }
                if (visible.length <= 1) {
                    break;
                }
                const { column } = item;
                if (!column?.field || isColumnHidden(column)) {
                    continue;
                }
                grid.setColProp(column.field, "responsiveHidden", true);
                visible = visible.filter((c) => c.th !== item.th);
                changed = true;
            }
        } else {
            // Room is available: restore columns in reverse priority order while
            // they fit.
            const restorable = items.filter(({ column }) => column?.responsiveHidden).reverse();
            for (const { th, column } of restorable) {
                if (!column?.field) {
                    continue;
                }
                const width = preferredWidth(th);
                if (requiredWidth(visible) + width > size - RESTORE_HYSTERESIS) {
                    break;
                }
                grid.setColProp(column.field, "responsiveHidden", false);
                visible = [...visible, { th, column }];
                changed = true;
            }
        }

        if (changed) {
            this.blockObserver();
            this._rebuildDetails();
            this.unblockObserver();
        }

        // Footer compact state is independent of column changes.
        const footer = find(table, "tfoot");
        if (footer) {
            const realFooterWidth = findAll(footer, ".dg-footer > div").reduce((result, div) => {
                return result + div.offsetWidth;
            }, 0);
            const availableFooterWidth = footer.offsetWidth - realFooterWidth;
            if (realFooterWidth > size) {
                addClass(footer, "dg-footer-compact");
            } else if (availableFooterWidth > 250) {
                removeClass(footer, "dg-footer-compact");
            }
        }
        table.style.visibility = "visible";
    }

    computeLabelWidth() {
        let idealWidth = 0;
        const hCols = findAll(this.grid, ".dg-head-columns th");
        for (const hCol of hCols) {
            if (idealWidth >= 120) {
                break;
            }
            idealWidth += hCol.offsetWidth;
        }
        return idealWidth;
    }

    /**
     * @param {Event} ev
     */
    onmousedown(ev) {
        // Avoid selection through double click
        ev.preventDefault();
    }

    /**
     * The real rendered record rows (excludes responsive child rows and fake
     * empty/error rows).
     * @returns {HTMLTableRowElement[]}
     */
    _dataRows() {
        return /** @type {HTMLTableRowElement[]} */ (Array.from(this.grid.querySelectorAll("tbody > tr.dg-data-row")));
    }

    /**
     * A column is essential for the current view when it must never be hidden:
     * `responsive: 0`, an actively sorted column, an actively filtered column,
     * or one the author has manually hidden (already not rendered). Essential
     * columns are excluded from the hideable candidates.
     * @param {import("../data-grid.js").Column|null|undefined} column
     * @returns {Boolean}
     */
    _isEssential(column) {
        if (!column?.field) {
            return false;
        }
        if (column.responsive === 0 || column.hidden) {
            return true;
        }
        if (this.grid.getColumnSortDirection(column.field)) {
            return true;
        }
        if (this.grid._query?.filters?.[column.field]) {
            return true;
        }
        return false;
    }

    /**
     * Reorder a data row's direct cells to the canonical column order of
     * `grid.getColumns()`, so cells restored from a detail row never end up in
     * the wrong position.
     * @param {HTMLTableRowElement} tr
     */
    _canonicalizeRow(tr) {
        for (const column of this.grid.getColumns()) {
            if (column.attr) {
                continue;
            }
            const id = column.id ?? column.field;
            const td = tr.querySelector(`:scope > td[data-column-id="${id}"]`);
            if (td) {
                tr.appendChild(td);
            }
        }
    }

    /**
     * Reflect the expanded state on the toggle column icon (no-op when there is
     * no toggle column, i.e. `responsiveToggle: false`).
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    _setToggleIcon(tr, expanded) {
        const open = find(tr, `.${RESPONSIVE_CLASS}-open`);
        const close = find(tr, `.${RESPONSIVE_CLASS}-close`);
        if (!open || !close) {
            return;
        }
        open.style.display = expanded ? "none" : "unset";
        close.style.display = expanded ? "unset" : "none";
    }

    /**
     * Set a single row to the given expanded state. The row owns its state via
     * the `data-responsive-expanded` attribute: `"true"` open, `"false"`
     * collapsed, missing = undecided (seeded from `responsiveStartOpen`).
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    _setRowExpanded(tr, expanded) {
        tr.dataset.responsiveExpanded = String(expanded);

        const childRow = tr.nextElementSibling;
        const hasChildRow = childRow?.classList.contains(`${RESPONSIVE_CLASS}-child-row`);

        if (expanded) {
            if (hasChildRow) {
                return; // already open
            }
            const hiddenCols = findAll(tr, `.${RESPONSIVE_CLASS}-hidden`);
            if (!hiddenCols.length) {
                return;
            }
            this._canonicalizeRow(tr);
            addClass(tr, `${RESPONSIVE_CLASS}-expanded`);

            const detailRow = ce("tr");
            insertAfter(detailRow, tr);
            addClass(detailRow, `${RESPONSIVE_CLASS}-child-row`);

            const detailTd = ce("td", detailRow);
            setAttribute(detailTd, "colspan", this.grid.columnsLength(true));

            const childTable = ce("table", detailTd);
            addClass(childTable, `${RESPONSIVE_CLASS}-table`);

            const idealWidth = this.computeLabelWidth();
            for (const col of findAll(tr, `.${RESPONSIVE_CLASS}-hidden`)) {
                const childTableRow = ce("tr", childTable);
                const labelCol = ce("th", childTableRow);
                labelCol.style.width = `${idealWidth}px`;
                labelCol.textContent = col.dataset.name ?? "";
                childTableRow.appendChild(col);
                removeAttribute(col, "hidden");
            }

            this._setToggleIcon(tr, true);
            return;
        }

        // Collapse: move real cells back into the data row (canonical order)
        // and drop the wrapper.
        if (childRow && hasChildRow) {
            for (const col of findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`)) {
                tr.appendChild(col);
                setAttribute(col, "hidden");
            }
            childRow.remove();
            this._canonicalizeRow(tr);
        }
        removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
        this._setToggleIcon(tr, false);
    }

    /**
     * Normalize the table back to its canonical tabular representation: every
     * cell moved into a detail row is returned to its owning data row, in
     * column order, and the detail wrappers are removed. The row expansion
     * state attribute is left untouched.
     */
    _restoreDetails() {
        for (const childRow of findAll(this.grid, `tbody tr.${RESPONSIVE_CLASS}-child-row`)) {
            const tr = /** @type {HTMLTableRowElement} */ (childRow.previousElementSibling);
            if (tr) {
                for (const col of findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`)) {
                    tr.appendChild(col);
                    setAttribute(col, "hidden");
                }
                this._canonicalizeRow(tr);
                removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
            }
            childRow.remove();
        }
    }

    /**
     * Rebuild responsive detail rows from the canonical representation after
     * the hidden-column set changes. Rows that are open (or seeded open by
     * `responsiveStartOpen`) have their hidden values moved into a fresh detail
     * row; user-collapsed rows stay collapsed.
     */
    _rebuildDetails() {
        this._restoreDetails();
        this.grid._syncColumnVisibility();

        if (!this.hasHiddenColumns()) {
            return;
        }
        this._seedRows();
    }

    /**
     * Expand every data row whose (materialized) expansion state is open. Rows
     * with no state yet are seeded from `responsiveStartOpen`.
     */
    _seedRows() {
        for (const tr of this._dataRows()) {
            let expanded = tr.dataset.responsiveExpanded;
            if (expanded === undefined) {
                expanded = String(this.grid.options.responsiveStartOpen);
                tr.dataset.responsiveExpanded = expanded;
            }
            if (expanded === "true") {
                this._setRowExpanded(tr, true);
            }
        }
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        // A body render recreates the rows (filter/search/page change) and
        // drops any existing detail rows, so start-open details must be
        // re-applied here. No-op unless start-open is active with hidden
        // columns, keeping the default collapsed behavior untouched.
        if (context !== "body") {
            return;
        }
        if (!this.grid.options.responsiveStartOpen || !this.hasHiddenColumns()) {
            return;
        }
        this._seedRows();
    }

    /**
     * @param {Event} ev
     */
    onclick(ev) {
        // Prevent expandable
        ev.stopPropagation();

        const cell = /** @type {HTMLElement} */ (ev.currentTarget);
        const tr = cell.closest("tr");
        if (!tr) {
            return;
        }
        const open = find(cell, `.${RESPONSIVE_CLASS}-open`);
        const close = find(cell, `.${RESPONSIVE_CLASS}-close`);
        if (!open || !close) {
            return;
        }

        this.blockObserver();
        this._setRowExpanded(tr, tr.dataset.responsiveExpanded !== "true");
        this.unblockObserver();
    }
}

export default ResponsiveGrid;
