import { describe, expect, test } from "bun:test";

const manifest = await Bun.file("custom-elements.json").json();
const grid = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((declaration) => declaration.name === "DataGrid");

describe("custom elements manifest", () => {
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
