/** @typedef {import("../data-grid").default} DataGrid */
/** @typedef {import("../data-grid").Column} Column */

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

class BasePlugin {
    /**
     * @param {DataGrid} grid
     */
    constructor(grid) {
        this.grid = grid;
    }

    connected() {}

    disconnected() {}

    /**
     * Inject or configure normalized columns. Transform columns in place.
     * @param {Column[]} columns
     */
    extendColumns(columns) {}

    /**
     * Called before a render cycle.
     */
    beforeRender() {}

    /**
     * Called after a render cycle. The context is "table" for the header/footer
     * render and "body" for the rows render.
     * @param {("table"|"body")} context
     */
    afterRender(context) {}

    /**
     * Called when the responsive option changes.
     * @param {Boolean} enabled
     */
    responsiveChanged(enabled) {}

    /**
     * Handle events within the plugin
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event) {
        const handler = Reflect.get(this, `on${event.type}`);
        if (typeof handler === "function") {
            handler.call(this, event);
        }
    }
}

export default BasePlugin;
