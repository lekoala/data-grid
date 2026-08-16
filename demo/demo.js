import { ArrayDataSource, DataGrid } from "../data-grid.js";

/**
 * Build a client-side grid from a static JSON file.
 * Supports a plain array or a { data, options } response. Columns and actions
 * are read from the file "options" key when present.
 * @param {HTMLElement} container
 * @param {String} url
 * @param {Object} [options] Additional grid options
 * @param {Array} [attrs] Boolean attributes to set on the element (ex: "sortable")
 * @returns {Promise<DataGrid>}
 */
export async function createStaticGrid(container, url, options = {}, attrs = []) {
    const json = await (await fetch(url)).json();
    const rows = Array.isArray(json) ? json : json.data ?? [];
    const fileOptions = Array.isArray(json) ? {} : json.options ?? {};
    const grid = new DataGrid({ ...fileOptions, ...options, dataSource: new ArrayDataSource(rows) });
    for (const attr of attrs) {
        grid.setAttribute(attr, "");
    }
    container.replaceChildren(grid);
    return grid;
}
