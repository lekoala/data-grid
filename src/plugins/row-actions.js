import BasePlugin from "../core/base-plugin.js";
import { resolveActionConfirmation } from "../utils/actionConfirm.js";
import applyContent from "../utils/applyContent.js";
import { styleControl } from "../utils/controlClasses.js";
import { dispatch } from "../utils/dispatch.js";
import interpolate from "../utils/interpolate.js";
import { supportsPopover } from "../utils/popover.js";
import { attachPopoverPositioning } from "../utils/positionPopover.js";
import randstr from "../utils/randstr.js";
import { isSafeUrl } from "../utils/safeUrl.js";

const COLLAPSED_ACTIONS_WIDTH = 48;
const INLINE_ACTION_WIDTH = 64;
const INLINE_ACTION_GAP = 4;
const ACTIONS_CELL_PADDING = 16;

/**
 * Keep ordinary relative and application URLs while preventing href values
 * that execute attacker-controlled code when activated.
 * @param {*} value
 * @returns {String|null}
 */
function normalizeActionHref(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return isSafeUrl(value) ? String(value) : null;
}

/**
 * Stable sizing heuristic for inline action controls: cell padding, one
 * compact control width per action, and the gap between controls.
 * @param {Number} count
 * @returns {Number}
 */
function inlineActionsWidth(count) {
    if (count <= 0) {
        return COLLAPSED_ACTIONS_WIDTH;
    }
    return ACTIONS_CELL_PADDING + count * INLINE_ACTION_WIDTH + (count - 1) * INLINE_ACTION_GAP;
}

/**
 * Add actions on rows
 */
