import { expect } from "bun:test";
import { fileURLToPath } from "node:url";

/**
 * Each published bundle defines its own data-grid constructor. Run its tests
 * in a fresh process so registration cannot mask or break the source class.
 * The .cases.js suffix keeps these suites out of normal test discovery.
 * @param {URL} suite
 */
export async function runIsolatedTests(suite) {
    const child = Bun.spawn([process.execPath, "test", fileURLToPath(suite)], {
        stdout: "pipe",
        stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
    ]);
    expect(exitCode, stdout + stderr).toBe(0);
}
