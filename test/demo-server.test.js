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
    expect(json.rows).toHaveLength(5);
    expect(json.total).toBe(998);
    expect(json.meta.unfilteredTotal).toBe(998);
    expect(json.rows[0].id).toBe(6);
});

test("sorts by field and direction", async () => {
    const res = await Bun.fetch(`${base}/api/users?sort[0][field]=company&sort[0][direction]=desc`);
    const json = await res.json();
    expect(json.rows[0].company).toBe("Google");
});

test("filters with bracket notation", async () => {
    const res = await Bun.fetch(`${base}/api/users?filters[company][operator]=eq&filters[company][value]=Acme`);
    const json = await res.json();
    expect(json.total).toBe(333);
    for (const row of json.rows) {
        expect(row.company).toBe("Acme");
    }
});

test("searches with the global search parameter", async () => {
    const res = await Bun.fetch(`${base}/api/users?search=First+name+500`);
    const json = await res.json();
    expect(json.total).toBe(1);
    for (const row of json.rows) {
        expect(row.first_name).toContain("First name 500");
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
    expect(json.total).toBe(1);
    expect(json.rows[0].id).toBe(1);
});

test("serves the full edit form fragment", async () => {
    const res = await Bun.fetch(`${base}/api/users/1/edit`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('action="/api/users/1/edit"');
    expect(html).toContain('name="first_name"');
    expect(html).toContain('value="First name 1"');
    expect(html).toContain("novalidate");
});

test("the full edit fragment is a 404 for an unknown row", async () => {
    const res = await Bun.fetch(`${base}/api/users/9999/edit`);
    expect(res.status).toBe(404);
});

test("the full edit route rejects invalid input with 422", async () => {
    const form = new NativeFormData();
    form.set("first_name", "");
    form.set("last_name", "Last name 2");
    form.set("company", "Acme");
    const res = await Bun.fetch(`${base}/api/users/2/edit`, { method: "POST", body: form });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors.first_name).toBe("First name is required.");
});

test("the full edit route persists a valid form", async () => {
    const form = new NativeFormData();
    form.set("first_name", "Edited");
    form.set("last_name", "Name 3");
    form.set("company", "Google");
    const res = await Bun.fetch(`${base}/api/users/3/edit`, { method: "POST", body: form });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.record.first_name).toBe("Edited");

    const check = await Bun.fetch(
        `${base}/api/users?filters[first_name][operator]=eq&filters[first_name][value]=Edited`,
    );
    const list = await check.json();
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0].id).toBe(3);
});