class RowActions extends BasePlugin {
    /** @type {ResizeObserver} */
    #widthObserver;
    /** @type {Number|null} */
    #widthFrame;
    /** @type {WeakMap<HTMLTableRowElement, Object|undefined>} */
    #renderedDefinitions;

    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        this.#renderedDefinitions = new WeakMap();
        this.#widthFrame = null;
        this.#widthObserver = new ResizeObserver(() => this.#queueWidthSync());
        /** @type {HTMLUListElement|null} */
        this.menu = null;
        /** @type {HTMLElement|null} */
        this.activeInvoker = null;
        /** @type {Boolean} */
        this._keyboardOpen = false;
    }

    connected() {
        if (!supportsPopover()) {
            return;
        }
        const menu = this.grid.ownerDocument.createElement("ul");
        menu.id = randstr("dg-actions-menu-");
        menu.className = "dg-menu dg-actions-menu";
        menu.popover = "auto";
        menu.addEventListener("toggle", this);
        this.grid.appendChild(menu);
        this.menu = menu;
        this.grid.addEventListener("click", this);
        attachPopoverPositioning(this.grid, { selector: ".dg-actions-menu", placement: "bottom-end" });
    }

    disconnected() {
        this.#widthObserver.disconnect();
        if (this.#widthFrame !== null) {
            cancelAnimationFrame(this.#widthFrame);
            this.#widthFrame = null;
        }
        this.grid.removeEventListener("click", this);
        this.menu?.removeEventListener("toggle", this);
        this.menu?.remove();
        this.menu = null;
        this.activeInvoker = null;
        this._keyboardOpen = false;
    }

    /**
     * Delegate the collapsed actions popover toggle. The row is resolved from
     * the DOM (`data-row-index`) through the model (`grid.rows`), so the
     * toggle keeps working across body rerenders without re-attaching
     * anything. The toggle is memorized as `activeInvoker` so focus can move
     * into the shared popover on keyboard opening and back on activation.
     * @param {MouseEvent} event
     */
    onclick(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        const toggle = target.closest(".dg-actions-toggle");
        if (!toggle) {
            return;
        }
        const tr = /** @type {HTMLTableRowElement|null} */ (toggle.closest("tr.dg-data-row"));
        if (!tr) {
            return;
        }
        const rowIndex = Number(tr.dataset.rowIndex);
        const row = this.grid.rows[rowIndex];
        if (!row) {
            return;
        }
        this.activeInvoker = /** @type {HTMLElement} */ (toggle);
        // A keyboard-activated click reports detail 0; a mouse click reports
        // the click count. Only a keyboard opening moves focus into the
        // popover — a mouse opening keeps focus on the invoker.
        this._keyboardOpen = event.detail === 0;
        this.renderActionMenu(row, rowIndex);
    }

    /**
     * Focus handoff for the shared collapsed actions popover: an ordinary
     * action list popover, not an ARIA menu (no roving tabindex, arrows or
     * typeahead — Tab / Shift+Tab / Enter / Space / Escape are enough).
     * @param {Event & { newState?: "open" | "closed" }} event
     */
    ontoggle(event) {
        const menu = this.menu;
        if (!menu || event.target !== menu) {
            return;
        }
        if (event.newState === "open") {
            if (this._keyboardOpen) {
                this._keyboardOpen = false;
                this.#focusFirstAction();
            }
            return;
        }
        if (event.newState === "closed") {
            this._keyboardOpen = false;
            const invoker = this.activeInvoker;
            this.activeInvoker = null;
            // The native popover restores focus to the invoker on Escape and
            // light dismissal. Only repair the focus when the browser left it
            // nowhere (typically body) and the invoker is still connected.
            const active = this.grid.ownerDocument.activeElement;
            if (invoker?.isConnected && (active === null || active === this.grid.ownerDocument.body)) {
                invoker.focus();
            }
        }
    }

    /**
     * Move focus to the first enabled action of the popover, skipping
     * disabled buttons and disabled links.
     */
    #focusFirstAction() {
        const menu = this.menu;
        if (!menu) {
            return;
        }
        const candidates = menu.querySelectorAll("button, a[href]");
        for (const candidate of candidates) {
            if (candidate instanceof HTMLButtonElement && candidate.disabled) {
                continue;
            }
            if (candidate.getAttribute("aria-disabled") === "true") {
                continue;
            }
            if (candidate instanceof HTMLElement) {
                candidate.focus();
                return;
            }
        }
    }

    /**
     * Whether the actions column is active: static `options.actions`, the
     * `rowActions` capability or a declarative `<th data-actions>`.
     * @returns {Boolean}
     */
    hasActions() {
        const grid = this.grid;
        return grid.options.actions.length > 0 || grid.options.rowActions;
    }

    /**
     * Inject the actions column at the end.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.hasActions()) {
            return;
        }
        columns.push({
            id: "$actions",
            virtual: true,
            position: "end",
            align: "end",
            sortable: false,
            title: "",
            width: COLLAPSED_ACTIONS_WIDTH,
            minWidth: COLLAPSED_ACTIONS_WIDTH,
            class: "dg-actions",
            renderHeaderCell: (th) => th.classList.add("dg-not-sortable", "dg-not-resizable"),
            renderFilterCell: () => {},
            renderCell: (ctx) => this.makeActionRow(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
        });
    }

    /**
     * Resolve the actions visible for one row with one consistent context.
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @returns {import("../data-grid.js").Action[]}
     */
    #visibleActions(row, rowIndex) {
        const grid = this.grid;
        const rowKey = grid.resolveRowKey(row, rowIndex);
        return grid
            .getActionsForRow(row)
            .filter((action) => !action.visible || action.visible(row, { grid, action, rowKey }));
    }

    updateLabels() {
        const toggleLabel = this.grid.labels.toggleActions;
        const toggles = this.grid.querySelectorAll(".dg-actions-toggle");
        for (const toggle of toggles) {
            toggle.setAttribute("aria-label", toggleLabel);
            toggle.setAttribute("title", toggleLabel);
        }
    }

    beforeRender() {
        this.menu?.hidePopover?.();
    }

    afterRender() {
        // The actions column mode depends on the actions resolved in the body,
        // which is only known after the rows render. The header is created on a
        // separate render pass (renderTable), so the mode must be applied on
        // both passes: body cells and the header/filter must share it.
        this.#widthObserver.disconnect();
        if (!this.hasActions()) {
            return;
        }
        // Progressive chunks replace grid-wide metadata. Refresh only old
        // server-driven action cells; editors and other row content survive.
        const grid = this.grid;
        const column = grid.getColumnById("$actions");
        if (column) {
            for (const cell of this.#bodyCells() ?? []) {
                const tr = /** @type {HTMLTableRowElement} */ (cell.parentElement);
                const rowIndex = Number(tr.dataset.rowIndex);
                const row = grid.rows[rowIndex];
                if (row?.$actions === undefined || this.#renderedDefinitions.get(tr) === grid.meta?.actions) {
                    continue;
                }
                if (grid.options.rowClick === "action") {
                    tr.classList.remove("dg-clickable-row");
                }
                cell.replaceChildren(this.makeActionRow({ grid, column, row, rowIndex, tr }));
            }
        }
        this.syncCellModes();
        // Observe controls rather than the fixed-width column: a host class or
        // font change can resize a button while the cell itself stays unchanged.
        for (const cell of this.#bodyCells() ?? []) {
            this.#widthObserver.observe(cell);
            for (const control of cell.children) {
                this.#widthObserver.observe(control, { box: "border-box" });
            }
        }
        this.#queueWidthSync();
    }

    /**
     * The collapsed vs inline mode is a property of the whole column, not of
     * individual cells: within one table column every row must share the same
     * geometry (header, filter and body cells alike), otherwise a fixed-layout
     * table constrains the column to one width while cells assume another,
     * creating artificial overflow.
     *
     * The mode derives from the widest set of inline actions on the current
     * page: if every row fits 1-2 inline actions the column sizes to its
     * intrinsic inline width, otherwise it collapses to the compact `more`
     * cell (the fixed structural width).
     */
    syncCellModes() {
        const grid = this.grid;
        const collapse = grid.options.collapseActions;
        let maxCount = 0;
        const rows = grid.rows ?? [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const count = this.#visibleActions(rows[rowIndex], rowIndex).length;
            if (count > maxCount) {
                maxCount = count;
            }
        }
        let mode = "dg-actions-inline";
        if (this.menu && (collapse || maxCount > 2)) {
            mode = "dg-actions-more";
        } else if (maxCount > 0 && maxCount <= 2) {
            mode = `dg-actions-${maxCount}`;
        }
        const width = mode === "dg-actions-more" ? COLLAPSED_ACTIONS_WIDTH : inlineActionsWidth(maxCount);
        const cells = grid.querySelectorAll('[data-column-id="$actions"]');
        for (const cell of cells) {
            cell.classList.remove("dg-actions-1", "dg-actions-2", "dg-actions-more", "dg-actions-inline");
            cell.classList.add(mode);
        }
        this.#setWidth(width);
    }

    /** @returns {NodeListOf<HTMLTableCellElement>|undefined} */
    #bodyCells() {
        return this.grid.tbody?.querySelectorAll(':scope > tr.dg-data-row > td[data-column-id="$actions"]');
    }

    /** Coalesce layout reads after rendering and host-control resizes. */
    #queueWidthSync() {
        if (this.#widthFrame !== null || !this.grid.isConnected) {
            return;
        }
        this.#widthFrame = requestAnimationFrame(() => {
            this.#widthFrame = null;
            this.#measureWidth();
        });
    }

    /** Measure the widest rendered action group, including the cell's edges. */
    #measureWidth() {
        const cells = [...(this.#bodyCells() ?? [])];
        const hasHostControls = cells.some((cell) =>
            [...cell.children].some((control) => !control.classList.contains("dg-skin")),
        );
        if (!hasHostControls) {
            this.syncCellModes();
            return;
        }
        let width = 0;
        for (const cell of cells) {
            if (!cell.getClientRects().length) {
                continue;
            }
            let contentWidth = 0;
            for (const control of cell.children) {
                const rect = control.getBoundingClientRect();
                if (!rect.width) {
                    continue;
                }
                const style = getComputedStyle(control);
                contentWidth +=
                    rect.width +
                    (Number.parseFloat(style.marginLeft) || 0) +
                    (Number.parseFloat(style.marginRight) || 0);
            }
            if (!contentWidth) {
                continue;
            }
            const style = getComputedStyle(cell);
            const edges = [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce(
                (sum, value) => sum + (Number.parseFloat(value) || 0),
                0,
            );
            width = Math.max(width, contentWidth + edges);
        }
        if (width) {
            this.#setWidth(Math.max(COLLAPSED_ACTIONS_WIDTH, Math.ceil(width)));
        }
    }

    /** Keep the model, header, filter and body on one column width. @param {Number} width */
    #setWidth(width) {
        const grid = this.grid;
        const column = grid.getColumnById("$actions");
        if (column) {
            column.width = width;
            column.minWidth = width;
        }
        let changed = false;
        for (const cell of /** @type {NodeListOf<HTMLTableCellElement>} */ (
            grid.querySelectorAll('[data-column-id="$actions"]')
        )) {
            if (
                cell.getAttribute("width") === String(width) &&
                cell.style.getPropertyValue("--dg-actions-effective-width") === `${width}px`
            ) {
                continue;
            }
            changed = true;
            cell.style.setProperty("--dg-actions-effective-width", `${width}px`);
            cell.setAttribute("width", String(width));
            if (cell.matches("thead tr.dg-head-columns th")) {
                cell.dataset.minWidth = String(width);
                cell.dataset.preferredWidth = String(width);
            }
        }
        if (changed) {
            grid.queueFrozenSync();
        }
    }

    /**
     * Fill the shared collapsed actions popover before the toggle's native
     * default action opens it. The browser owns opening, dismissal and
     * placement; focus moves into the popover on keyboard opening (see
     * ontoggle) and back to the invoker after a button activation.
     * @param {Record<string, any>} row
     * @param {Number} [rowIndex]
     */
    renderActionMenu(row, rowIndex = this.grid.rows.indexOf(row)) {
        const grid = this.grid;
        const menu = this.menu;
        if (!menu) {
            return;
        }
        menu.replaceChildren();
        for (const action of this.#visibleActions(row, rowIndex)) {
            const li = grid.ownerDocument.createElement("li");
            const el = this.createActionElement(action, row, rowIndex, true);
            li.appendChild(el);
            menu.appendChild(li);
        }
    }

    /**
     * Build the actions cell content: a toggle button plus one element per
     * resolved action. A row without actions gets an empty cell.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid, rowIndex }) {
        if (tr) {
            this.#renderedDefinitions.set(tr, grid.meta?.actions);
        }
        const labels = grid.labels;
        const rowData = row ?? {};
        const index = rowIndex ?? 0;
        const actions = this.#visibleActions(rowData, index);
        const fragment = document.createDocumentFragment();
        if (!actions.length) {
            return fragment;
        }

        if (this.menu) {
            const actionsToggle = document.createElement("button");
            actionsToggle.type = "button";
            actionsToggle.classList.add("dg-actions-toggle");
            styleControl(grid, actionsToggle, "action");
            actionsToggle.setAttribute("aria-label", labels.toggleActions);
            actionsToggle.setAttribute("popovertarget", this.menu.id);
            actionsToggle.title = labels.toggleActions;
            fragment.appendChild(actionsToggle);
        }

        let defaultApplied = false;
        const rowKey = grid.resolveRowKey(rowData, index);
        for (const action of actions) {
            const el = this.createActionElement(action, rowData, index);
            fragment.appendChild(el);

            // Default row action: only the first resolved default applies. The
            // rendered element is marked so the core can activate it on a row
            // click; the row interaction itself is delegated by the core.
            if (action.default) {
                if (defaultApplied) {
                    grid.log(`multiple default actions for row ${rowKey}, using the first one`);
                } else {
                    defaultApplied = true;
                    el.dataset.dgDefaultAction = "";
                    // The cursor must not promise an unavailable interaction: a
                    // disabled default keeps its marker (activation stays uniform)
                    // but the row is not presented as clickable.
                    if (grid.options.rowClick === "action" && tr && el.getAttribute("aria-disabled") !== "true") {
                        tr.classList.add("dg-clickable-row");
                    }
                }
            }
        }

        return fragment;
    }

    /**
     * Activate the rendered default action of a data row: the element marked
     * with `data-dg-default-action` at render time is clicked, so href
     * navigation, confirmation, disabled state and the `action` event all behave
     * exactly as if the control itself was clicked.
     * @param {Number} rowIndex
     */
    activateDefaultAction(rowIndex) {
        const tr = this.grid.tbody?.querySelector(`tr.dg-data-row[data-row-index="${rowIndex}"]`);
        const action = tr?.querySelector("[data-dg-default-action]");
        if (action instanceof HTMLElement) {
            action.click();
        }
    }

    /**
     * Create or adopt the visual control before action state and behavior are
     * applied.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {String|null} href
     * @param {Boolean} menu
     * @returns {HTMLElement}
     */
    #createActionControl(action, row, href, menu) {
        const grid = this.grid;
        const render = action.render ?? grid.options.actionRenderer;
        const content = render ? render({ action, row, grid }) : null;

        /** @type {HTMLElement} */
        let el;
        if (content instanceof Element && (content.tagName === "BUTTON" || content.tagName === "A")) {
            el = /** @type {HTMLElement} */ (content);
        } else {
            const isLink = href !== null;
            el = document.createElement(isLink ? "a" : "button");
            if (!isLink) {
                /** @type {HTMLButtonElement} */ (el).type = "button";
            }
            if (content === null || content === undefined) {
                el.textContent = action.label ?? action.name;
            } else {
                applyContent(el, content);
                if (menu) {
                    // In the collapsed menu the custom content (often an icon)
                    // is kept, with the label shown next to it.
                    const label = document.createElement("span");
                    label.className = "dg-action-label";
                    label.textContent = action.label ?? action.name;
                    el.append(label);
                } else if (content instanceof Node || (typeof content === "object" && content.html !== undefined)) {
                    // Custom content (Node or { html }) may be icon-only: keep the
                    // label as the accessible name of the element RowActions creates.
                    el.setAttribute("aria-label", action.label ?? action.name);
                }
            }
        }

        if (href !== null && !el.hasAttribute("href")) {
            /** @type {HTMLAnchorElement} */ (el).href = href;
        }
        return el;
    }

    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {Boolean} [menu] Render for the collapsed menu: keep the icon but
     * add a visible label next to it.
     * @returns {HTMLElement}
     */
    createActionElement(action, row, rowIndex, menu = false) {
        const grid = this.grid;
        const rowKey = grid.resolveRowKey(row, rowIndex);
        const ctx = { grid, action, rowKey };
        const resolvedHref = action.href
            ? typeof action.href === "function"
                ? action.href(row, ctx)
                : interpolate(action.href, row)
            : null;
        const href = normalizeActionHref(resolvedHref);
        const el = this.#createActionControl(action, row, href, menu);
        el.dataset.action = action.name;
        if (action.intent) {
            el.dataset.intent = action.intent;
            el.classList.add(`dg-intent-${action.intent}`);
        }
        styleControl(grid, el, "action", action.class);

        // Disabled actions must really block: a native `disabled` on buttons,
        // `aria-disabled` on any element, a class hook and a guarded click.
        const isDisabled = typeof action.disabled === "function" ? action.disabled(row, ctx) : Boolean(action.disabled);
        if (isDisabled) {
            if (el.tagName === "BUTTON") {
                /** @type {HTMLButtonElement} */ (el).disabled = true;
            }
            el.setAttribute("aria-disabled", "true");
            el.classList.add("dg-disabled");
        }

        // Confirmation: boolean, message string or a resolver.
        const message = resolveActionConfirmation(action.confirm, grid.labels.areYouSure, row, ctx);

        const dispatchAction = (/** @type {Event} */ ev) => {
            ev.stopPropagation();
            if (isDisabled) {
                ev.preventDefault();
                return;
            }
            if (message !== null && !window.confirm(message)) {
                ev.preventDefault();
                return;
            }
            const accepted = dispatch(
                grid,
                "action",
                {
                    action,
                    name: action.name,
                    row,
                    rowKey,
                    rowIndex,
                    trigger: el,
                    originalEvent: ev,
                },
                { cancelable: true },
            );
            // An application that takes over (a full edit, for example) cancels
            // the event; its native link navigation must not also run.
            if (!accepted) {
                ev.preventDefault();
            }
            // Close the shared collapsed actions popover after activation, once
            // the action has been dispatched. A button, or a link whose
            // navigation the application canceled, has no native focus
            // destination: return focus to the invoker. A navigating link lets
            // the browser follow it.
            const menu = this.menu;
            if (menu?.contains(el)) {
                menu.hidePopover?.();
                if (el.tagName === "BUTTON" || !accepted) {
                    this.activeInvoker?.focus?.();
                }
            }
        };
        el.addEventListener("click", dispatchAction);

        return el;
    }
}

export default RowActions;
