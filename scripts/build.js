const BANNER = "/*** Data Grid Web Component * https://github.com/lekoala/data-grid ***/";

const targets = [
    { entry: "./data-grid.js", outfile: "dist/data-grid.js", minify: false },
    { entry: "./data-grid.js", outfile: "dist/data-grid.min.js", minify: true },
    { entry: "./css/data-grid.css", outfile: "dist/data-grid.css", minify: false },
    { entry: "./css/data-grid.css", outfile: "dist/data-grid.min.css", minify: true },
];

async function main() {
    for (const t of targets) {
        const result = await Bun.build({
            entrypoints: [t.entry],
            outdir: "dist",
            naming: t.outfile.replace("dist/", ""),
            target: "browser",
            format: "esm",
            minify: t.minify,
            sourcemap: "external",
        });
        if (!result.success) {
            for (const log of result.logs) {
                console.error(log);
            }
            process.exit(1);
        }
        const file = Bun.file(t.outfile);
        if (await file.exists()) {
            await Bun.write(t.outfile, `${BANNER}\n${await file.text()}`);
        }
    }
}

await main();
