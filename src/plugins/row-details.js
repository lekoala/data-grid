import BasePlugin from "../core/base-plugin.js";
import applyContent from "../utils/applyContent.js";
import { createDisclosureButton } from "../utils/disclosureButton.js";
import { dispatch } from "../utils/dispatch.js";
import { createSpanningRow } from "../utils/spanningRow.js";

const DETAILS_CLASS = "dg-row-details";
const DIALOG_CLASS = "dg-details-dialog";
const DETAILS_PREFIX = "dg-details";
/** Dialog mode consults a record instead of expanding the row in place. */
const DIALOG_CONTROL_CLASS = `${DETAILS_CLASS}-toggle-control-dialog`;

/** Expandable, application-rendered content associated with a data row. */
class RowDetails extends BasePlugin {
    /** @type {HTMLDialogElement|null} */
    #dialog;
    /** @type {String|null} */
    #openKey;
    /** @type {Record<string, any>|null} */
    #openRow;

    /** @param {import("../data-grid.js").default} grid */
    constructor(grid) {
        super(grid);
        /** @type {Set<String>} */
        this.expanded = new Set();
        /** @type {Set<String>} */
        this.collapsed = new Set();
        this.#dialog = null;
        this.#openKey = null;
        this.#openRow = null;
    }

    connected() {
        this.grid.addEventListener("click", this);
    }

    disconnected() {
        this.grid.removeEventListener("click", this);
        // A detached grid never announces its cleanup.
        this.#closeDialog(false);
    }

