import { describe, expect, test } from "bun:test";

const manifest = await Bun.file("custom-elements.json").json();
const grid = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((declaration) => declaration.name === "DataGrid");

describe("custom elements manifest", () => {
    test("includes public response state and inherited lifecycle events", () => {
        for (const name of ["rows", "total", "meta", "loading", "error"]) {
            expect(grid.members.find((member) => member.name === name)?.kind).toBe("field");
        }
        for (const name of ["connected", "disconnected"]) {
            expect(grid.events.some((event) => event.name === name)).toBe(true);
        }
    });
    test("includes public async methods", () => {
        expect(grid.members.find((member) => member.name === "loadLabels")).toMatchObject({
            kind: "method",
            name: "loadLabels",
            static: true,
        });
        expect(grid.members.find((member) => member.name === "load")).toMatchObject({
            kind: "method",
            name: "load",
        });
    });
});
