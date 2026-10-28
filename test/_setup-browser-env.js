import { GlobalRegistrator } from "@happy-dom/global-registrator";

// happy-dom replaces the native Response/fetch. Keep a reference for tests
// that need a real HTTP round-trip (ex: demo/server.js served by Bun.serve).
globalThis.NativeResponse = globalThis.Response;
// Same for FormData: Bun.fetch needs the native encoder to send a multipart
// body that Bun.serve can parse.
globalThis.NativeFormData = globalThis.FormData;

GlobalRegistrator.register({ url: "http://localhost/" });

// happy-dom does not implement the 2d canvas context, which the grid uses to
// compute column widths via canvas.measureText. Provide a minimal stub.
HTMLCanvasElement.prototype.getContext = () => ({
    font: "",
    measureText(text) {
        return { width: String(text).length * 8 };
    },
});
