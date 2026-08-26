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

async function main() {
    for (const t of targets) {
        const result = await Bun.build({
            entrypoints: [t.entry],
            outdir: "dist",
            naming: t.outfile.replace("dist/", ""),
            target: "browser",
            format: "esm",
            minify: t.minify,
        });
        if (!result.success) {
            for (const log of result.logs) {
                console.error(log);
            }
            process.exit(1);
        }
        const file = Bun.file(t.outfile);
        if (await file.exists()) {
            const content = `${BANNER}\n${await file.text()}`;
            if (t.css) {
                assertNoLangSelectors(t.outfile, content);
            }
            await Bun.write(t.outfile, content);
        }
    }
}

await main();
