class BasePlugin {
  /**
   * Could be changed due to minification process
   * It's better to set the actual class name in the plugin itself
   */
  static get pluginName() {
    return this.name;
  }

  /**
   * @param {import("../data-grid").default} grid
   */
  static connected(grid) {
    grid;
  }

  /**
   * @param {import("../data-grid").default} grid
   */
  static disconnected(grid) {
    grid;
  }
}

export default BasePlugin;
