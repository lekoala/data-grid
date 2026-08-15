/**
 * Packaging gate: verify the npm tarball content.
 *
 * Runs `npm pack --dry-run --json` and asserts:
 * - the public artifacts that must ship are present
 * - dev-only sources are absent
 * - every `exports` target (import/types) resolves inside the package
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const out = execFileSync(npm, ["pack", "--dry-run", "--json"], { encoding: "utf8" });
const [result] = JSON.parse(out);
const paths = result.files.map((f) => f.path);
const has = (p) => paths.includes(p);
const hasPrefix = (prefix) => paths.some((p) => p.startsWith(prefix));

const errors = [];

const mustInclude = [
    "data-grid.js",
    "src/data-source.js",
    "dist/types/data-grid.d.ts",
    "dist/types/data-source.d.ts",
    "custom-elements.json",
    "themes/bootstrap.css",
    "docs/development.md",
    "readme.md",
    "LICENSE",
    "locales/en.js",
];
for (const p of mustInclude) {
    if (!has(p)) {
        errors.push(`missing from package: ${p}`);
    }
}

for (const prefix of ["dist/types/", "themes/", "docs/", "locales/"]) {
    if (!hasPrefix(prefix)) {
        errors.push(`missing files under ${prefix}`);
    }
}

for (const prefix of ["test/", "demo/", "css/", "scripts/", ".github/"]) {
    if (hasPrefix(prefix)) {
        errors.push(`unexpected dev files under ${prefix}`);
    }
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const [subpath, entry] of Object.entries(pkg.exports ?? {})) {
    // Wildcard subpaths ("/locales/*") are resolved by Node per file; assert
    // the referenced glob expands inside the package instead of a single file.
    if (subpath.includes("*") || entry === undefined || typeof entry !== "object") {
        continue;
    }
    for (const key of ["import", "types"]) {
        const target = entry[key];
        if (!target) {
            continue;
        }
        const rel = target.replace(/^\.\//, "");
        if (!has(rel)) {
            errors.push(`exports["${subpath}"].${key} -> ${target} not found in package`);
        }
    }
}

if (errors.length) {
    console.error("Package check failed:");
    for (const e of errors) {
        console.error(`  - ${e}`);
    }
    process.exit(1);
}

console.log(`package ok: ${paths.length} files, ${(result.unpackedSize / 1024).toFixed(1)} kB unpacked`);
