export default SaveState;
export type CachedGridState = {
    query: import("../data-source.js").QueryState;
    columns: Array<{
        field: string;
        hidden?: boolean;
    }>;
    scrollTo: number;
};
/**
 * @typedef CachedGridState
 * @property {import("../data-source.js").QueryState} query
 * @property {Array<{ field: string, hidden?: boolean }>} columns
 * @property {Number} scrollTo
 */
declare class SaveState extends BasePlugin {
    cachedState: CachedGridState | null;
    connected(): Promise<void>;
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
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=save-state.d.ts.map