import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";

/**
 * @typedef CachedGridState
 * @property {import("../data-source.js").QueryState} query
 * @property {Array<{ field: string, hidden?: boolean }>} columns
 */

class SaveState extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        this.cachedState = null;
        /** @type {(() => void) | null} */
        this.onBodyRendered = null;
        /** @type {(() => void) | null} */
        this.onScroll = null;
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
            this.cachedState = cachedState;

            this.log("restore state");

            // Restore hidden columns
            if (Array.isArray(cachedState.columns)) {
                for (const col of cachedState.columns) {
                    const target = grid.options.columns.find((c) => c.field === col.field);
                    if (target && col.hidden) {
                        target.hidden = true;
                    }
                }
            }

            // Restore the runtime query (the initial load will use it)
            if (cachedState.query) {
                grid.restoreQuery(cachedState.query);
            }
        }

        this.onBodyRendered = () => this.#update();
        this.onScroll = debounce(() => this.#update(), 200);
        grid.addEventListener("bodyRendered", this.onBodyRendered);
        document.addEventListener("scroll", this.onScroll);
    }

    disconnected() {
        const grid = this.grid;
        if (this.onBodyRendered) {
            grid.removeEventListener("bodyRendered", this.onBodyRendered);
            this.onBodyRendered = null;
        }
        if (this.onScroll) {
            document.removeEventListener("scroll", this.onScroll);
            this.onScroll = null;
        }
    }

    /**
     * Persist the current query, columns and scroll position.
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
        } catch (_) {}
        return state;
    }

    /**
     * @param {CachedGridState} state
     */
    #setState(state) {
        try {
            sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
        } catch (_) {}
    }
}

export default SaveState;
