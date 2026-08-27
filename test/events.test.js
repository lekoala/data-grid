import { expect, test } from "bun:test";
import { off, on } from "../src/utils/events.js";

test("on and off manage one listener across several event types", () => {
    const target = new EventTarget();
    const received = [];
    const listener = (event) => received.push(event.type);
    const types = ["first", "second"];

    on(target, types, listener);
    target.dispatchEvent(new Event("first"));
    target.dispatchEvent(new Event("second"));
    off(target, types, listener);
    target.dispatchEvent(new Event("first"));

    expect(received).toEqual(types);
});
