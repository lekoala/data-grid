/** @typedef {import("../data-grid").default} DataGrid */

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
     * Handle events within the plugin
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event) {
        if (this[`on${event.type}`]) {
            this[`on${event.type}`](event);
        }
    }
}

export default BasePlugin;
