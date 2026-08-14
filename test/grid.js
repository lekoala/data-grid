import test from "ava";
import DataGrid from "../data-grid.js";

/**
 * Create a connected grid instance, ready for assertions
 * @param {Object} opts
 * @param {Array|null} data
 * @returns {Promise<DataGrid>}
 */
async function makeReadyGrid(opts = {}, data = null) {
  const inst = new DataGrid(opts);
  if (data !== null) {
    inst.preload({ data });
  }
  document.body.appendChild(inst);
  await new Promise((resolve) => {
    inst.addEventListener("connected", resolve, { once: true });
    // Fallback if the connected event never fires
    setTimeout(resolve, 2000);
  });
  return inst;
}

function removeGrid(inst) {
  document.body.removeChild(inst);
}

test("it is registered", (t) => {
  let inst = customElements.get("data-grid");
  t.is(inst, DataGrid);
});

test("row cells get the correct aria-colindex", async (t) => {
  const inst = await makeReadyGrid(
    {
      columns: [
        { field: "name", title: "Name" },
        { field: "age", title: "Age" },
      ],
    },
    [{ name: "Alice", age: 30 }],
  );

  const tds = inst.querySelectorAll("tbody tr td[aria-colindex]");
  t.is(tds[0].getAttribute("aria-colindex"), "1");
  t.is(tds[1].getAttribute("aria-colindex"), "2");
  removeGrid(inst);
});

test("reconnecting the element does not duplicate the template", async (t) => {
  const inst = await makeReadyGrid({}, []);
  t.is(inst.querySelectorAll("table").length, 1);

  // Disconnect and wait for the disconnected callback to complete
  removeGrid(inst);
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Reconnect
  document.body.appendChild(inst);
  await new Promise((resolve) => {
    inst.addEventListener("connected", resolve, { once: true });
    setTimeout(resolve, 2000);
  });

  t.is(inst.querySelectorAll("table").length, 1);
  removeGrid(inst);
});

test("clicking a sortable header toggles aria-sort and sorts rows", async (t) => {
  const inst = await makeReadyGrid(
    {
      columns: [{ field: "name", title: "Name" }],
      sort: true,
    },
    [{ name: "b" }, { name: "a" }],
  );

  const th = inst.querySelector("thead tr.dg-head-columns th[aria-sort]");
  t.truthy(th);

  th.click();
  t.is(th.getAttribute("aria-sort"), "ascending");
  t.is(inst.querySelector("tbody tr td").textContent, "a");

  th.click();
  t.is(th.getAttribute("aria-sort"), "descending");
  t.is(inst.querySelector("tbody tr td").textContent, "b");
  removeGrid(inst);
});

test("sortable header reacts to Enter and Space", async (t) => {
  const inst = await makeReadyGrid(
    {
      columns: [{ field: "name", title: "Name" }],
      sort: true,
    },
    [{ name: "b" }, { name: "a" }],
  );

  const th = inst.querySelector("thead tr.dg-head-columns th[aria-sort]");
  th.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  t.is(th.getAttribute("aria-sort"), "ascending");
  th.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
  t.is(th.getAttribute("aria-sort"), "descending");
  removeGrid(inst);
});

test("clearFilters clears the filter inputs", async (t) => {
  const inst = await makeReadyGrid(
    {
      columns: [{ field: "name", title: "Name" }],
      filter: true,
    },
    [{ name: "Alice" }],
  );

  const input = inst.querySelector(".dg-head-filters input");
  t.truthy(input);
  input.value = "zzz";
  inst.clearFilters();
  t.is(input.value, "");
  removeGrid(inst);
});
