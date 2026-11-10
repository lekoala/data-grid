import BasePlugin from "../core/base-plugin.js";
import { resolveActionConfirmation } from "../utils/actionConfirm.js";
import { styleControl } from "../utils/controlClasses.js";
import { dispatch } from "../utils/dispatch.js";

/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
class BulkActions extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {HTMLDivElement|null} */
        this.bar = null;
        /** @type {HTMLSpanElement|null} */
        this.countEl = null;
        /** @type {HTMLSpanElement|null} */
        this.countVisible = null;
        /** @type {HTMLSpanElement|null} */
        this.countStatus = null;
        /** @type {HTMLButtonElement[]|null} */
        this.buttons = null;
        /** @type {HTMLDivElement|null} Floating display only: the sticky layer holding the bar. */
        this.layer = null;
        /** @type {ResizeObserver|null} */
        this.observer = null;
        /** @type {MutationObserver|null} Floating display only: follows load start and end. */
        this.loadingObserver = null;
        /** @type {HTMLButtonElement|null} Floating display only: extends a full page to every match. */
        this.matchingButton = null;
        /** @type {HTMLButtonElement|null} Floating display only. */
        this.clearButton = null;
        /** @type {HTMLInputElement|null} The row checkbox last toggled, the preferred focus return. */
        this.lastToggle = null;
        /** Rendered rows predate the current query until the next body render. */
        this.staleRows = false;
    }

    connected() {
        const grid = this.grid;
        const bulkActions = grid.options.bulkActions ?? [];
        if (!bulkActions.length) {
            return;
        }

        // Build the toolbar once: only its state changes. Keeping the DOM stable
        // avoids layout shifts and focus loss.
        const bar = document.createElement("div");
        bar.className = "dg-bulk-actions";
        this.bar = bar;

        this.countEl = document.createElement("span");
        this.countEl.className = "dg-selection-count";
        this.countEl.setAttribute("role", "status");
        this.countEl.setAttribute("aria-live", "polite");
        this.countEl.setAttribute("aria-atomic", "true");
        this.countEl.hidden = true;
        this.countVisible = document.createElement("span");
        this.countVisible.setAttribute("aria-hidden", "true");
        this.countStatus = document.createElement("span");
        this.countStatus.className = "dg-visually-hidden";
        this.countEl.append(this.countVisible, this.countStatus);
        bar.appendChild(this.countEl);

        this.buttons = [];
        for (const action of bulkActions) {
            const button = document.createElement("button");
            button.type = "button";
            styleControl(grid, button, "button", action.class);
            button.dataset.action = action.name;
            if (action.intent) {
                button.dataset.intent = action.intent;
            }
            button.textContent = action.label ?? action.name;
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                if (button.disabled) {
                    return;
                }
                const selection = grid.getSelectionState();
                const message = resolveActionConfirmation(action.confirm, grid.labels.areYouSure, selection, {
                    grid,
                    action,
                });
                if (message !== null && !window.confirm(message)) {
                    return;
                }
                dispatch(grid, "bulkAction", {
                    action,
                    name: action.name,
                    selection,
                    query: grid.query,
                    trigger: button,
                });
            });
            bar.appendChild(button);
            this.buttons.push(button);
        }

        const frame = grid.querySelector(":scope > .dg-frame");
        if (grid.options.bulkActionsDisplay !== "inline" && frame) {
            this.#mountFloating(frame, bar);
        } else if (grid.querySelector("table")) {
            // ensureTopbar() guarantees the canonical start/end structure.
            const start = /** @type {HTMLDivElement} */ (
                grid.ensureTopbar().querySelector(":scope > .dg-topbar-start")
            );
            start.appendChild(bar);
        } else {
            grid.appendChild(bar);
        }
        grid.addEventListener("selectionChange", this);
        this.render();
    }

    disconnected() {
        this.grid.removeEventListener("selectionChange", this);
        this.grid.removeEventListener("change", this);
        this.grid.removeEventListener("querychange", this);
        this.lastToggle = null;
        this.staleRows = false;
        this.observer?.disconnect();
        this.observer = null;
        this.loadingObserver?.disconnect();
        this.loadingObserver = null;
        this.grid.scrollEl?.style.removeProperty("padding-bottom");
        const frame = /** @type {HTMLElement|null} */ (this.grid.querySelector(":scope > .dg-frame"));
        frame?.style.removeProperty("margin-bottom");
        this.grid.classList.remove("dg-bulk-floating");
        this.layer?.remove();
        this.layer = null;
        this.bar?.remove();
    }

    /**
     * Floating display: the bar lives in a sticky layer that shares the frame's
     * grid cell, so it takes no room in the host layout while the frame keeps
     * clipping its own content. The layer follows the nearest scrolling
     * ancestor, and sticky containment keeps the whole bar inside the grid.
     * @param {Element} frame
     * @param {HTMLDivElement} bar
     */
    #mountFloating(frame, bar) {
        const grid = this.grid;
        const layer = document.createElement("div");
        layer.className = "dg-bulk-layer";
        layer.hidden = true;
        bar.setAttribute("role", "group");

        // count [select all matching] | actions | clear
        const matching = document.createElement("button");
        matching.type = "button";
        matching.className = "dg-select-matching";
        matching.hidden = true;
        matching.addEventListener("click", (event) => {
            event.stopPropagation();
            // The prompt disappears once everything matches: keep focus in the bar.
            this.buttons?.find((button) => !button.disabled)?.focus();
            grid.selectAllMatching();
        });
        this.countEl?.after(matching, separator());
        this.matchingButton = matching;

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "dg-clear-selection";
        clear.addEventListener("click", (event) => {
            event.stopPropagation();
            grid.clearSelection();
        });
        bar.append(separator(), clear);
        this.clearButton = clear;

        bar.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                event.stopPropagation();
                grid.clearSelection();
            }
        });
        grid.addEventListener("change", this);
        grid.addEventListener("querychange", this);
        // The body renders while a load is still busy, and `loading` clears
        // after it: follow both edges so the prompt never keeps a stale state.
        this.loadingObserver = new MutationObserver(() => this.render());
        this.loadingObserver.observe(grid, { attributes: true, attributeFilter: ["data-loading"] });
        layer.appendChild(bar);
        frame.after(layer);
        this.grid.classList.add("dg-bulk-floating");
        this.layer = layer;
        const footer = this.grid.footerEl;
        this.observer = new ResizeObserver(() => this.#syncFloating());
        this.observer.observe(layer);
        if (footer) {
            this.observer.observe(footer);
        }
    }

    /**
     * Derived geometry, measured at use time. At rest, the bar docks on the
     * footer when its free middle can hold it, and rests below the frame
     * otherwise (no footer, or a footer too narrow): the grid never reserves
     * blank room under the last row.
     */
    #syncFloating() {
        const layer = this.layer;
        const bar = this.bar;
        const grid = this.grid;
        const frame = /** @type {HTMLElement|null} */ (grid.querySelector(":scope > .dg-frame"));
        const scroll = grid.scrollEl;
        if (!layer || !bar || !frame || !scroll) {
            return;
        }
        scroll.style.removeProperty("padding-bottom");
        frame.style.removeProperty("margin-bottom");
        if (layer.hidden) {
            layer.style.removeProperty("margin-bottom");
            return;
        }
        const barRect = bar.getBoundingClientRect();
        const frameBottom = frame.getBoundingClientRect().bottom;
        const footer = grid.footerEl;
        const footerRect = footer && !footer.hidden ? footer.getBoundingClientRect() : null;
        const gap = 12;
        if (footer && footerRect && this.#fitsFooter(footer, barRect, gap)) {
            // Lifted slightly off the footer edge so it still reads as floating.
            // Rising over the last row's padding is harmless; beyond it, the
            // rise is reserved so it never covers row content.
            const lift = 8;
            const rise = barRect.height + lift - footerRect.height;
            const cell = scroll.querySelector("tbody td");
            const room = cell ? Number.parseFloat(getComputedStyle(cell).paddingBottom) || 0 : 0;
            layer.style.setProperty("margin-bottom", `${frameBottom - footerRect.bottom + lift}px`);
            if (rise > room) {
                scroll.style.setProperty("padding-bottom", `${rise}px`);
            }
            return;
        }
        // No footer, or no room in it: rest below the frame. A frame margin
        // extends the shared cell, so the bar still floats while scrolling.
        layer.style.setProperty("margin-bottom", "0px");
        frame.style.setProperty("margin-bottom", `${barRect.height + 8}px`);
    }

    /**
     * Whether the centered bar overlaps no visible footer content.
     * @param {HTMLElement} footer
     * @param {DOMRect} barRect
     * @param {number} gap
     * @returns {boolean}
     */
    #fitsFooter(footer, barRect, gap) {
        const start = barRect.left - gap;
        const end = barRect.right + gap;
        for (const el of footer.querySelectorAll("*")) {
            const leaf =
                el.matches("button, input, select, textarea") ||
                [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            if (!leaf) {
                continue;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width && rect.right > start && rect.left < end) {
                return false;
            }
        }
        return true;
    }

    onselectionChange() {
        this.render();
    }

    onquerychange() {
        this.staleRows = true;
        this.render();
    }

    /**
     * Remember the row checkbox the user last toggled: when the bar hides, focus
     * returns there instead of jumping to the header.
     * @param {Event} event
     */
    onchange(event) {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.closest("tbody .dg-selectable")) {
            this.lastToggle = target;
        }
    }

    /**
     * A focus target still on screen, so focusing it never moves the page: the
     * last toggled row checkbox, then the header checkbox, and the scroll
     * viewport as the stable fallback (focused without scrolling). A target
     * must be fully visible in the window and in the scroll viewport, which
     * clips rows scrolled out of a fixed-height grid, and below the sticky
     * header for a body row.
     * @returns {HTMLElement|null}
     */
    #focusReturn() {
        const grid = this.grid;
        const scroll = grid.scrollEl?.getBoundingClientRect();
        const top = Math.max(0, scroll?.top ?? 0);
        const bottom = Math.min(window.innerHeight, scroll?.bottom ?? window.innerHeight);
        // Body rows scrolled under the sticky header are covered by it.
        const headerBottom = grid.querySelector("thead")?.getBoundingClientRect().bottom ?? top;
        for (const target of [this.lastToggle, grid.querySelector(".dg-select-all")]) {
            if (!(target instanceof HTMLElement) || !grid.contains(target) || target.matches(":disabled")) {
                continue;
            }
            const rect = target.getBoundingClientRect();
            const visibleTop = target.closest("tbody") ? Math.max(top, headerBottom) : top;
            if (rect.width && rect.top >= visibleTop && rect.bottom <= bottom) {
                return target;
            }
        }
        return grid.scrollEl;
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context === "body") {
            this.staleRows = false;
            this.render();
        }
    }

    updateLabels() {
        this.render();
    }

    /**
     * Reflect the current selection on the toolbar state.
     */
    render() {
        if (!this.bar || !this.countEl || !this.buttons?.length) {
            return;
        }
        const grid = this.grid;
        const labels = grid.labels;
        const selection = grid.getSelectionState();
        // An all-results selection remains actionable without COUNT(*).
        // Its size is unknown; only an explicitly empty selection is disabled.
        const count =
            selection.mode === "all"
                ? grid.total == null
                    ? null
                    : Math.max(0, grid.total - selection.except.size)
                : selection.ids.size;

        // Move focus out first: disabling the focused button would drop it.
        if (this.layer && count === 0 && this.bar.contains(document.activeElement)) {
            // Keep the reading position: never scroll the page to the target.
            this.#focusReturn()?.focus({ preventScroll: true });
        }
        for (const button of this.buttons) {
            button.disabled = count === 0;
        }
        if (!this.layer) {
            this.countEl.hidden = count === null || count === 0;
            if (this.countVisible && this.countStatus) {
                this.countVisible.textContent = count === null ? "" : `${count}`;
                this.countStatus.textContent = count === null ? "" : grid.formatLabel(labels.selectedCount, { count });
            }
            return;
        }

        this.countEl.hidden = false;
        if (this.countVisible && this.countStatus) {
            const allLabel = selection.except.size
                ? grid.formatLabel(labels.allSelectedExcept, { count: selection.except.size })
                : labels.allSelected;
            this.countVisible.textContent = count === null ? allLabel : `${count}`;
            this.countStatus.textContent =
                count === null ? allLabel : grid.formatLabel(labels.selectedCount, { count });
        }
        this.bar.setAttribute("aria-label", labels.selectionActions);
        if (this.clearButton) {
            this.clearButton.setAttribute("aria-label", labels.clearSelection);
            this.clearButton.title = labels.clearSelection;
        }
        if (this.matchingButton) {
            // Opt-in: offered once the whole current page is selected and more results
            // match. Rows still on screen during a load are stale: no prompt then.
            const rows = grid.rows;
            const pageSelected =
                grid.options.selectMatching &&
                !this.staleRows &&
                !grid.loading &&
                selection.mode !== "all" &&
                !grid.options.singleSelect &&
                rows.length > 0 &&
                rows.every((row, index) => grid.isRowSelected(row, index));
            const more = grid.total == null || grid.total > selection.ids.size;
            this.matchingButton.hidden = !(pageSelected && more);
            this.matchingButton.textContent =
                grid.total == null
                    ? labels.selectAllMatching
                    : grid.formatLabel(labels.selectAllResults, { total: grid.total });
        }

        this.layer.hidden = count === 0;
        this.#syncFloating();
    }
}

/**
 * A purely visual divider between the bar's groups.
 * @returns {HTMLSpanElement}
 */
function separator() {
    const span = document.createElement("span");
    span.className = "dg-bulk-separator";
    span.setAttribute("aria-hidden", "true");
    return span;
}

export default BulkActions;
