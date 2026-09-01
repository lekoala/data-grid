/**
 * Generate custom-elements.json (Custom Elements Manifest 2.1.0) from source.
 *
 * The sources are read as text: the script never imports the browser-only
 * modules under Bun. The JS source stays the single source of truth:
 * - attributes come from the `OPTION_ATTRIBUTES` and `INITIAL_ATTRIBUTES` schemas
 * - members come from methods/getters explicitly marked with `@public`
 * - events come from literal `dispatch(...)` / `new CustomEvent(...)` calls
 * - CSS custom properties come from the public token block in css/_core.css
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "custom-elements.json";
const SCHEMA_VERSION = "2.1.0";
const TAG = "data-grid";

/**
 * @param {string} file
 * @returns {Promise<string>}
 */
const read = (file) => readFile(file, "utf8");

/**
 * Extract the declarative option and initial-query attribute names.
 * @param {string} source
 * @returns {string[]}
 */
function extractAttributes(source) {
    const names = [];
    for (const constant of ["OPTION_ATTRIBUTES", "INITIAL_ATTRIBUTES"]) {
        const schema = source.match(new RegExp(`const\\s+${constant}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
        if (!schema) {
            continue;
        }
        for (const m of schema[1].matchAll(/(?:^|\n)    (?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:/g)) {
            names.push(m[1] ?? m[2] ?? m[3]);
        }
    }
    if (names.length) {
        return names;
    }

    const match = source.match(/static\s+get\s+observedAttributes\s*\(\)\s*\{([\s\S]*?)\n\s*\}/);
    if (!match) {
        return [];
    }
    for (const m of match[1].matchAll(/"([^"]+)"/g)) {
        names.push(m[1]);
    }
    return names;
}

/**
 * Extract methods/getters/fields whose preceding JSDoc block contains `@public`.
 * @param {string} source
 * @returns {Array<{ kind: string, name: string, description: string, static?: boolean }>}
 */
function extractPublicMembers(source) {
    const lines = source.split("\n");
    const members = [];
    /** @type {string[]|null} */
    let doc = null;
    /** @type {string|null} */
    let pendingDoc = null;
    for (const line of lines) {
        if (doc) {
            if (line.includes("*/")) {
                doc.push(line);
                const text = doc.join("\n");
                doc = null;
                pendingDoc = /@public/.test(text) ? text : null;
            } else {
                doc.push(line);
            }
            continue;
        }
        if (pendingDoc) {
            const def = line
                .trim()
                .match(/^(?:(static)\s+)?(?:(async|get)\s+)?([A-Za-z_$][\w$]*)\s*(\(|=|\{)/);
            if (def) {
                const [, staticModifier, memberModifier, name, delimiter] = def;
                let kind = "method";
                if (memberModifier === "get") {
                    kind = "getter";
                } else if (delimiter === "=") {
                    kind = "field";
                }
                members.push({
                    kind,
                    name,
                    static: staticModifier === "static",
                    description: extractDescription(pendingDoc),
                });
            }
            pendingDoc = null;
        }
        if (/^\s*\/\*\*/.test(line)) {
            doc = [line];
            if (line.includes("*/")) {
                const text = doc.join("\n");
                doc = null;
                pendingDoc = /@public/.test(text) ? text : null;
            }
        }
    }
    return members;
}

/**
 * @param {string} text
 * @returns {string}
 */
function extractDescription(text) {
    const description = text
        .replace(/\/\*+|\*+\//g, "")
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, "").trim())
        .filter((l) => l && !l.startsWith("@"))
        .join(" ");
    return description || undefined;
}

/**
 * Extract literal event names from `dispatch(...)` and `new CustomEvent(...)`.
 * @param {string} source
 * @returns {string[]}
 */
function extractEvents(source) {
    const names = [];
    for (const m of source.matchAll(/dispatch\(\s*[^,]+,\s*"([^"]+)"\s*(?:,|\))/g)) {
        names.push(m[1]);
    }
    for (const m of source.matchAll(/new\s+CustomEvent\(\s*"([^"]+)"\s*(?:,|\))/g)) {
        names.push(m[1]);
    }
    return names;
}

/**
 * Extract the public --dg-* tokens from the base data-grid block.
 * @param {string} css
 * @returns {string[]}
 */
function extractCssProperties(css) {
    const block = css.match(/data-grid\s*\{([\s\S]*?)\n\}/);
    if (!block) {
        return [];
    }
    const [publicPart] = block[1].split("/* internal tokens */");
    const names = [];
    for (const m of publicPart.matchAll(/(--dg-[a-z][\w-]*)/g)) {
        if (!names.includes(m[1])) {
            names.push(m[1]);
        }
    }
    return names;
}

async function main() {
    const gridSource = await read("src/data-grid.js");
    const cssSource = await read("css/_core.css");

    const pluginFiles = (await readdir("src/plugins"))
        .filter((f) => f.endsWith(".js"))
        .sort()
        .map((f) => join("src/plugins", f));
    const allPluginSources = await Promise.all(pluginFiles.map(read));

    const attributes = extractAttributes(gridSource);
    const members = extractPublicMembers(gridSource);
    const events = [
        ...extractEvents(gridSource),
        ...allPluginSources.flatMap(extractEvents),
    ].filter((name, i, all) => all.indexOf(name) === i).sort();
    const cssProperties = extractCssProperties(cssSource);

    const manifest = {
        schemaVersion: SCHEMA_VERSION,
        readme: "readme.md",
        modules: [
            {
                kind: "javascript-module",
                path: "src/data-grid.js",
                declarations: [
                    {
                        kind: "class",
                        name: "DataGrid",
                        description: "Server-first, explicitly paginated data grid web component.",
                        tagName: TAG,
                        attributes: attributes.map((name) => ({ name })),
                        members: members.map(({ kind, name, static: isStatic, description }) => ({
                            kind,
                            name,
                            ...(isStatic ? { static: true } : {}),
                            ...(description ? { description } : {}),
                        })),
                        events: events.map((name) => ({ name })),
                        cssProperties: cssProperties.map((name) => ({ name })),
                    },
                ],
                exports: [
                    { kind: "js", name: "DataGrid", declaration: { name: "DataGrid", module: "src/data-grid.js" } },
                    { kind: "js", name: "default", declaration: { name: "DataGrid", module: "src/data-grid.js" } },
                ],
            },
        ],
    };

    await writeFile(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`wrote ${OUT} (${attributes.length} attributes, ${members.length} members, ${events.length} events, ${cssProperties.length} css properties)`);
}

await main();
