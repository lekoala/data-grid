import BasePlugin from "../core/base-plugin.js";
import { getColumnMinWidth } from "../utils/columnWidth.js";
import { dispatch } from "../utils/dispatch.js";
import { off, on } from "../utils/events.js";

const RESIZE_EVENTS = ["pointerdown", "click"];

/**
 * Allows to resize columns
 */
class ColumnResizer extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {AbortController|null} */
        this._resizeController = null;
    }

    connected() {
        on(this.grid, RESIZE_EVENTS, this);
    }

    disconnected() {
        off(this.grid, RESIZE_EVENTS, this);
        this._resizeController?.abort();
        this._resizeController = null;
    }

    beforeRender() {
        if (!this.grid.options.resizable) {
            this._resizeController?.abort();
            this._resizeController = null;
        }
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table" || !this.grid.options.resizable) {
            return;
        }
        this.renderResizer(this.grid.labels.resizeColumn);
    }

    updateLabels() {
        const resizeLabel = this.grid.labels.resizeColumn;
        const resizers = this.grid.querySelectorAll(".dg-resizer");
        for (const resizer of resizers) {
            resizer.ariaLabel = resizeLabel;
        }
    }

    /**
     * @param {String} resizeLabel
     */
    renderResizer(resizeLabel) {
        const cols = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            this.grid.querySelectorAll("thead tr.dg-head-columns th")
        );

        for (const col of cols) {
            if (col.classList.contains("dg-not-resizable")) {
                continue;
            }
            // Create a resizer element
            const resizer = document.createElement("div");
            resizer.classList.add("dg-resizer");
            resizer.ariaLabel = resizeLabel;

            // Add a resizer element to the column
            col.appendChild(resizer);
        }
    }

    /**
     * @param {MouseEvent} event
     */
    onclick(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        // Otherwise it could sort the col
        if (target.closest(".dg-resizer")) {
            event.stopPropagation();
        }
    }

    /**
     * @param {PointerEvent} event
     */
    onpointerdown(event) {
        if (!this.grid.options.resizable) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        const resizer = /** @type {HTMLElement|null} */ (target.closest(".dg-resizer"));
        if (!resizer) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const grid = this.grid;
        const table = grid.table;
        const col = /** @type {HTMLTableCellElement|null} */ (resizer.closest("th"));
        if (!table || !col) {
            return;
        }

        const currentCols = /** @type {HTMLTableCellElement[]} */ ([
            ...grid.querySelectorAll("thead tr.dg-head-columns th"),
        ]);
        const visibleCols = currentCols.filter((col) => {
            return !col.hasAttribute("hidden");
        });
        // biome-ignore lint/complexity/useIndexOf: indexOf requires an Element arg; closest returns a broader Node
        const columnIndex = visibleCols.findIndex((col) => col === resizer.parentNode);
        grid.log("resize column");

        resizer.classList.add("dg-resizer-active");

        // Make sure we don't drag it
        col.removeAttribute("draggable");

        // Allow overflow when resizing
        col.style.overflow = "visible";

        // Show full column height (-1 to avoid scrollbar)
        resizer.style.height = `${table.offsetHeight - 1}px`;

        // Register initial data
        const startX = event.clientX;
        const startW = col.offsetWidth;
        const minWidth = getColumnMinWidth(col);
        const resizeDirection = grid.options.dir === "rtl" ? -1 : 1;
        const initialWidths = visibleCols.map((cell) => cell.getAttribute("width"));
        const flexibleCols = new Set(
            visibleCols.filter((cell) => {
                const column = grid.getColumns().find((column) => grid.getColumnId(column) === cell.dataset.columnId);
                return !cell.classList.contains("dg-not-resizable") && !column?.virtual && !column?.width;
            }),
        );
        let reservedWidth = 0;
        for (let j = 0; j < visibleCols.length; j++) {
            if (j < columnIndex) {
                reservedWidth += visibleCols[j].offsetWidth;
            } else if (j > columnIndex) {
                reservedWidth += flexibleCols.has(visibleCols[j])
                    ? getColumnMinWidth(visibleCols[j])
                    : visibleCols[j].offsetWidth;
            }
        }
        const viewportWidth = grid.scrollEl.clientWidth;
        const maxWidth =
            viewportWidth > 0 ? Math.max(minWidth, viewportWidth - reservedWidth) : Number.POSITIVE_INFINITY;

        // Only auto-sized columns may yield space; configured and user widths stay authoritative.
        col.setAttribute("width", String(startW));
        for (let j = 0; j < visibleCols.length; j++) {
            if (j > columnIndex && flexibleCols.has(visibleCols[j])) {
                visibleCols[j].removeAttribute("width");
            }
        }

        // Pointer capture retargets the move/up events to the handle, so the
        // gesture survives pointer slips and works for touch (with
        // `touch-action: none` in CSS) as well as mouse. Synthetic events
        // without a real pointer id throw: not fatal for the gesture.
        if (typeof resizer.setPointerCapture === "function") {
            try {
                resizer.setPointerCapture(event.pointerId);
            } catch {
                // No active pointer (e.g. synthetic test event): the gesture
                // still tracks through the listeners below.
            }
        }

        // Abort any previous resize gesture (e.g. a disconnect mid-drag)
        this._resizeController?.abort();
        this._resizeController = new AbortController();
        const { signal } = this._resizeController;

        const pointerMoveHandler = (/** @type {PointerEvent} */ e) => {
            const proposedWidth = startW + (e.clientX - startX) * resizeDirection;
            col.setAttribute("width", String(Math.max(minWidth, Math.min(maxWidth, proposedWidth))));
        };

        // When the gesture ends, remove the active state and listeners. A
        // commit writes the width back to the column model and notifies; a
        // cancellation (pointercancel) only releases the gesture.
        const pointerEndHandler = (/** @type {Boolean} */ commit) => () => {
            grid.log(commit ? "resized column" : "resize column cancelled");

            resizer.classList.remove("dg-resizer-active");
            if (grid.options.reorder) {
                col.draggable = true;
            }
            col.style.overflow = "hidden";

            this._resizeController?.abort();
            this._resizeController = null;

            if (!commit) {
                for (const [index, cell] of visibleCols.entries()) {
                    const width = initialWidths[index];
                    if (width === null) {
                        cell.removeAttribute("width");
                    } else {
                        cell.setAttribute("width", width);
                    }
                }
                grid.queueFrozenSync();
                return;
            }
            // Commit the user width back to the base column model so later
            // renders derive the DOM width from the definition; the rendered
            // <th> is otherwise the only place holding the resized value.
            const column = grid.options.columns.find((c) => grid.getColumnId(c) === col.getAttribute("data-column-id"));
            if (column) {
                const width = Number(col.getAttribute("width"));
                if (Number.isFinite(width)) {
                    column.width = width;
                }
            }

            dispatch(grid, "columnResized", {
                id: col.getAttribute("data-column-id"),
                col: col.getAttribute("field"),
                width: col.getAttribute("width"),
            });
        };

        resizer.addEventListener("pointermove", pointerMoveHandler, { signal });
        resizer.addEventListener("pointerup", pointerEndHandler(true), { signal, once: true });
        resizer.addEventListener("pointercancel", pointerEndHandler(false), { signal, once: true });
    }
}

export default ColumnResizer;
