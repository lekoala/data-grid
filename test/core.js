import test from "ava";
import DataGrid from "../data-grid.js";

test("it is registered", (t) => {
  let inst = customElements.get("data-grid");
  t.is(inst, DataGrid);
});
