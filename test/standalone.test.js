import { test } from "bun:test";
import { runIsolatedTests } from "./isolated.js";

test("published standalone bundle in an isolated custom element registry", async () => {
    await runIsolatedTests(new URL("./fixtures/standalone.cases.js", import.meta.url));
});
