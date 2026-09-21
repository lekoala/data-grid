import BasePlugin from "../core/base-plugin.js";
import { hasStableId } from "../utils/stableElementId.js";

const STATE_EVENTS = ["bodyRendered", "columnVisibility", "columnResized", "columnReordered"];

/**
 * Persisted state of one base column. `id` is the stable column identity
 * (`column.id ?? column.field`); legacy storage using `field` is still read.
 * `width` is written only for columns the user actually resized.
 * @typedef {Object} SavedColumnState
 * @property {String} [id]
 * @property {String} [field]
 * @property {Boolean} hidden
 * @property {Number} [width]
 */

/**
 * @typedef CachedGridState
 * @property {import("../data-source.js").QueryState} query
 * @property {Array<SavedColumnState>} columns
 */

class SaveState extends BasePlugin {
    /** @type {((event: Event) => void) | null} */
    #onStateChanged;
    /** @type {Boolean} */
    #warnedMissingId;
    /** @type {Set<String>} */
    #userWidthIds;

    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        this.#onStateChanged = null;
        this.#warnedMissingId = false;
        this.#userWidthIds = new Set();
        this.log("Init");
    }

    connected() {
        this.log("connected");
        const grid = this.grid;

        if (!grid.options.saveState) {
            this.log("disabled");
            return;
        }

        if (!this.#canPersist()) {
            return;
        }

        this.log("enabled");

        const cachedState = this.#getState();
        if (cachedState) {
            this.log("restore state");

            // Restore column state in both directions. Only canonical base
            // columns are restored and persisted: virtual plugin columns never
            // live in options.columns, so their placement keeps its contract.
            if (Array.isArray(cachedState.columns)) {
                this.#restoreColumns(cachedState.columns);
            }

            // Restore the runtime query (the initial load will use it)
            if (cachedState.query) {
                grid.restoreQuery(cachedState.query);
            }
        }

        this.#listen();
    }

    #listen() {
        if (this.#onStateChanged) {
            return;
        }
        const grid = this.grid;
        this.#onStateChanged = (event) => this.#onGridEvent(event);
        for (const eventName of STATE_EVENTS) {
            grid.addEventListener(eventName, this.#onStateChanged);
        }
        this.#update();
    }

    #unlisten() {
        if (!this.#onStateChanged) {
            return;
        }
        for (const eventName of STATE_EVENTS) {
            this.grid.removeEventListener(eventName, this.#onStateChanged);
        }
        this.#onStateChanged = null;
    }

    /** @param {Boolean} enabled */
    saveStateChanged(enabled) {
        if (enabled && this.#canPersist()) {
            this.#listen();
        } else {
            this.#unlisten();
        }
    }

    disconnected() {
        this.#unlisten();
    }

    /**
     * Track runtime column changes that represent user intent.
     * @param {Event} event
     */
    #onGridEvent(event) {
        // Only a real resize makes the width user-owned: the presence of
        // `column.width` alone is not proof, since a width may be authored.
        if (event.type === "columnResized") {
            const detail = /** @type {CustomEvent} */ (event).detail;
            const id = this.#matchColumnId(detail?.col);
            if (id) {
                this.#userWidthIds.add(id);
            }
        }
        this.#update();
    }

    /**
     * Persist the current query, column order and runtime column state.
     * The array order represents column order; width is written only for
     * columns that were actually resized by the user.
     */
    #update() {
        const grid = this.grid;
        if (!grid.options.saveState || !hasStableId(grid) || !grid.classList.contains("dg-initialized")) {
            return;
        }
        this.#setState({
            query: grid.query,
            columns: grid.options.columns.map((column) => {
                const id = grid.getColumnId(column);
                /** @type {SavedColumnState} */
                const state = { id, hidden: Boolean(column.hidden) };
                if (this.#userWidthIds.has(id) && typeof column.width === "number") {
                    state.width = column.width;
                }
                return state;
            }),
        });
    }

    /**
     * Restore explicit visibility, user widths and the persisted column order
     * onto the canonical base columns.
     *
     * Order restoration is a deterministic merge: the columns known to the
     * saved state fill the slots they currently occupy, in the saved order;
     * columns missing from the state keep their authored slot; stale ids are
     * ignored. Malformed entries fail harmlessly.
     * @param {Array<SavedColumnState>} entries
     */
    #restoreColumns(entries) {
        const grid = this.grid;
        const columns = grid.options.columns;
        /** @type {Array<{ id: String, hidden: Boolean, hasHidden: Boolean, width: Number|undefined }>} */
        const known = [];
        const seen = new Set();

        for (const entry of entries) {
            if (!entry || typeof entry !== "object") {
                continue;
            }
            // v3.5 stored `{ field, hidden }`; the current format uses `id`.
            const id = String(entry.id ?? entry.field ?? "");
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            known.push({
                id,
                hasHidden: Object.hasOwn(entry, "hidden"),
                hidden: Boolean(entry.hidden),
                width: typeof entry.width === "number" && Number.isFinite(entry.width) ? entry.width : undefined,
            });
        }
        if (!known.length) {
            return;
        }

        // Apply visibility and user width to the matching base columns.
        for (const entry of known) {
            const target = this.#findColumnById(entry.id);
            if (!target) {
                continue;
            }
            if (entry.hasHidden) {
                target.hidden = entry.hidden;
            }
            if (entry.width !== undefined) {
                target.width = entry.width;
                this.#userWidthIds.add(entry.id);
            }
        }

        // Deterministic order merge: known columns keep their relative saved
        // order but only within the slots they currently occupy, so columns
        // added to the schema since the state was saved stay put.
        const columnIds = new Set(columns.map((column) => grid.getColumnId(column)));
        const persisted = known.filter((entry) => columnIds.has(entry.id)).map((entry) => entry.id);
        const slots = [];
        for (let i = 0; i < columns.length; i++) {
            if (seen.has(grid.getColumnId(columns[i]))) {
                slots.push(i);
            }
        }
        const ordered = columns.slice();
        for (let i = 0; i < Math.min(slots.length, persisted.length); i++) {
            ordered[slots[i]] = /** @type {import("../data-grid.js").Column} */ (this.#findColumnById(persisted[i]));
        }
        if (ordered.some((column, i) => column !== columns[i])) {
            for (let i = 0; i < columns.length; i++) {
                columns[i] = ordered[i];
            }
        }
    }

    /**
     * Resolve a stable column id to its base column. Matches by column identity
     * (`column.id ?? column.field`) first, then falls back to the bare `field`
     * so legacy field-based storage keeps working for id-keyed columns.
     * @param {String} id
     * @returns {import("../data-grid.js").Column|undefined}
     */
    #findColumnById(id) {
        return this.grid.options.columns.find((column) => {
            return this.grid.getColumnId(column) === id || column.field === id || column.id === id;
        });
    }

    /**
     * Resolve the column of a `columnResized` event (its detail carries the
     * th `field`) to a stable base column id.
     * @param {*} col
     * @returns {String|null}
     */
    #matchColumnId(col) {
        if (col === undefined || col === null) {
            return null;
        }
        const column = this.#findColumnById(String(col));
        return column ? this.grid.getColumnId(column) : null;
    }

    /**
     * @param {...any} data
     */
    log(...data) {
        this.grid.log("[Save-State] ", ...data);
    }

    /** @returns {Boolean} */
    #canPersist() {
        if (hasStableId(this.grid)) {
            return true;
        }
        if (!this.#warnedMissingId) {
            console.warn("saveState requires a stable id on <data-grid>; state persistence is disabled.");
            this.#warnedMissingId = true;
        }
        return false;
    }

    /**
     * @returns {CachedGridState|undefined}
     */
    #getState() {
        /** @type {CachedGridState|undefined} */
        let state;
        try {
            const raw = sessionStorage.getItem(`gridSaveState_${this.grid.id}`);
            if (raw) {
                state = JSON.parse(raw);
            }
        } catch {}
        return state;
    }

    /**
     * @param {CachedGridState} state
     */
    #setState(state) {
        try {
            sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
        } catch {}
    }
}

export default SaveState;
