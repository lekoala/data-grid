/**
 * Baseline gate: keep `src/` compatible with the ~2020 browser target by
 * construction (nodes/helpers drop transpilation; this is review + checks).
 *
 * Scans `src/**\/*.js` for APIs and syntax that are newer than the baseline or
 * explicitly off-contract. See AGENTS.md "Browser baseline (JS)" for the
 * authoritative Allow / Avoid list.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve("src");

/** @type {Array<{ re: RegExp, why: string }>} */
const RULES = [
    { re: /^(\s+)#\w+/gm, why: "private class members (#) are post-baseline" },
    { re: /structuredClone/g, why: "structuredClone is post-baseline" },
    { re: /Object\.hasOwn/g, why: "Object.hasOwn is post-baseline" },
    { re: /replaceAll/g, why: "replaceAll is post-baseline (use replace)" },
    { re: /scrollend/g, why: "scrollend is post-baseline (use scroll + debounce)" },
    { re: /getRootNode/g, why: "Node.getRootNode is post-baseline" },
    { re: /\.at\(/g, why: "Array.prototype.at is post-baseline" },
    { re: /#\{/g, why: "private class-field initializers are post-baseline" },
];

/** @param {string} path @returns {string[]} */
function files(path) {
    const out = [];
    for (const entry of readdirSync(path)) {
        const full = join(path, entry);
        if (statSync(full).isDirectory()) {
            out.push(...files(full));
        } else if (entry.endsWith(".js")) {
            out.push(full);
        }
    }
    return out;
}

const errors = [];
for (const file of files(ROOT)) {
    const content = readFileSync(file, "utf8");
    for (const rule of RULES) {
        for (const m of content.matchAll(rule.re)) {
            errors.push(`${file}:${lineOf(content, m.index)} ${rule.why}`);
        }
    }
}

/** @param {string} content @param {number} index @returns {number} */
function lineOf(content, index) {
    return content.slice(0, index).split("\n").length;
}

if (errors.length) {
    console.error("Baseline check failed:");
    for (const error of errors) {
        console.error(`  ${error}`);
    }
    process.exit(1);
}

console.log("Baseline check passed.");
