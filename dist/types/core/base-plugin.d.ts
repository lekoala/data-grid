export default BasePlugin;
export type DataGrid = import("../data-grid.js").default;
export type Column = import("../data-grid.js").Column;
export type RenderContext = "table" | "body";
/**
 * A plugin hooks into the grid lifecycle. Duck typed: any object exposing one
 * of these methods can be used as a plugin.
 */
export type Plugin = {
    connected?: (() => void) | undefined;
    disconnected?: (() => void) | undefined;
    extendColumns?: ((columns: Column[]) => void) | undefined;
    beforeRender?: (() => void) | undefined;
    afterRender?: ((context: RenderContext) => void) | undefined;
    responsiveChanged?: ((enabled: boolean) => void) | undefined;
};
/**
 * A plugin constructor: a class (or duck-typed factory) taking the grid.
 */
export type PluginConstructor = new (grid: DataGrid) => Plugin;
/**
 * Registered plugins keyed by registration name. Values are constructors.
 */
export type PluginRegistry = Record<string, PluginConstructor>;
/**
 * Instantiated plugins keyed by registration name. Values are instances.
 */
export type PluginInstances = Record<string, Plugin>;
/** @typedef {import("../data-grid.js").default} DataGrid */
/** @typedef {import("../data-grid.js").Column} Column */
/**
 * @typedef {"table"|"body"} RenderContext
 */
/**
 * A plugin hooks into the grid lifecycle. Duck typed: any object exposing one
 * of these methods can be used as a plugin.
 * @typedef {Object} Plugin
 * @property {() => void} [connected]
 * @property {() => void} [disconnected]
 * @property {(columns: Column[]) => void} [extendColumns]
 * @property {() => void} [beforeRender]
 * @property {(context: RenderContext) => void} [afterRender]
 * @property {(enabled: boolean) => void} [responsiveChanged]
 */
/**
 * A plugin constructor: a class (or duck-typed factory) taking the grid.
 * @typedef {new (grid: DataGrid) => Plugin} PluginConstructor
 */
/**
 * Registered plugins keyed by registration name. Values are constructors.
 * @typedef {Record<string, PluginConstructor>} PluginRegistry
 */
/**
 * Instantiated plugins keyed by registration name. Values are instances.
 * @typedef {Record<string, Plugin>} PluginInstances
 */
declare class BasePlugin {
    /**
     * @param {DataGrid} grid
     */
    constructor(grid: DataGrid);
    grid: import("../data-grid.js").DataGrid;
    connected(): void;
    disconnected(): void;
    /**
     * Inject or configure normalized columns. Transform columns in place.
     * @param {Column[]} columns
     */
    extendColumns(columns: Column[]): void;
    /**
     * Called before a render cycle.
     */
    beforeRender(): void;
    /**
     * Called after a render cycle. The context is "table" for the header/footer
     * render and "body" for the rows render.
     * @param {("table"|"body")} context
     */
    afterRender(context: ("table" | "body")): void;
    /**
     * Called when the responsive option changes.
     * @param {Boolean} enabled
     */
    responsiveChanged(enabled: boolean): void;
    /**
     * Handle events within the plugin
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event: Event): void;
}
//# sourceMappingURL=base-plugin.d.ts.map