import { test } from "bun:test";
import { runIsolatedTests } from "./isolated.js";

test("published ESM bundle in an isolated custom element registry", async () => {
    await runIsolatedTests(new URL("./fixtures/dist.cases.js", import.meta.url));
});