    /**
     * Whether the plugin owns a disclosure control: application details, or the
     * built-in record sheet in dialog mode (where `rowDetails` is optional).
     * @returns {Boolean}
     */
    hasDetails() {
        return typeof this.grid.options.rowDetails === "function" || this.#dialogMode();
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

        if (target.closest(`.${DETAILS_PREFIX}-close`)) {
            event.stopPropagation();
            this.#closeDialog(true);
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
        if (!this.hasDetails()) {
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
        if (this.#dialogMode()) {
            return this.#openKey === String(rowKey);
        }
        return this.expanded.has(String(rowKey));
    }

    /** @public @param {String} rowKey */
    expand(rowKey) {
        if (this.#dialogMode()) {
            this.#openDialog(rowKey);
            return;
        }
        this.#change(rowKey, true);
    }

    /** @public @param {String} rowKey */
    collapse(rowKey) {
        if (this.#dialogMode()) {
            if (this.isExpanded(rowKey)) {
                this.#closeDialog(true);
            }
            return;
        }
        this.#change(rowKey, false);
    }

    /** @public @param {String} rowKey */
    toggle(rowKey) {
        if (this.#dialogMode()) {
            if (this.isExpanded(rowKey)) {
                this.collapse(rowKey);
            } else {
                this.expand(rowKey);
            }
            return;
        }
        this.#change(rowKey, !this.isExpanded(rowKey));
    }

    /** @public */
    collapseAll() {
        if (this.#dialogMode()) {
            this.#closeDialog(true);
            return;
        }
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

    /** @returns {Boolean} */
    #dialogMode() {
        return this.grid.options.detailsDisplay === "dialog";
    }

    /** @returns {String} */
    #dialogId() {
        return `dg-details-dialog-${this.grid.id}`;
    }

    /** @param {import("../data-grid.js").CellContext} ctx @returns {HTMLButtonElement} */
    createToggle({ row = {}, rowIndex = 0 }) {
        const key = this.grid.resolveRowKey(row, rowIndex);
        const expanded = this.isExpanded(key);
        const button = createDisclosureButton(`${DETAILS_CLASS}-toggle-control`);
        this.#syncToggle(button, row, rowIndex, expanded);
        return button;
    }

    /** @param {HTMLButtonElement} button @param {Record<string, any>} row @param {Number} rowIndex @param {Boolean} expanded */
    #syncToggle(button, row, rowIndex, expanded) {
        // In dialog mode the control opens a modal: no in-place expansion, so
        // `aria-expanded` would describe a state the row does not have.
        if (this.#dialogMode()) {
            button.setAttribute("aria-haspopup", "dialog");
            button.setAttribute("aria-controls", this.#dialogId());
            button.removeAttribute("aria-expanded");
            button.classList.add(DIALOG_CONTROL_CLASS);
            button.setAttribute(
                "aria-label",
                this.grid.formatLabel(this.grid.labels.showDetails, {
                    row: this.grid.getRowLabel(row, rowIndex),
                }),
            );
            button.classList.remove(`${DETAILS_CLASS}-toggle-control-open`);
            return;
        }

        button.removeAttribute("aria-haspopup");
        button.classList.remove(DIALOG_CONTROL_CLASS);
        button.setAttribute("aria-controls", this.#detailId(rowIndex));
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
        const current = [...(this.grid.tbody?.children ?? [])].find((row) => row.id === id);
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
        // Dialog mode never inserts an inline row: the body render neither
        // reopens nor closes the session, which keeps a rerender harmless.
        if (context !== "body" || this.#dialogMode() || typeof this.grid.options.rowDetails !== "function") {
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
        const close = this.#dialog?.querySelector(`.${DETAILS_PREFIX}-close`);
        if (close) {
            close.setAttribute("aria-label", this.grid.labels.closeDialog);
        }
        for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
            const rowIndex = Number.parseInt(/** @type {HTMLElement} */ (tr).dataset.rowIndex ?? "0", 10) || 0;
            const row = this.grid.rows[rowIndex];
            const button = /** @type {HTMLButtonElement|null} */ (tr.querySelector(`.${DETAILS_CLASS}-toggle-control`));
            if (row && button) {
                this.#syncToggle(button, row, rowIndex, this.isExpanded(this.grid.resolveRowKey(row, rowIndex)));
            }
        }
    }

    /**
     * Lazily create the single dialog shell of this grid. It stays a direct
     * child of the host (never inside `.dg-scroll`, never moved to
     * `document.body`) so it keeps the inherited theme tokens in the top layer.
     * @returns {HTMLDialogElement}
     */
    #ensureDialog() {
        if (this.#dialog && this.grid.contains(this.#dialog)) {
            return this.#dialog;
        }

        const dialog = document.createElement("dialog");
        dialog.className = DIALOG_CLASS;
        dialog.id = this.#dialogId();
        const titleId = `${dialog.id}-title`;

        const close = document.createElement("button");
        close.type = "button";
        close.className = `${DETAILS_PREFIX}-close`;
        close.setAttribute("aria-label", this.grid.labels.closeDialog);

        const panel = document.createElement("div");
        panel.className = `${DETAILS_PREFIX}-panel`;

        const header = document.createElement("header");
        header.className = `${DETAILS_PREFIX}-header`;
        const title = document.createElement("h2");
        title.className = `${DETAILS_PREFIX}-title`;
        title.id = titleId;
        header.append(title);

        const body = document.createElement("div");
        body.className = `${DETAILS_PREFIX}-body`;

        panel.append(header, body);
        dialog.append(close, panel);
        dialog.setAttribute("aria-labelledby", titleId);
        // Escape and any external close() land here. Our own close resets the
        // session first, and its native event is queued: it may reach us after
        // another session reopened, in which case it is not a close at all.
        dialog.addEventListener("close", () => {
            if (dialog.open) {
                return;
            }
            const key = this.#openKey;
            const row = this.#openRow;
            this.#openKey = null;
            this.#openRow = null;
            this.#endSession(key, row, true);
        });
        this.grid.append(dialog);
        this.#dialog = dialog;
        return dialog;
    }

    /**
     * Compose the built-in record sheet from the current columns, then append
     * the optional application content. `rowDetails` complements the sheet.
     * @param {HTMLDialogElement} dialog
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     */
    #renderDialog(dialog, row, rowIndex) {
        const title = dialog.querySelector(`.${DETAILS_PREFIX}-title`);
        if (title) {
            title.textContent = this.grid.getRowLabel(row, rowIndex);
        }

        const body = dialog.querySelector(`.${DETAILS_PREFIX}-body`);
        if (!body) {
            return;
        }
        body.replaceChildren();

        const list = document.createElement("dl");
        list.className = `${DETAILS_PREFIX}-list`;
        for (const column of this.grid.getColumns()) {
            const field = column.field;
            // The sheet mirrors the user's visibility choices: hidden columns
            // stay hidden, and virtual/attribute columns are not data.
            if (!field || column.virtual || column.attr || column.hidden) {
                continue;
            }
            const dt = document.createElement("dt");
            dt.textContent = column.title || field;
            const dd = document.createElement("dd");
            const ctx = {
                grid: this.grid,
                column,
                row,
                rowIndex,
                value: row[field],
            };
            if (column.renderCell) {
                const content = column.renderCell(ctx);
                // A renderer may hand back a node already attached to the table:
                // the sheet clones it instead of stealing it from the row.
                applyContent(dd, content instanceof Node && content.isConnected ? content.cloneNode(true) : content);
            } else {
                this.grid.renderDefaultCell(dd, ctx);
            }
            list.append(dt, dd);
        }
        if (list.childElementCount) {
            body.append(list);
        }

        const renderer = this.grid.options.rowDetails;
        if (typeof renderer === "function") {
            const app = document.createElement("div");
            app.className = `${DETAILS_PREFIX}-app`;
            const content = renderer({ row, rowKey: this.grid.resolveRowKey(row, rowIndex), grid: this.grid });
            applyContent(app, content instanceof Node && content.isConnected ? content.cloneNode(true) : content);
            if (app.hasChildNodes()) {
                body.append(app);
            }
        }
    }

