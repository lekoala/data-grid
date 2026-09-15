import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import EditableColumn from "../src/plugins/editable-column.js";

async function makeReadyGrid(opts = {}, data = null) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ EditableColumn });
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

const editableColumn = { field: "name", title: "Name", editable: true };

test("editable columns render an input with the row value", async () => {
    const inst = await makeReadyGrid({ columns: [editableColumn] }, [{ id: 1, name: "a" }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    expect(input.value).toBe("a");
    document.body.removeChild(inst);
});

test("blur commits and dispatches the edit event", async () => {
    const inst = await makeReadyGrid({ columns: [editableColumn] }, [{ id: 1, name: "a" }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    let detail = null;
    inst.addEventListener("edit", (ev) => {
        detail = ev.detail;
    });
    input.focus();
    expect(inst.querySelector("tbody td").hasAttribute("data-editing")).toBe(true);
    input.value = "b";
    input.blur();
    expect(detail).not.toBeNull();
    expect(detail.data.name).toBe("b");
    expect(detail.value).toBe("b");
    expect(detail.field).toBe("name");
    expect(inst.rows[0].name).toBe("b");
    expect(inst.querySelector("tbody td").hasAttribute("data-editing")).toBe(false);
    document.body.removeChild(inst);
});

test("Enter commits, Escape rejects without dispatching", async () => {
    const inst = await makeReadyGrid({ columns: [editableColumn] }, [{ id: 1, name: "a" }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    let dispatched = 0;
    inst.addEventListener("edit", () => {
        dispatched++;
    });

    input.value = "b";
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatched).toBe(1);
    expect(inst.rows[0].name).toBe("b");

    input.value = "c";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(dispatched).toBe(1);
    expect(inst.rows[0].name).toBe("b");
    document.body.removeChild(inst);
});

test("validate rejects invalid edits and sets data-invalid", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "name",
                    editable: true,
                    validate: (value) => (value.length >= 3 ? true : "Too short"),
                },
            ],
        },
        [{ id: 1, name: "abc" }],
    );
    const input = inst.querySelector("tbody td input.dg-editable");
    let dispatched = 0;
    inst.addEventListener("edit", () => {
        dispatched++;
    });

    input.value = "x";
    input.focus();
    input.blur();
    expect(dispatched).toBe(0);
    expect(inst.rows[0].name).toBe("abc");
    const td = inst.querySelector("tbody td");
    expect(td.hasAttribute("data-invalid")).toBe(true);
    expect(td.title).toBe("Too short");
    document.body.removeChild(inst);
});

test("options.validate acts as a grid-level fallback", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [editableColumn],
            validate: (value) => value !== "bad",
        },
        [{ id: 1, name: "ok" }],
    );
    const input = inst.querySelector("tbody td input.dg-editable");
    let dispatched = 0;
    inst.addEventListener("edit", () => {
        dispatched++;
    });

    input.value = "bad";
    input.focus();
    input.blur();
    expect(dispatched).toBe(0);
    expect(inst.rows[0].name).toBe("ok");

    input.value = "fine";
    input.focus();
    input.blur();
    expect(dispatched).toBe(1);
    expect(inst.rows[0].name).toBe("fine");
    document.body.removeChild(inst);
});

test("preventDefault on the edit event rejects the commit", async () => {
    const inst = await makeReadyGrid({ columns: [editableColumn] }, [{ id: 1, name: "a" }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    inst.addEventListener("edit", (ev) => ev.preventDefault());

    input.value = "b";
    input.focus();
    input.blur();
    expect(inst.rows[0].name).toBe("a");
    expect(input.value).toBe("a");
    document.body.removeChild(inst);
});

test("focus then blur without typing does not commit a numeric value", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "age", editable: true }] }, [{ id: 1, age: 42 }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    let dispatched = 0;
    inst.addEventListener("edit", () => {
        dispatched++;
    });

    input.focus();
    input.blur();
    expect(dispatched).toBe(0);
    expect(inst.rows[0].age).toBe(42);
    document.body.removeChild(inst);
});

test("null and undefined editable values render as empty, not 'null'/'undefined'", async () => {
    const inst = await makeReadyGrid({ columns: [editableColumn, { field: "age", editable: true }] }, [
        { id: 1, name: "a", age: null },
    ]);
    const inputs = inst.querySelectorAll("tbody td input.dg-editable");
    expect(inputs[1].value).toBe("");
    document.body.removeChild(inst);
});

test("editing a numeric model value commits a number, not a string", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "age", editable: true }] }, [{ id: 1, age: 42 }]);
    const input = inst.querySelector("tbody td input.dg-editable");
    let detail = null;
    inst.addEventListener("edit", (ev) => {
        detail = ev.detail;
    });

    input.focus();
    input.value = "43";
    input.blur();
    expect(inst.rows[0].age).toBe(43);
    expect(typeof inst.rows[0].age).toBe("number");
    expect(detail.value).toBe(43);
    expect(typeof detail.value).toBe("number");
    document.body.removeChild(inst);
});

