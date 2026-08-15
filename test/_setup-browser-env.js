import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// happy-dom does not implement the 2d canvas context, which the grid uses to
// compute column widths via canvas.measureText. Provide a minimal stub.
HTMLCanvasElement.prototype.getContext = () => ({
    font: "",
    measureText(text) {
        return { width: String(text).length * 8 };
    },
});
