import { expect, test } from "bun:test";
import { parseBooleanAttribute, parseEnumAttribute, parseIntegerListAttribute } from "../src/utils/attributes.js";

test("parseBooleanAttribute treats bare, true and 1 as true", () => {
    expect(parseBooleanAttribute("")).toBe(true);
    expect(parseBooleanAttribute("true")).toBe(true);
    expect(parseBooleanAttribute("1")).toBe(true);
});

test("parseBooleanAttribute treats false and 0 as false", () => {
    expect(parseBooleanAttribute("false")).toBe(false);
    expect(parseBooleanAttribute("0")).toBe(false);
});

test("parseBooleanAttribute rejects unknown values", () => {
    expect(parseBooleanAttribute("maybe")).toBe(false);
});

test("parseIntegerListAttribute parses comma-separated integers", () => {
    expect(parseIntegerListAttribute("10,25,50")).toEqual([10, 25, 50]);
});

test("parseIntegerListAttribute drops invalid entries", () => {
    expect(parseIntegerListAttribute("10,abc,,50")).toEqual([10, 50]);
});

test("parseEnumAttribute accepts an allowed value", () => {
    expect(parseEnumAttribute("select", ["action", "select", "none"], "action")).toBe("select");
});

test("parseEnumAttribute falls back for unknown values", () => {
    expect(parseEnumAttribute("drag", ["action", "select", "none"], "action")).toBe("action");
});
