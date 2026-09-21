import BasePlugin from "../core/base-plugin.js";
export type SavedColumnState = {
    id?: string;
    field?: string;
    hidden: boolean;
    width?: number;
};
export type CachedGridState = {
    query: import("../data-source.js").QueryState;
    columns: Array<SavedColumnState>;
};
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
declare class SaveState extends BasePlugin {
    #private;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    /** @param {Boolean} enabled */
    saveStateChanged(enabled: boolean): void;
    disconnected(): void;
    /**
     * @param {...any} data
     */
    log(...data: any[]): void;
}
export default SaveState;
//# sourceMappingURL=save-state.d.ts.map