import { expect, test } from "bun:test";
import { resolveActionConfirmation } from "../src/utils/actionConfirm.js";

test("falsy confirm means no confirmation", () => {
    expect(resolveActionConfirmation(undefined, "default", "subject", {})).toBeNull();
    expect(resolveActionConfirmation(false, "default", "subject", {})).toBeNull();
    expect(resolveActionConfirmation(null, "default", "subject", {})).toBeNull();
});

test("string confirm is used as the message", () => {
    expect(resolveActionConfirmation("Really delete?", "default", "subject", {})).toBe("Really delete?");
});

test("function confirm returning a string provides the message", () => {
    const confirm = (subject) => `Delete ${subject}?`;
    expect(resolveActionConfirmation(confirm, "default", "row 1", {})).toBe("Delete row 1?");
});

test("function confirm returning false disables confirmation", () => {
    const confirm = () => false;
    expect(resolveActionConfirmation(confirm, "default", "row 1", {})).toBeNull();
});

test("function confirm returning anything else keeps the fallback message", () => {
    expect(resolveActionConfirmation(() => undefined, "default", "row 1", {})).toBe("default");
    expect(resolveActionConfirmation(() => true, "default", "row 1", {})).toBe("default");
});

test("resolver receives the subject and context", () => {
    const confirm = (subject, context) => `${subject}-${context.grid !== undefined}`;
    expect(resolveActionConfirmation(confirm, "default", "row 1", { grid: {} })).toBe("row 1-true");
});
