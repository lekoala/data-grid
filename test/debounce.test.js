import { expect, test } from "bun:test";
import debounce from "../src/utils/debounce.js";

test("flush runs a pending invocation with the latest arguments", () => {
    const called = [];
    const fn = debounce((...args) => called.push(args), 100);

    fn("a");
    fn("b");
    // Nothing has been called yet: still debounced
    expect(called).toEqual([]);

    fn.flush();
    // Pending invocation runs immediately with the *last* arguments
    expect(called).toEqual([["b"]]);
});

test("flush is a no-op when nothing is pending", () => {
    let called = 0;
    const fn = debounce(() => called++, 100);

    fn.flush();
    fn.flush();
    expect(called).toBe(0);
});

test("cancel drops a pending invocation without running it", () => {
    let called = 0;
    const fn = debounce(() => called++, 100);

    fn();
    fn.cancel();
    fn.flush();
    expect(called).toBe(0);
});

test("invocation runs after the timeout", async () => {
    let called = 0;
    const fn = debounce(() => called++, 5);

    fn();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(called).toBe(1);
});

test("debounced function is safe to use as an addEventListener handler", async () => {
    const target = document.createElement("button");
    const fired = [];
    const fn = debounce((ev) => fired.push(ev.type), 5);

    target.addEventListener("click", fn);
    target.dispatchEvent(new Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fired).toEqual(["click"]);
});
