/**
 * Baseline gate: keep `src/` compatible with the early-2022 browser target by
 * construction (nodes/helpers drop transpilation; this is review + checks).
 *
 * Scans `src/**\/*.js` for APIs that are newer than the baseline, and
 * `css/**\/*.css` for directional inline-axis
 * logical properties that Bun's CSS bundler would downlevel into :lang()
 * fallback sets. See AGENTS.md "Browser baseline (JS)" and
 * "Bun CSS workaround" for the authoritative Allow / Avoid lists.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** @type {Array<{ re: RegExp, why: string }>} */
const RULES = [
    { re: /scrollend/g, why: "scrollend is newer than the documented browser floor (use scroll + debounce)" },
];

/**
 * Directional inline-axis logical declarations get expanded by the bundler
 * into large generated :lang() LTR/RTL sets. Author them as physical LTR with
 * a [dir="rtl"] mirror in _rtl.css instead. Block-axis and sizing logical
 * properties are untouched by the bundler and allowed.
 * @type {Array<{ re: RegExp, why: string }>}
 */
const CSS_RULES = [
    {
        // The lookbehind keeps the deliberately-kept scroll-padding-inline-start legal.
        re: /(?<!scroll-)(?:^|[\s{;])(?:margin|padding|inset|border)-inline-(?:start|end)\s*:/,
        why: 'inline-direction start/end logical property triggers Bun :lang() downleveling (see AGENTS.md "Bun CSS workaround")',
    },
    {
        re: /(?:^|[\s{;])(?:margin|padding|inset|border)-inline\s*:/,
        why: 'inline-axis logical shorthand triggers Bun :lang() downleveling (see AGENTS.md "Bun CSS workaround")',
    },
];

/**
 * @param {string} path
 * @param {string} extension
 * @returns {string[]}
 */
function files(path, extension) {
    const out = [];
    for (const entry of readdirSync(path)) {
        const full = join(path, entry);
        if (statSync(full).isDirectory()) {
            out.push(...files(full, extension));
        } else if (entry.endsWith(extension)) {
            out.push(full);
        }
    }
    return out;
}

/**
 * @param {string} root
 * @param {Array<{ re: RegExp, why: string }>} rules
 * @param {string} extension
 * @returns {string[]}
 */
function scan(root, rules, extension) {
    const errors = [];
    for (const file of files(root, extension)) {
        const content = readFileSync(file, "utf8");
        for (const rule of rules) {
            for (const m of content.matchAll(new RegExp(rule.re.source, "g"))) {
                errors.push(`${file}:${lineOf(content, m.index)} ${rule.why}`);
            }
        }
    }
    return errors;
}

/** @param {string} content @param {number} index @returns {number} */
function lineOf(content, index) {
    return content.slice(0, index).split("\n").length;
}

const errors = [...scan(resolve("src"), RULES, ".js"), ...scan(resolve("css"), CSS_RULES, ".css")];

if (errors.length) {
    console.error("Baseline check failed:");
    for (const error of errors) {
        console.error(`  ${error}`);
    }
    process.exit(1);
}

console.log("Baseline check passed.");
