/**
 * Verifies that committed artifacts (`dist/`, `custom-elements.json`) are in
 * sync with the sources.
 *
 * On drift, prints only the file names plus the fix: never the diff content,
 * because minified JS/CSS artifacts are single huge lines that would drown the
 * output. Run `bun run build` and commit the regenerated files to resolve.
 */
import { execSync } from "node:child_process";

try {
    execSync("git diff --exit-code --quiet -- dist custom-elements.json", { stdio: "ignore" });
    console.log("Artifacts in sync.");
} catch {
    const files = execSync("git diff --name-only -- dist custom-elements.json", { encoding: "utf8" }).trim();
    console.error(`Committed artifacts drifted from sources:\n\n${files}\n\nRun "bun run build" and commit the regenerated files.`);
    process.exit(1);
}
