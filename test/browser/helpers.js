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
 * Create a WebView. On Linux the Chrome backend is requested explicitly with
 * the path from BUN_CHROME_PATH (when set) and the subprocess output is
 * inherited so a silently crashing Chrome surfaces its stderr. macOS keeps the
 * platform default WKWebView. Tall viewport so the multiple fixture grids (and
 * their footers) fit without scrolling.
 * @returns {Bun.WebView}
 */
export function view() {
    const chromePath = process.env.BUN_CHROME_PATH;

    if (process.platform === "linux" && chromePath) {
        return new Bun.WebView({
            width: 1280,
            height: 3000,
            backend: {
                type: "chrome",
                path: chromePath,
                stdout: "inherit",
                stderr: "inherit",
            },
        });
    }

    return new Bun.WebView({ width: 1280, height: 3000 });
}

/**
 * Poll the page until `expr` is truthy or the timeout elapses.
 * @param {Bun.WebView} view
 * @param {String} expr
 * @param {Number} ms
 */
export async function waitFor(view, expr, ms = 8000) {
    // Serialize so double quotes in the expression cannot break the generated
    // `throw new Error(...)` string literal.
    const timeoutMessage = JSON.stringify(`timeout waiting for: ${expr}`);
    await view.evaluate(`(async () => {
        const t0 = Date.now();
        while (true) {
            try {
                if (Boolean(${expr})) return;
            } catch {
                // expression not defined yet
            }
            if (Date.now() - t0 > ${ms}) throw new Error(${timeoutMessage});
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
