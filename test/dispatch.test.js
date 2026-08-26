import { expect, test } from "bun:test";
import { dispatch } from "../src/utils/dispatch.js";

test("dispatch delivers detail on the CustomEvent", () => {
    const target = document.createElement("div");
    const received = [];

    target.addEventListener("test:detail", (ev) => received.push(ev.detail));
    const result = dispatch(target, "test:detail", { a: 1 });

    expect(received).toEqual([{ a: 1 }]);
    expect(result).toBe(true);
});

test("dispatch defaults detail to an empty object", () => {
    const target = document.createElement("div");
    const received = [];

    target.addEventListener("test:empty", (ev) => received.push(ev.detail));
    dispatch(target, "test:empty");

    expect(received).toEqual([{}]);
});

test("dispatch forwards bubbles, cancelable and composed options", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const seen = [];

    target.addEventListener(
        "test:opts",
        (ev) => seen.push({ bubbles: ev.bubbles, cancelable: ev.cancelable, composed: ev.composed }),
        { capture: true },
    );
    document.addEventListener("test:opts", (ev) =>
        seen.push({ bubbles: ev.bubbles, cancelable: ev.cancelable, composed: ev.composed }),
    );

    dispatch(target, "test:opts", { x: 1 }, { bubbles: true, cancelable: true, composed: true });

    // Capture listener on the target + bubbling listener on document
    expect(seen).toEqual([
        { bubbles: true, cancelable: true, composed: true },
        { bubbles: true, cancelable: true, composed: true },
    ]);
});

test("dispatch returns false when a cancelable event is preventDefault'ed", () => {
    const target = document.createElement("div");
    target.addEventListener("test:cancel", (ev) => ev.preventDefault());

    const result = dispatch(target, "test:cancel", { x: 1 }, { cancelable: true });
    expect(result).toBe(false);
});

test("dispatch returns true when a cancelable event is not prevented", () => {
    const target = document.createElement("div");
    target.addEventListener("test:cancel-ok", () => {});

    const result = dispatch(target, "test:cancel-ok", { x: 1 }, { cancelable: true });
    expect(result).toBe(true);
});
