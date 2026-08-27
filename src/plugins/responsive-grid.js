import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import { createDisclosureButton } from "../utils/disclosureButton.js";
import { createSpanningRow } from "../utils/spanningRow.js";

/** @typedef {{ th: HTMLElement, column: import("../data-grid.js").Column|null }} ResponsiveItem */
/**
 * @typedef ResponsiveLayout
 * @property {ResponsiveItem[]} items
 * @property {ResponsiveItem[]} visible
 * @property {(th: HTMLElement) => Number} preferredWidth
 * @property {(visibleItems: ResponsiveItem[]) => Number} requiredWidth
 * @property {(column: import("../data-grid.js").Column|null) => Boolean} isColumnHidden
 */

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
        if (!this.grid.options.responsive || !this.grid.options.responsiveToggle || this._sharesDisclosure()) {
            return;
        }
        columns.unshift({
            id: "$responsive",
            virtual: true,
            position: "start",
            frozen: "start",
            width: 40,
            sortable: false,
            title: "",
            class: `dg-disclosure-cell ${RESPONSIVE_CLASS}-toggle`,
            hidden: !this.hasHiddenColumns(),
            renderHeaderCell: (th) => th.classList.add("dg-not-resizable", "dg-not-sortable"),
            renderFilterCell: () => {},
            renderCell: (ctx) => this.createDataCell(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
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
        return this.grid.options.columns.some((column) => column.responsiveHidden);
    }

    /**
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {HTMLButtonElement}
     */
    createDataCell({ row, rowIndex = 0 }) {
        const cell = createDisclosureButton(`${RESPONSIVE_CLASS}-toggle-control`);
        cell.setAttribute("aria-expanded", "false");
        cell.setAttribute("aria-controls", this._detailId(rowIndex));
        cell.setAttribute(
            "aria-label",
            this.grid.formatLabel(this.grid.labels.showHiddenColumns, {
                row: this.grid.getRowLabel(row ?? {}, rowIndex),
            }),
        );

        cell.addEventListener("click", this);

        return cell;
    }

    /** @param {Number} rowIndex */
    _detailId(rowIndex) {
        return `dg-responsive-detail-${this.grid.id}-${rowIndex}`;
    }

    /**
     * Apply responsive hide/show based on the last observed size.
     */
    resize() {
        const size = this._resizeWidth();
        if (size === null) {
            return;
        }
        const table = this.grid.table;
        if (!table) {
            return;
        }
        const layout = this._measureLayout();
        if (!layout) {
            return;
        }
        const changed = this._fitColumns(layout, size);
        if (changed) {
            this._rebuildDetailsSafely();
        }
        this._syncFooter(size);
        table.style.visibility = "visible";
    }

    /**
     * Resolve a new observed width worth processing.
     * @returns {Number|null}
     */
    _resizeWidth() {
        if (this.observerBlocked) {
            return null;
        }
        if (!this.grid.table || !this.grid.headerRow) {
            return null;
        }
        const entry = this._lastEntry;
        if (!entry) {
            return null;
        }
        // check inlineSize (width) and not blockSize (height)
        const size = this._entryWidth(entry);
        // The state is idempotent for a given width: skip duplicate evaluations
        // (ex: a resize that merely re-renders after a visibility change).
        if (size === this._lastProcessedWidth) {
            return null;
        }
        this._lastProcessedWidth = size;
        return size;
    }

    /**
     * Read the current column geometry once for a responsive fitting cycle.
     * @returns {ResponsiveLayout|null}
     */
    _measureLayout() {
        const grid = this.grid;
        const headerRow = grid.headerRow;
        if (!headerRow) {
            return null;
        }

        // Preferred (ideal) width of each rendered header column, computed once
        // per cycle and cached in a map to avoid repeated getComputedStyle/layout
        // reads. Falls back to the CSS min-width (plugin columns such as actions
        // or selection only declare a min/width in CSS) and finally 0: a column
        // without a declared basis is a stretch column and must not feed its
        // layout-dependent offsetWidth back into the math (that oscillates).
        /** @type {Map<HTMLElement, Number>} */
        const widths = new Map();
        for (const th of headerRow.querySelectorAll("th")) {
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
        const items = /** @type {ResponsiveItem[]} */ (
            sortByPriority(
                /** @type {HTMLElement[]} */ ([...headerRow.querySelectorAll("th[field]")])
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
            })
        );

        const isColumnHidden = (/** @type {import("../data-grid.js").Column|null} */ column) => {
            return Boolean(column && (column.hidden || column.responsiveHidden));
        };

        // Virtual/fixed columns (selection, actions, ...) consume width without
        // being hideable. The responsive toggle column is excluded: it is
        // reserved separately below, only when columns are hidden.
        const fixedWidth = [...headerRow.querySelectorAll("th:not([field])")]
            .filter((th) => {
                return !th.classList.contains(`${RESPONSIVE_CLASS}-toggle`);
            })
            .reduce((result, th) => {
                return result + preferredWidth(/** @type {HTMLElement} */ (th));
            }, 0);
        const requiredWidth = (/** @type {ResponsiveItem[]} */ visibleItems) => {
            let total = fixedWidth;
            if (
                grid.options.responsiveToggle &&
                !this._sharesDisclosure() &&
                items.some(({ column }) => column?.responsiveHidden)
            ) {
                total += RESPONSIVE_TOGGLE_WIDTH;
            }
            for (const { th } of visibleItems) {
                total += preferredWidth(th);
            }
            return total;
        };

        // All data columns that are currently rendered (including responsive: 0
        // columns, which never hide but still consume width).
        const visible = /** @type {ResponsiveItem[]} */ (
            [...headerRow.querySelectorAll("th[field]")]
                .map((th) => {
                    return {
                        th,
                        column: /** @type {import("../data-grid.js").Column|null} */ (
                            grid.getCol(th.getAttribute("field") ?? "")
                        ),
                    };
                })
                .filter(({ column }) => !isColumnHidden(column))
        );

        return { items, visible, preferredWidth, requiredWidth, isColumnHidden };
    }

    /**
     * Hide or restore responsive columns until the measured layout fits.
     * @param {ResponsiveLayout} layout
     * @param {Number} size
     * @returns {Boolean}
     */
    _fitColumns({ items, visible: initialVisible, preferredWidth, requiredWidth, isColumnHidden }, size) {
        const grid = this.grid;
        let visible = initialVisible;
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

        return changed;
    }

    /** @param {Number} size */
    _syncFooter(size) {
        // Footer compact state is independent of column changes.
        const table = this.grid.table;
        if (!table) {
            return;
        }
        const footer = table.querySelector("tfoot");
        if (footer) {
            const realFooterWidth = /** @type {HTMLElement[]} */ ([
                ...footer.querySelectorAll(".dg-footer > div"),
            ]).reduce((result, div) => {
                return result + div.offsetWidth;
            }, 0);
            const availableFooterWidth = footer.offsetWidth - realFooterWidth;
            if (realFooterWidth > size) {
                footer.classList.add("dg-footer-compact");
            } else if (availableFooterWidth > 250) {
                footer.classList.remove("dg-footer-compact");
            }
        }
    }

    _rebuildDetailsSafely() {
        this.blockObserver();
        this._rebuildDetails();
        this.unblockObserver();
    }

    computeLabelWidth() {
        let idealWidth = 0;
        const hCols = /** @type {NodeListOf<HTMLElement>} */ (this.grid.querySelectorAll(".dg-head-columns th"));
        for (const hCol of hCols) {
            if (idealWidth >= 120) {
                break;
            }
            idealWidth += hCol.offsetWidth;
        }
        return idealWidth;
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
        if (column.responsive === 0 || column.hidden || column.frozen === "start") {
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
     * the wrong position. Only cells that are actually out of order move:
     * re-inserting an already well placed cell would blur a control the user
     * is operating from the keyboard (the toggle itself, typically).
     * @param {HTMLTableRowElement} tr
     */
    _canonicalizeRow(tr) {
        /** @type {Element|null} */
        let previous = null;
        for (const column of this.grid.getColumns()) {
            if (column.attr) {
                continue;
            }
            const id = this.grid.getColumnId(column);
            const td = tr.querySelector(`:scope > td[data-column-id="${id}"]`);
            if (!td) {
                continue;
            }
            const expected = /** @type {Element|null} */ (
                previous ? previous.nextElementSibling : tr.firstElementChild
            );
            if (td !== expected) {
                tr.insertBefore(td, expected);
            }
            previous = td;
        }
    }

    /**
     * True when the row details column already provides a disclosure control
     * for every row: responsive then yields, rather than rendering a second
     * identical chevron next to it, and follows that control instead.
     *
     * Both facts are required: the option carries the intent, the plugin does
     * the rendering. If either is missing (ex: a non standard registration
     * name), responsive keeps its own toggle — the safe fallback is a visible
     * control, never hidden values with no way to reach them.
     * @returns {Boolean}
     */
    _sharesDisclosure() {
        return (
            Boolean(this.grid.options.responsiveToggle) &&
            typeof this.grid.options.rowDetails === "function" &&
            Boolean(this.grid.getPlugin("RowDetails"))
        );
    }

    /**
     * Follow the shared disclosure control: the row details toggle governs the
     * whole expansion surface of its row, responsive values included. No-op
     * unless responsive has yielded its own toggle, so an explicit
     * `responsiveToggle: false` keeps its section governed by
     * `responsiveStartOpen` alone.
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    followDisclosure(tr, expanded) {
        if (!this._sharesDisclosure()) {
            return;
        }
        this.blockObserver();
        this._setRowExpanded(tr, expanded);
        this.unblockObserver();
    }

    /**
     * Reflect the expanded state on the toggle column icon (no-op when there is
     * no toggle column, i.e. `responsiveToggle: false`).
     * @param {HTMLTableRowElement} tr
     * @param {Boolean} expanded
     */
    _setToggleIcon(tr, expanded) {
        const control = tr.querySelector(`.${RESPONSIVE_CLASS}-toggle-control`);
        const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
        const row = this.grid.rows[rowIndex] ?? {};
        if (control) {
            control.setAttribute("aria-expanded", String(expanded));
            control.setAttribute(
                "aria-label",
                this.grid.formatLabel(
                    expanded ? this.grid.labels.hideHiddenColumns : this.grid.labels.showHiddenColumns,
                    {
                        row: this.grid.getRowLabel(row, rowIndex),
                    },
                ),
            );
            control.classList.toggle(`${RESPONSIVE_CLASS}-toggle-control-open`, expanded);
        }
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
            const hiddenCols = tr.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`);
            if (!hiddenCols.length) {
                return;
            }
            this._canonicalizeRow(tr);
            tr.classList.add(`${RESPONSIVE_CLASS}-expanded`);

            const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
            const { row: detailRow, cell: detailTd } = createSpanningRow(this.grid, {
                id: this._detailId(rowIndex),
                className: `${RESPONSIVE_CLASS}-child-row`,
            });
            tr.after(detailRow);

            const childTable = document.createElement("table");
            detailTd.appendChild(childTable);
            childTable.classList.add(`${RESPONSIVE_CLASS}-table`);

            const idealWidth = this.computeLabelWidth();
            for (const col of /** @type {NodeListOf<HTMLElement>} */ (
                tr.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`)
            )) {
                const childTableRow = document.createElement("tr");
                const labelCol = document.createElement("th");
                labelCol.style.width = `${idealWidth}px`;
                labelCol.textContent = col.dataset.name ?? "";
                childTableRow.append(labelCol, col);
                childTable.appendChild(childTableRow);
                col.removeAttribute("hidden");
            }

            this._setToggleIcon(tr, true);
            return;
        }

        // Collapse: move real cells back into the data row (canonical order)
        // and drop the wrapper.
        if (childRow && hasChildRow) {
            this._restoreChildRow(tr, /** @type {HTMLTableRowElement} */ (childRow));
        }
        tr.classList.remove(`${RESPONSIVE_CLASS}-expanded`);
        this._setToggleIcon(tr, false);
    }

    /**
     * Return cells from a responsive detail row to their owning data row.
     * @param {HTMLTableRowElement} tr
     * @param {HTMLTableRowElement} childRow
     */
    _restoreChildRow(tr, childRow) {
        for (const col of childRow.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`)) {
            tr.appendChild(col);
            col.setAttribute("hidden", "");
        }
        childRow.remove();
        this._canonicalizeRow(tr);
    }

    /**
     * Normalize the table back to its canonical tabular representation: every
     * cell moved into a detail row is returned to its owning data row, in
     * column order, and the detail wrappers are removed. The row expansion
     * state attribute is left untouched.
     */
    _restoreDetails() {
        for (const childRow of this.grid.querySelectorAll(`tbody tr.${RESPONSIVE_CLASS}-child-row`)) {
            const tr = /** @type {HTMLTableRowElement} */ (childRow.previousElementSibling);
            if (tr) {
                this._restoreChildRow(tr, /** @type {HTMLTableRowElement} */ (childRow));
                tr.classList.remove(`${RESPONSIVE_CLASS}-expanded`);
            } else {
                childRow.remove();
            }
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

    updateLabels() {
        for (const tr of this._dataRows()) {
            this._setToggleIcon(tr, tr.dataset.responsiveExpanded === "true");
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
        this.blockObserver();
        this._setRowExpanded(tr, tr.dataset.responsiveExpanded !== "true");
        this.unblockObserver();
    }
}

export default ResponsiveGrid;
