import { dispatch } from "../utils/dispatch.js";

/** @typedef {import('../data-grid.js').Options} Options */

/**
 * Base element that does not contain any specific logic
 * related to this project but makes HTMLElement usable
 */
class BaseElement extends HTMLElement {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
        super();

        /** @type {Options} */
        this.options = /** @type {Options} */ (Object.assign({}, this.defaultOptions, options));

        this.log("constructor");

        this.setup = false;
        this.rendered = false;
        this.fireEvents = true;
        this._ready();

        this.log("ready");
    }

    /**
     * @returns {Object}
     */
    get defaultOptions() {
        return {};
    }

    /**
     * @returns {Array<any>}
     */
    static get observedAttributes() {
        return [];
    }

    /**
     * @returns {String}
     */
    static template() {
        return "";
    }

    /**
     * This is called at the end of constructor. Extend in subclass if needed.
     */
    _ready() {}

    /**
     * This is called when connected. Extend in subclass if needed.
     */
    _connected() {}

    /**
     * This is called when disconnected. Extend in subclass if needed.
     */
    _disconnected() {}

    /**
     * @param {any[]} data
     */
    log(...data) {
        if (this.options.debug) {
            console.log(`[${this.getAttribute("id")}] `, ...data);
        }
    }

    /**
     * Handle events within the component
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event) {
        const handler = /** @type {Record<string, any>} */ (this)[`on${event.type}`];
        if (typeof handler === "function") {
            handler.call(this, event);
        }
    }

    connectedCallback() {
        // already connected
        if (this.setup) {
            return;
        }
        this.setup = true;
        // ensure whenDefined callbacks run first
        setTimeout(async () => {
            this.log("connectedCallback");

            // Append only when labels had the opportunity to be set
            // Don't use shadow dom as it makes theming super hard
            // Render the template only once, even when the element is reconnected
            if (!this.rendered) {
                const template = document.createElement("template");
                const ctor = /** @type {typeof BaseElement} */ (this.constructor);
                template.innerHTML = ctor.template();
                this.appendChild(template.content.cloneNode(true));
                this.rendered = true;
            }

            await this._connected();

            // @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#life-cycle-events
            dispatch(this, "connected");
        }, 0);
    }

    /**
     * @link https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
     */
    disconnectedCallback() {
        setTimeout(() => {
            if (!this.isConnected && this.setup) {
                this.log("disconnectedCallback");
                this._disconnected();
                // @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#life-cycle-events
                dispatch(this, "disconnected");
                this.setup = false;
            }
        }, 0);
    }

    /**
     * Handle an observed attribute change in a subclass.
     * @param {String} attributeName
     * @param {String|null} newValue
     * @param {String|null} oldValue
     */
    attributeChanged(attributeName, newValue, oldValue) {}

    /**
     * Forward the native custom-element callback to the subclass policy.
     * BaseElement deliberately does not know how attributes map to options.
     * @param {String} attributeName
     * @param {String|null} oldValue
     * @param {String|null} newValue
     */
    attributeChangedCallback(attributeName, oldValue, newValue) {
        // It didn't change
        if (oldValue === newValue) {
            return;
        }

        this.log(`attributeChangedCallback: ${attributeName}`);
        this.attributeChanged(attributeName, newValue, oldValue);
    }
}

export default BaseElement;
