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
            if (typeof detail?.id === "string") {
                this.#userWidthIds.add(detail.id);
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
        const byId = new Map(columns.map((column) => [grid.getColumnId(column), column]));
        const byField = new Map(columns.map((column) => [column.field, column]));
        /** @type {Array<import("../data-grid.js").Column>} */
        const known = [];
        const seen = new Set();

        for (const entry of entries) {
            if (!entry || typeof entry !== "object") {
                continue;
            }
            // Resolve each entry once. Current storage uses stable ids;
            // v3.5 used fields, which may collide with another column's id.
            const target = entry.id != null ? byId.get(String(entry.id)) : byField.get(String(entry.field ?? ""));
            if (!target || seen.has(target)) {
                continue;
            }
            seen.add(target);
            known.push(target);
            if (Object.hasOwn(entry, "hidden")) {
                target.hidden = Boolean(entry.hidden);
            }
            if (typeof entry.width === "number" && Number.isFinite(entry.width)) {
                target.width = entry.width;
                this.#userWidthIds.add(grid.getColumnId(target));
            }
        }

        // Deterministic order merge: known columns keep their relative saved
        // order but only within the slots they currently occupy, so columns
        // added to the schema since the state was saved stay put.
        let next = 0;
        for (let i = 0; i < columns.length; i++) {
            if (seen.has(columns[i])) {
                columns[i] = known[next++];
            }
        }
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
