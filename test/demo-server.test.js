import { afterAll, beforeAll, expect, test } from "bun:test";
import { start } from "../demo/server.js";

let server;
let base;

beforeAll(() => {
    server = start(0);
    base = `http://localhost:${server.port}`;
});

afterAll(() => {
    server.stop();
});

test("paginates with page and pageSize", async () => {
    const res = await Bun.fetch(`${base}/api/users?page=2&pageSize=5`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(5);
    expect(json.meta.total).toBe(998);
    expect(json.meta.filtered).toBe(998);
    expect(json.data[0].id).toBe(6);
});

test("sorts by field and direction", async () => {
    const res = await Bun.fetch(`${base}/api/users?sort[0][field]=company&sort[0][direction]=desc`);
    const json = await res.json();
    expect(json.data[0].company).toBe("Google");
});

test("filters with bracket notation", async () => {
    const res = await Bun.fetch(`${base}/api/users?filters[company][operator]=eq&filters[company][value]=Acme`);
    const json = await res.json();
    expect(json.meta.filtered).toBe(333);
    for (const row of json.data) {
        expect(row.company).toBe("Acme");
    }
});

test("reports errors through /api/errors", async () => {
    const res = await Bun.fetch(`${base}/api/errors`);
    expect(res.status).toBe(500);
});

test("serves static files from the repo root", async () => {
    const res = await Bun.fetch(`${base}/demo/index.html`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
});

test("edit persists an in-memory override", async () => {
    const res = await Bun.fetch(`${base}/api/users?action=edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { id: 1, company: "Changed" } }),
    });
    expect(res.status).toBe(200);

    const check = await Bun.fetch(`${base}/api/users?filters[company][operator]=eq&filters[company][value]=Changed`);
    const json = await check.json();
    expect(json.meta.filtered).toBe(1);
    expect(json.data[0].id).toBe(1);
});
