import BasePlugin from "../core/base-plugin.js";

/**
 * @typedef CachedGridState
 * @property {import("../data-source").QueryState} query
 * @property {Array} columns
 * @property {Number} scrollTo
 */

class SaveState extends BasePlugin {
    constructor(grid) {
        super(grid);
        this.cachedState = null;
        this.log("Init");
    }

    async connected() {
        this.log("connected");
        const grid = this.grid;

        if (!grid.options.saveState) {
            this.log("disabled");
            return;
        }

        this.log("enabled");

        const cachedState = this._getState();
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
                grid._query = cachedState.query;
            }
        }

        grid.addEventListener("bodyRendered", () => this._update());
        document.addEventListener("scrollend", () => this._update());
    }

    /**
     * Persist the current query, columns and scroll position.
     */
    _update() {
        const grid = this.grid;
        if (!grid.options.saveState || !grid.classList.contains("dg-initialized")) {
            return;
        }
        this._setState({
            query: grid.query,
            columns: grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden })),
            scrollTo: window.scrollY,
        });
    }

    log(...data) {
        this.grid.log("[Save-State] ", ...data);
    }

    /**
     * @returns {CachedGridState}
     */
    _getState() {
        let state;
        try {
            state = JSON.parse(sessionStorage.getItem(`gridSaveState_${this.grid.id}`));
        } catch (_) {}
        return state;
    }

    /**
     * @param {CachedGridState} state
     */
    _setState(state) {
        sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
    }
}

export default SaveState;
