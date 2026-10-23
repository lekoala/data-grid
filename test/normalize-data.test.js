import { expect, test } from "bun:test";
import normalizeData from "../src/utils/normalizeData.js";

test("JSON attribute values preserve literal and encoded percent signs", () => {
    expect(normalizeData('{"discount":"15%","encoded":"%20","bad":"%ZZ"}')).toEqual({
        discount: "15%",
        encoded: "%20",
        bad: "%ZZ",
    });
    expect(normalizeData("['15%', '20%']")).toEqual(["15%", "20%"]);
});

test("legacy percent-encoded JSON attributes still parse", () => {
    expect(normalizeData("{%22discount%22:%2215%25%22}")).toEqual({ discount: "15%" });
});
