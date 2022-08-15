import DataGrid from "./src/data-grid.js";
import DataGridColumnResizer from "./src/plugins/column-resizer.js";
import DataGridContextMenu from "./src/plugins/context-menu.js";
import DataGridDraggableHeaders from "./src/plugins/draggable-headers.js";

DataGrid.registerPlugin("columnResizer", DataGridColumnResizer);
DataGrid.registerPlugin("contextMenu", DataGridContextMenu);
DataGrid.registerPlugin("draggableHeaders", DataGridDraggableHeaders);

customElements.define("data-grid", DataGrid);

export default DataGrid;
