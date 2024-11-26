/**
 * Data Grid custom element
 * https://github.com/lekoala/data-grid/
 * @license MIT
 */

import DataGrid from "./src/data-grid.js";
// Optional plugins
import ColumnResizer from "./src/plugins/column-resizer.js";
import ContextMenu from "./src/plugins/context-menu.js";
import DraggableHeaders from "./src/plugins/draggable-headers.js";
import TouchSupport from "./src/plugins/touch-support.js";
import SelectableRows from "./src/plugins/selectable-rows.js";
import FixedHeight from "./src/plugins/fixed-height.js";
import AutosizeColumn from "./src/plugins/autosize-column.js";
import ResponsiveGrid from "./src/plugins/responsive-grid.js";
import RowActions from "./src/plugins/row-actions.js";
import EditableColumn from "./src/plugins/editable-column.js";
import SpinnerSupport from "./src/plugins/spinner-support.js";
import SaveState from "./src/plugins/save-state.js";

// Using shorthand property names
// This make them reserved and keys will be preserved
// Actual class names are renamed
DataGrid.registerPlugins({
  ColumnResizer,
  ContextMenu,
  DraggableHeaders,
  TouchSupport,
  SelectableRows,
  FixedHeight,
  AutosizeColumn,
  ResponsiveGrid,
  RowActions,
  EditableColumn,
  SpinnerSupport,
  SaveState
});

// Prevent errors if included multiple times
if (!customElements.get("data-grid")) {
  customElements.define("data-grid", DataGrid);
}

export default DataGrid;

const global = typeof globalThis !== "undefined" ? globalThis : self;
global.DataGrid = DataGrid;