import BasePlugin from "../core/base-plugin.js";
import { resolveActionConfirmation } from "../utils/actionConfirm.js";
import applyContent from "../utils/applyContent.js";
import { dispatch } from "../utils/dispatch.js";
import interpolate from "../utils/interpolate.js";
import { supportsPopoverAnchor } from "../utils/popover.js";
import randstr from "../utils/randstr.js";

/**
 * Add actions on rows
 */
class RowActions extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {HTMLUListElement|null} */
        this.menu = null;
    }

    connected() {
        const menu = this.grid.ownerDocument.createElement("ul");
        if (!supportsPopoverAnchor()) {
            return;
        }
        menu.id = randstr("dg-actions-menu-");
        menu.className = "dg-menu dg-actions-menu";
        menu.popover = "auto";
        menu.addEventListener("click", () => menu.hidePopover?.(), true);
        this.grid.appendChild(menu);
        this.menu = menu;
        this.grid.addEventListener("click", this);
    }

    disconnected() {
        this.grid.removeEventListener("click", this);
        this.menu?.remove();
        this.menu = null;
    }

    /**
     * Delegate the collapsed-menu toggle. The row is resolved from the DOM
     * (`data-row-index`) through the model (`grid.rows`), so the toggle keeps
     * working across body rerenders without re-attaching anything.
     * @param {MouseEvent} event
     */
    onclick(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
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
        if (!tr || !row) {
            return;
        }
        this.renderActionMenu(row);
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
            sortable: false,
            title: "",
            class: "dg-actions",
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: () => this.createFilterCell(),
            renderCell: (ctx) => this.makeActionRow(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
        });
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add("dg-not-sortable", "dg-not-resizable");
    }

    createFilterCell() {}

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
        this.syncCellModes();
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
        for (const row of grid.rows ?? []) {
            let count = 0;
            const actions = grid.getActionsForRow(row);
            const rowKey = grid.resolveRowKey(row);
            for (const action of actions) {
                if (action.visible && !action.visible(row, { grid, action, rowKey })) {
                    continue;
                }
                count++;
            }
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
        const cells = grid.querySelectorAll('[data-column-id="$actions"]');
        for (const cell of cells) {
            cell.classList.remove("dg-actions-1", "dg-actions-2", "dg-actions-more", "dg-actions-inline");
            cell.classList.add(mode);
        }
    }

    /**
     * Fill the shared popover before the toggle's native default action opens
     * it. The browser owns opening, dismissal, focus restoration and placement.
     * @param {Record<string, any>} row
     */
    renderActionMenu(row) {
        const grid = this.grid;
        const menu = this.menu;
        if (!menu) {
            return;
        }
        const labels = grid.labels;
        const rowIndex = grid.rows.indexOf(row);
        menu.replaceChildren();
        const rowKey = grid.resolveRowKey(row, rowIndex);
        for (const action of grid.getActionsForRow(row)) {
            if (action.visible && !action.visible(row, { grid, action, rowKey })) {
                continue;
            }
            const li = grid.ownerDocument.createElement("li");
            const { el } = this.createActionElement(action, row, rowIndex, grid, labels, true);
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
        const labels = grid.labels;
        const rowData = row ?? {};
        const actions = grid.getActionsForRow(rowData);
        const fragment = document.createDocumentFragment();
        if (!actions.length) {
            return fragment;
        }

        if (this.menu) {
            const actionsToggle = document.createElement("button");
            actionsToggle.type = "button";
            actionsToggle.classList.add("dg-actions-toggle");
            actionsToggle.textContent = "⋯";
            actionsToggle.setAttribute("aria-label", labels.toggleActions);
            actionsToggle.setAttribute("popovertarget", this.menu.id);
            actionsToggle.title = labels.toggleActions;
            fragment.appendChild(actionsToggle);
        }

        let defaultApplied = false;
        const rowKey = grid.resolveRowKey(rowData, rowIndex ?? 0);
        for (const action of actions) {
            if (action.visible && !action.visible(rowData, { grid, action, rowKey })) {
                continue;
            }
            const { el } = this.createActionElement(action, rowData, rowIndex ?? 0, grid, labels);
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
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {import("../data-grid.js").default} grid
     * @param {import("../data-grid.js").Labels} labels
     * @param {Boolean} [menu] Render for the collapsed menu: keep the icon but
     * add a visible label next to it.
     * @returns {{ el: HTMLElement, dispatchAction: (ev: Event) => void }}
     */
    createActionElement(action, row, rowIndex, grid, labels, menu = false) {
        const rowKey = grid.resolveRowKey(row, rowIndex);
        const ctx = { grid, action, rowKey };
        const href = action.href
            ? typeof action.href === "function"
                ? action.href(row, ctx)
                : interpolate(action.href, row)
            : null;

        // Custom renderer (per-action first, then global)
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
        el.dataset.action = action.name;
        if (action.intent) {
            el.dataset.intent = action.intent;
            el.classList.add(`dg-intent-${action.intent}`);
        }
        if (action.class) {
            el.classList.add(...action.class.trim().split(/\s+/));
        }

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
        const message = resolveActionConfirmation(action.confirm, labels.areYouSure, row, ctx);

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
            dispatch(grid, "action", {
                action,
                name: action.name,
                row,
                rowKey,
                rowIndex,
                trigger: el,
            });
        };
        el.addEventListener("click", dispatchAction);

        return { el, dispatchAction };
    }
}

export default RowActions;
