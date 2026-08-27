export type Action = import("./data-grid.js").Action;
export type Column = import("./data-grid.js").Column;
export type SortState = import("./data-source.js").SortState;
export type DeclarativeCellMeta = {
    /**
     * - original machine value
     */
    value: any;
    /**
     * - user-facing text
     */
    label: string;
    /**
     * - authored child nodes, cloned on render
     */
    content: Node[];
};
/**
 * @typedef DeclarativeCellMeta
 * @property {any} value - original machine value
 * @property {String} label - user-facing text
 * @property {Node[]} content - authored child nodes, cloned on render
 */
/**
 * Read the non-enumerable declarative-cell snapshot of a row.
 * @param {Record<string, any>} row
 * @returns {Record<string, DeclarativeCellMeta>|undefined}
 */
export declare function declarativeCells(row: Record<string, any>): Record<string, DeclarativeCellMeta> | undefined;
/**
 * Parse declarative columns and their optional initial sort. The definitions
 * still pass through the grid's normal column normalization afterward.
 * @param {HTMLTableElement} table
 * @returns {{ columns: Column[], sort: SortState[] }}
 */
export declare function parseDeclarativeTable(table: HTMLTableElement): {
    columns: Column[];
    sort: SortState[];
};
/**
 * Extract a local dataset from a supplied table body.
 * @param {HTMLTableElement} table
 * @param {Column[]} columns
 * @param {String|Function|null} [rowKey]
 * @returns {Array<Record<string, any>>}
 */
export declare function rowsFromTable(table: HTMLTableElement, columns: Column[], rowKey?: string | Function | null): Array<Record<string, any>>;
//# sourceMappingURL=declarative-table.d.ts.map