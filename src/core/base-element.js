import camelize from "../utils/camelize.js";
import normalizeData from "../utils/normalizeData.js";
import { dispatch, getAttribute, setAttribute } from "../utils/shortcuts.js";

/** @typedef {import('../data-grid').Options} Options */

/**
 * Base element that does not contain any specific logic
 * related to this project but makes HTMLElemnt usable
 */
class BaseElement extends HTMLElement {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
        super();

        /** @type {Options} */
        this.options = Object.assign({}, this.defaultOptions, this.normalizedDataset, options);

        this.log("constructor");

        this.setup = false;
        this.fireEvents = true;
        this._ready();

        this.log("ready");
    }

    get defaultOptions() {
        return {};
    }

    /**
     * @param {String} opt
     * @returns {any}
     */
    getOption(opt) {
        return this.options[opt];
    }

    /**
     * @param {String} opt
     * @param {any} v
     */
    setOption(opt, v) {
        setAttribute(this, `data-${opt}`, v);
    }

    /**
     * @param {String} opt
     */
    toggleOption(opt) {
        setAttribute(this, `data-${opt}`, !this.getOption(opt));
    }

    get normalizedDataset() {
        const jsonConfig = this.dataset.config ? JSON.parse(this.dataset.config) : {};
        const data = { ...this.dataset };
        for (const key in data) {
            if (key === "config") {
                continue;
            }
            data[key] = normalizeData(data[key]);
        }
        // Once normalized, merge into json config
        Object.assign(data, jsonConfig);
        return data;
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
     * @param {String|Error} message
     */
    log(message) {
        if (this.options.debug) {
            console.log(`[${getAttribute(this, "id")}] ${message}`);
        }
    }

    /**
     * Handle events within the component
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event) {
        if (this[`on${event.type}`]) {
            this[`on${event.type}`](event);
        }
    }

    /**
     * This is called when connected. Extend in subclass if needed.
     */
    _connected() {}

    connectedCallback() {
        // already connected
        if (this.setup) {
            return;
        }
        this.setup = true;
        // ensure whenDefined callbacks run first
        setTimeout(() => {
            this.log("connectedCallback");

            // Append only when labels had the opportunity to be set
            // Don't use shadow dom as it makes theming super hard
            const template = document.createElement("template");
            // @ts-ignore
            template.innerHTML = this.constructor.template();
            this.appendChild(template.content.cloneNode(true));

            this._connected();
            // @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#life-cycle-events
            dispatch(this, "connected");
        }, 0);
    }

    /**
     * This is called when disconnected. Extend in subclass if needed.
     */
    _disconnected() {}

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
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#a-props-like-accessor
     * @returns {Object}
     */
    get transformAttributes() {
        return {};
    }

    /**
     * This is only meant to work with data attributes
     * This allows us to have properties that reflect automatically in the component
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#reflected-dataset-attributes
     * @param {String} attributeName
     * @param {String} oldValue
     * @param {String} newValue
     */
    attributeChangedCallback(attributeName, oldValue, newValue) {
        // It didn't change
        if (oldValue === newValue) {
            return;
        }

        this.log(`attributeChangedCallback: ${attributeName}`);

        let isOption = false;
        const transformer = this.transformAttributes[attributeName] ?? normalizeData;

        let attr = attributeName;
        // Data attributes are mapped to options while other attributes are mapped as properties
        if (attr.indexOf("data-") === 0) {
            attr = attr.slice(5);
            isOption = true;
        }
        attr = camelize(attr);
        if (isOption) {
            this.options[attr] = transformer(newValue);
        } else {
            this[attr] = transformer(newValue);
        }

        // Fire internal event
        if (this.fireEvents && this[`${attr}Changed`]) {
            this[`${attr}Changed`]();
        }
    }
}

export default BaseElement;
