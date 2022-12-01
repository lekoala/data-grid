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
});

customElements.define("data-grid", DataGrid);

export default DataGrid;
