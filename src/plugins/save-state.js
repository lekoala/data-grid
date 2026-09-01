import BasePlugin from "../core/base-plugin.js";

const STATE_EVENTS = ["bodyRendered", "columnVisibility"];

/**
 * @typedef CachedGridState
 * @property {import("../data-source.js").QueryState} query
 * @property {Array<{ field: string, hidden: boolean }>} columns
 */

class SaveState extends BasePlugin {
    /** @type {(() => void) | null} */
    #onStateChanged;

    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        this.#onStateChanged = null;
        this.log("Init");
    }

    connected() {
        this.log("connected");
        const grid = this.grid;

        if (!grid.options.saveState) {
            this.log("disabled");
            return;
        }

        this.log("enabled");

        const cachedState = this.#getState();
        if (cachedState) {
            this.log("restore state");

            // Restore column visibility in both directions.
            if (Array.isArray(cachedState.columns)) {
                for (const col of cachedState.columns) {
                    const target = grid.options.columns.find((c) => c.field === col.field);
                    if (target) {
                        target.hidden = Boolean(col.hidden);
                    }
                }
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
        this.#onStateChanged = () => this.#update();
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
        if (enabled) {
            this.#listen();
        } else {
            this.#unlisten();
        }
    }

    disconnected() {
        this.#unlisten();
    }

    /**
     * Persist the current query and column visibility.
     */
    #update() {
        const grid = this.grid;
        if (!grid.options.saveState || !grid.classList.contains("dg-initialized")) {
            return;
        }
        this.#setState({
            query: grid.query,
            columns: grid.options.columns.map((col) => ({ field: col.field ?? "", hidden: Boolean(col.hidden) })),
        });
    }

    /**
     * @param {...any} data
     */
    log(...data) {
        this.grid.log("[Save-State] ", ...data);
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
