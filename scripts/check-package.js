/**
 * Packaging gate: verify the npm tarball content.
 *
 * Runs `npm pack --dry-run --json` and asserts:
 * - the public artifacts that must ship are present
 * - dev-only sources are absent
 * - the `main` and every `exports` target resolve inside the package
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const npmCommand = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const npmArgs =
    process.platform === "win32"
        ? ["/d", "/s", "/c", "npm pack --dry-run --json"]
        : ["pack", "--dry-run", "--json"];
const out = execFileSync(npmCommand, npmArgs, { encoding: "utf8" });
const [result] = JSON.parse(out);
const paths = result.files.map((f) => f.path);
const has = (p) => paths.includes(p);
const hasPrefix = (prefix) => paths.some((p) => p.startsWith(prefix));

const errors = [];

const mustInclude = [
    "data-grid.js",
    "src/data-source.js",
    "dist/data-grid.css",
    "dist/data-grid.min.css",
    "dist/data-grid.standalone.min.js",
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

if (typeof pkg.main === "string") {
    const rel = pkg.main.replace(/^\.\//, "");
    if (!has(rel)) {
        errors.push(`main -> ${pkg.main} not found in package`);
    }
}

function collectExportTargets(entry) {
    if (typeof entry === "string") {
        return [entry];
    }
    if (!entry || typeof entry !== "object") {
        return [];
    }
    let targets = [];
    for (const value of Object.values(entry)) {
        targets = targets.concat(collectExportTargets(value));
    }
    return targets;
}

for (const [subpath, entry] of Object.entries(pkg.exports ?? {})) {
    // Wildcard subpaths ("/locales/*") are resolved by Node per file; assert
    // the referenced glob expands inside the package instead of a single file.
    if (subpath.includes("*")) {
        continue;
    }
    for (const target of collectExportTargets(entry)) {
        const rel = target.replace(/^\.\//, "");
        if (!has(rel)) {
            errors.push(`exports["${subpath}"] -> ${target} not found in package`);
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
