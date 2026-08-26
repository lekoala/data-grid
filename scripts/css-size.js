/**
 * Transfer size report for the built CSS: raw, gzip and brotli.
 *
 * Usage: bun run size (or bun scripts/css-size.js)
 */
import { readFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";

const FILES = ["dist/data-grid.css", "dist/data-grid.min.css"];

for (const file of FILES) {
    const bytes = readFileSync(file);
    /** @param {number} n */
    const kb = (n) => `${(n / 1024).toFixed(2)} KB`;
    console.log(
        `${file}: raw=${kb(bytes.length)} gzip=${kb(gzipSync(bytes).length)} brotli=${kb(brotliCompressSync(bytes).length)}`,
    );
}