test("clearing or entering a non-finite numeric value rejects and restores", async () => {
    for (const next of ["", "   ", "abc"]) {
        const inst = await makeReadyGrid({ columns: [{ field: "age", editable: true }] }, [{ id: 1, age: 42 }]);
        const input = inst.querySelector("tbody td input.dg-editable");
        let dispatched = 0;
        inst.addEventListener("edit", () => {
            dispatched++;
        });

        input.focus();
        input.value = next;
        input.blur();
        expect(dispatched).toBe(0);
        expect(inst.rows[0].age).toBe(42);
        expect(input.value).toBe("42");
        document.body.removeChild(inst);
    }
});

test("a null model value does not infer a number from the input type", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "age", editable: true, editableType: "number" }] }, [
        { id: 1, age: null },
    ]);
    const input = inst.querySelector("tbody td input.dg-editable");

    input.focus();
    input.value = "12";
    input.blur();
    expect(inst.rows[0].age).toBe("12");
    document.body.removeChild(inst);
});

test("input name replaces every dash in the grid id", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ EditableColumn });
    const inst = new DataGrid({ columns: [editableColumn], dataSource: new ArrayDataSource([{ id: 1, name: "a" }]) });
    inst.setAttribute("id", "my-grid-id");
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    const input = inst.querySelector("tbody td input.dg-editable");
    expect(input.name).toBe("my_grid_id[1][name]");
    document.body.removeChild(inst);
});

const statusColumn = {
    field: "status",
    title: "Status",
    editable: true,
    editableType: "select",
    editableOptions: [
        { value: "paid", label: "Paid" },
        { value: "unpaid", label: "Unpaid" },
    ],
};

function changeSelect(select, value) {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
}

test("select editors render options with the row value selected and reflected", async () => {
    const inst = await makeReadyGrid({ columns: [statusColumn] }, [{ id: 1, status: "unpaid" }]);
    const select = inst.querySelector("tbody td select.dg-editable");
    expect(select).toBeTruthy();
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(select.value).toBe("unpaid");
    expect(select.dataset.value).toBe("unpaid");
    expect(select.getAttribute("aria-label")).toBe("Status");
    expect(select.dataset.field).toBe("status");
    document.body.removeChild(inst);
});

test("select editors use the standard caret wrapper", async () => {
    const inst = await makeReadyGrid({ columns: [statusColumn] }, [{ id: 1, status: "paid" }]);
    const select = inst.querySelector("tbody td select.dg-editable");
    expect(select.closest(".dg-select-field")).toBeTruthy();
    document.body.removeChild(inst);
});

test("changing the select commits, dispatches and follows data-value", async () => {
    const inst = await makeReadyGrid({ columns: [statusColumn] }, [{ id: 1, status: "unpaid" }]);
    const select = inst.querySelector("tbody td select.dg-editable");
    let detail = null;
    inst.addEventListener("edit", (ev) => {
        detail = ev.detail;
    });
    changeSelect(select, "paid");
    expect(detail).not.toBeNull();
    expect(detail.value).toBe("paid");
    expect(detail.field).toBe("status");
    expect(detail.data.status).toBe("paid");
    expect(inst.rows[0].status).toBe("paid");
    expect(select.dataset.value).toBe("paid");
    document.body.removeChild(inst);
});

test("preventDefault on the edit event reverts the select and its data-value", async () => {
    const inst = await makeReadyGrid({ columns: [statusColumn] }, [{ id: 1, status: "unpaid" }]);
    const select = inst.querySelector("tbody td select.dg-editable");
    inst.addEventListener("edit", (ev) => ev.preventDefault());
    changeSelect(select, "paid");
    expect(inst.rows[0].status).toBe("unpaid");
    expect(select.value).toBe("unpaid");
    expect(select.dataset.value).toBe("unpaid");
    document.body.removeChild(inst);
});

test("select editors coerce numeric model values like inputs do", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "level",
                    title: "Level",
                    editable: true,
                    editableType: "select",
                    editableOptions: [
                        { value: 1, label: "One" },
                        { value: 2, label: "Two" },
                    ],
                },
            ],
        },
        [{ id: 1, level: 1 }],
    );
    const select = inst.querySelector("tbody td select.dg-editable");
    expect(select.value).toBe("1");
    changeSelect(select, "2");
    expect(inst.rows[0].level).toBe(2);
    expect(typeof inst.rows[0].level).toBe("number");
    document.body.removeChild(inst);
});

test("Escape on a select neither rejects nor dispatches", async () => {
    const inst = await makeReadyGrid({ columns: [statusColumn] }, [{ id: 1, status: "unpaid" }]);
    const select = inst.querySelector("tbody td select.dg-editable");
    let dispatched = 0;
    inst.addEventListener("edit", () => {
        dispatched++;
    });
    select.focus();
    select.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(dispatched).toBe(0);
    expect(inst.rows[0].status).toBe("unpaid");
    expect(select.value).toBe("unpaid");
    document.body.removeChild(inst);
});

test("plain string options use the same text as value and label", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "status", editable: true, editableType: "select", editableOptions: ["paid", "unpaid"] }],
        },
        [{ id: 1, status: "paid" }],
    );
    const select = inst.querySelector("tbody td select.dg-editable");
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(select.value).toBe("paid");
    expect(select.dataset.value).toBe("paid");
    document.body.removeChild(inst);
});
