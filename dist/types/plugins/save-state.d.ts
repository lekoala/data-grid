import BasePlugin from "../core/base-plugin.js";
export type CachedGridState = {
    query: import("../data-source.js").QueryState;
    columns: Array<{
        field: string;
        hidden?: boolean;
    }>;
};
/**
 * @typedef CachedGridState
 * @property {import("../data-source.js").QueryState} query
 * @property {Array<{ field: string, hidden?: boolean }>} columns
 */
declare class SaveState extends BasePlugin {
    cachedState: CachedGridState | null;
    /** @type {(() => void) | null} */
    onBodyRendered: (() => void) | null;
    /** @type {(() => void) | null} */
    onScroll: (() => void) | null;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * Persist the current query, columns and scroll position.
     */
    _update(): void;
    /**
     * @param {...any} data
     */
    log(...data: any[]): void;
    /**
     * @returns {CachedGridState|undefined}
     */
    _getState(): CachedGridState | undefined;
    /**
     * @param {CachedGridState} state
     */
    _setState(state: CachedGridState): void;
}
export default SaveState;
//# sourceMappingURL=save-state.d.ts.map