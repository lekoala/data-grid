import { expect, test } from "bun:test";
import transformValue from "../src/utils/transformValue.js";

test("no transform leaves the value unchanged", () => {
    expect(transformValue("hello", null, {})).toBe("hello");
    expect(transformValue("hello", undefined, {})).toBe("hello");
});

test("uppercase transforms the value", () => {
    expect(transformValue("hello", "uppercase", {})).toBe("HELLO");
    expect(transformValue(42, "uppercase", {})).toBe("42");
});

test("lowercase transforms the value", () => {
    expect(transformValue("HELLO", "lowercase", {})).toBe("hello");
});

test("array joins array values and leaves others unchanged", () => {
    expect(transformValue(["A", "B", "C"], "array", {})).toBe("A, B, C");
    expect(transformValue("already a string", "array", {})).toBe("already a string");
});

test("unknown named transform leaves the value unchanged", () => {
    expect(transformValue("hello", "shout", {})).toBe("hello");
});

test("a function transform is applied with the value and context", () => {
    const transform = (value, ctx) => `${value} ${ctx.unit}`;
    expect(transformValue("12", transform, { unit: "px" })).toBe("12 px");
});

test("a function transform can return null or undefined", () => {
    expect(transformValue("12", () => null, {})).toBeNull();
    expect(transformValue("12", () => undefined, {})).toBeUndefined();
});
