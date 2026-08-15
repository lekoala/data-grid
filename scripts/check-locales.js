/**
 * Locale completeness gate: compare every shipped locale against English.
 *
 * The locale modules are auto-applicative (they import data-grid.js which
 * registers the element), so provide the minimal browser globals Bun lacks.
 *
 * Fails if:
 * - a key is missing or unknown
 * - a value is not a string
 * - the set of {placeholders} differs from English for a key
 */

// data-grid.js touches DOM globals at import time; Bun has none.
if (globalThis.customElements === undefined) {
    globalThis.customElements = { get: () => undefined, define: () => {} };
}
if (globalThis.HTMLElement === undefined) {
    globalThis.HTMLElement = class HTMLElement {};
}

const LOCALES = ["en", "fr", "nl", "de", "es", "it", "pt-BR", "pt-PT", "zh-CN", "ja", "ko", "ar", "hi", "ru", "tr", "id", "pl"];

/**
 * @param {string} value
 * @returns {string}
 */
function placeholders(value) {
    return [...String(value).matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join(",");
}

const reference = (await import("../locales/en.js")).default;
const expectedKeys = Object.keys(reference);
const errors = [];

for (const name of LOCALES) {
    const labels = (await import(`../locales/${name}.js`)).default;

    for (const key of expectedKeys) {
        const value = labels[key];
        if (value === undefined) {
            errors.push(`${name}: missing key "${key}"`);
            continue;
        }
        if (typeof value !== "string") {
            errors.push(`${name}: "${key}" is not a string`);
            continue;
        }
        if (placeholders(value) !== placeholders(reference[key])) {
            errors.push(`${name}: "${key}" placeholders differ (expected "${reference[key]}", got "${value}")`);
        }
    }

    for (const key of Object.keys(labels)) {
        if (!expectedKeys.includes(key)) {
            errors.push(`${name}: unknown key "${key}"`);
        }
    }
}

if (errors.length) {
    console.error(`Locale check failed (${errors.length}):`);
    for (const error of errors) {
        console.error(`  - ${error}`);
    }
    process.exit(1);
}

console.log(`locales ok: ${LOCALES.length} locales, ${expectedKeys.length} keys each`);
