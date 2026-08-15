import { start } from "../../demo/server.js";

export const IS_WINDOWS = process.platform === "win32";

let server;
let base;

/**
 * Start the demo server once per test file and memoize the base URL.
 * @returns {String}
 */
export function ensureServer() {
    if (!server) {
        server = start(0);
        base = `http://localhost:${server.port}`;
    }
    return base;
}

/**
 * Stop the demo server (call in afterAll).
 */
export function stopServer() {
    server?.stop();
    server = null;
    base = "";
}

/**
 * Create a WebView. Backend is left to the platform (Chrome on Linux CI,
 * WKWebView on macOS) so the same tests run on both.
 * @returns {Bun.WebView}
 */
export function view() {
    return new Bun.WebView({ width: 1280, height: 900 });
}

/**
 * Poll the page until `expr` is truthy or the timeout elapses.
 * @param {Bun.WebView} view
 * @param {String} expr
 * @param {Number} ms
 */
export async function waitFor(view, expr, ms = 8000) {
    await view.evaluate(`(async () => {
        const t0 = Date.now();
        while (true) {
            try {
                if (Boolean(${expr})) return;
            } catch {
                // expression not defined yet
            }
            if (Date.now() - t0 > ${ms}) throw new Error("timeout waiting for: ${expr}");
            await new Promise((r) => setTimeout(r, 50));
        }
    })()`);
}

/**
 * Evaluate an expression in the page and return its value.
 * @param {Bun.WebView} view
 * @param {String} expr
 * @returns {Promise<*>}
 */
export async function read(view, expr) {
    return view.evaluate(`(() => ${expr})()`);
}
