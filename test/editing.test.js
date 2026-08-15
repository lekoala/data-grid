import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import EditableColumn from "../src/plugins/editable-column.js";

async function makeReadyGrid(opts = {}, data = null) {
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
    document.body.removeChild(inst);
});
