import test from "ava";
import DataGrid from "../data-grid.js";

/**
 * @returns {import("../src/data-grid.js").default}
 */
function getGrid() {
  //@ts-ignore
  return customElements.get("data-grid");
}

/**
 * @returns {DataGrid}
 */
function makeInst(opts = {}) {
  const ctor = getGrid();
  // @ts-ignore
  return new ctor(opts);
}

// Need this otherwise it fails?
Event = window.Event;
CustomEvent = window.CustomEvent;

test("it is registered", (t) => {
  t.assert(makeInst() instanceof DataGrid);
});

test("options are registed", (t) => {
  let inst = makeInst({
    perPage: 20,
  });
  t.is(inst.options.perPage, 20);
  let inst2 = makeInst();
  t.is(inst2.options.perPage, 10);
});

test("it can set labels", async (t) => {
  DataGrid.setLabels({
    items: "rows",
  });

  let inst = makeInst();
  document.body.appendChild(inst);

  await new Promise((resolve) => {
    setTimeout(() => {
      t.assert(inst.textContent.includes("rows"));
      t.assert(!inst.textContent.includes("items"));
      resolve();
    }, 50);
  });
});

test("it can register plugins", (t) => {
  t.assert(Object.keys(DataGrid.registeredPlugins()).length > 0);
  DataGrid.unregisterPlugins();
  t.assert(Object.keys(DataGrid.registeredPlugins()).length == 0);
});
