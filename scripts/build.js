const BANNER = "/*** Data Grid Web Component * https://github.com/lekoala/data-grid ***/";

const targets = [
    { entry: "./data-grid.js", outfile: "dist/data-grid.js", minify: false },
    { entry: "./data-grid.js", outfile: "dist/data-grid.min.js", minify: true },
    { entry: "./css/data-grid.css", outfile: "dist/data-grid.css", minify: false, css: true },
    { entry: "./css/data-grid.css", outfile: "dist/data-grid.min.css", minify: true, css: true },
];

/**
 * Generated DataGrid CSS must not contain :lang() selectors. RTL is driven by
 * [dir="rtl"] (css/_rtl.css); a :lang() here means Bun/Lightning CSS downleveled
 * a directional inline-axis logical property into language-based fallbacks.
 * See AGENTS.md "Bun CSS workaround".
 * @param {string} file
 * @param {string} css
 */
function assertNoLangSelectors(file, css) {
    if (css.includes(":lang(")) {
        throw new Error(
            `${file}: generated CSS contains :lang() selectors. An inline-direction logical property was downleveled by the bundler - author it as physical LTR with a [dir="rtl"] mirror instead (see AGENTS.md "Bun CSS workaround").`,
        );
    }
}

/** @typedef {"esm"|"iife"} BundleFormat */
/** @typedef {Record<string, string>} BundleLoader */

/**
 * @param {Object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {boolean} options.minify
 * @param {boolean} [options.css] Emit a CSS bundle instead of a JS bundle
 * @param {BundleFormat} [options.format] Bun output module format ("esm" is the default)
 * @param {BundleLoader} [options.loader] Bun bundler loaders, e.g. `{ ".css": "text" }` to inline a stylesheet as a string
 * @param {boolean} [options.assertNoLang] Apply the no-:lang() gate to the emitted output (CSS or CSS-embedding JS)
 */
async function bundle(options) {
    const result = await Bun.build({
        entrypoints: [options.entry],
        outdir: "dist",
        naming: options.outfile.replace("dist/", ""),
        target: "browser",
        format: options.format ?? "esm",
        minify: options.minify,
        ...(options.css ? { css: true } : {}),
        ...(options.loader ? { loader: options.loader } : {}),
    });
    if (!result.success) {
        for (const log of result.logs) {
            console.error(log);
        }
        process.exit(1);
    }
    const file = Bun.file(options.outfile);
    if (await file.exists()) {
        const content = `${BANNER}\n${await file.text()}`;
        if (options.assertNoLang) {
            assertNoLangSelectors(options.outfile, content);
        }
        await Bun.write(options.outfile, content);
    }
}

async function main() {
    for (const t of targets) {
        await bundle({ entry: t.entry, outfile: t.outfile, minify: t.minify, css: t.css, assertNoLang: t.css });
    }

    // Zero-config standalone: a single IIFE that auto-registers the element and
    // injects the stylesheet. Minified only - dist/data-grid.min.js already
    // covers unminified debugging. The text loader inlines dist/data-grid.min.css
    // as a string; without it Bun would emit the stylesheet as a second output
    // file and fail on the fixed `naming`.
    await bundle({
        entry: "scripts/standalone.js",
        outfile: "dist/data-grid.standalone.min.js",
        minify: true,
        format: "iife",
        loader: { ".css": "text" },
        assertNoLang: true,
    });
}

await main();