    /** @param {String} rowKey */
    #openDialog(rowKey) {
        const key = String(rowKey);
        // Already showing this row: reopening would close and reopen the modal
        // (and emit a close/open pair) without changing the snapshot.
        if (this.#openKey === key && this.#dialog?.open) {
            return;
        }
        const index = this.grid.rows.findIndex((row, rowIndex) => this.grid.resolveRowKey(row, rowIndex) === key);
        if (index < 0) {
            return;
        }
        const row = this.grid.rows[index];

        // One session at a time: closing before opening keeps the toggle state
        // and the `rowDetailsToggle` stream ordered.
        if (this.#openKey !== null) {
            this.#closeDialog(true);
        }

        const dialog = this.#ensureDialog();
        this.#renderDialog(dialog, row, index);
        if (!dialog.querySelector(`.${DETAILS_PREFIX}-body`)?.hasChildNodes()) {
            this.grid.log("row details dialog has no content to show");
            return;
        }

        this.#openKey = key;
        this.#openRow = row;
        dialog.showModal();
        dispatch(this.grid, "rowDetailsToggle", { row, rowKey: key, expanded: true });
    }

    /**
     * Close the current session. `emit` is false for cleanup paths, which must
     * not pretend the user toggled anything.
     * @param {Boolean} emit
     */
    #closeDialog(emit = true) {
        const key = this.#openKey;
        const row = this.#openRow;
        if (key === null) {
            return;
        }
        // Reset before close(): its event is queued and may be delivered after
        // another session opened (see the close listener).
        this.#openKey = null;
        this.#openRow = null;
        if (this.#dialog?.open) {
            this.#dialog.close();
        }
        this.#endSession(key, row, emit);
    }

    /**
     * Announce the end of a session. The session state is already cleared: this
     * only reports it and restores focus, at most once per session.
     * @param {String|null} key
     * @param {Record<string, any>|null} row
     * @param {Boolean} emit
     */
    #endSession(key, row, emit) {
        if (key === null) {
            return;
        }
        if (emit && row) {
            dispatch(this.grid, "rowDetailsToggle", { row, rowKey: key, expanded: false });
        }
        this.#restoreFocus(key);
    }

    /**
     * The browser normally restores focus to the trigger. When it leaves focus
     * on the body (or inside the now closed dialog), fall back to the row toggle,
     * then to the scroll viewport.
     * @param {String} rowKey
     */
    #restoreFocus(rowKey) {
        if (!this.grid.isConnected) {
            return;
        }
        const active = document.activeElement;
        const insideClosedDialog = this.#dialog?.contains(active) ?? false;
        // Focus may sit on a detached control after a rerender: that is not a
        // usable restoration either.
        const usable = active instanceof HTMLElement && active !== document.body && active.isConnected;
        if (usable && !insideClosedDialog) {
            return;
        }

        const index = this.grid.rows.findIndex((row, rowIndex) => this.grid.resolveRowKey(row, rowIndex) === rowKey);
        const toggle =
            index < 0
                ? null
                : this.grid.tbody?.querySelector(
                      `tr.dg-data-row[data-row-index="${index}"] .${DETAILS_CLASS}-toggle-control`,
                  );
        if (toggle instanceof HTMLElement) {
            toggle.focus();
            return;
        }
        this.grid.scrollEl?.focus();
    }
}

export default RowDetails;
