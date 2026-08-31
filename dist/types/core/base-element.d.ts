export type Options = import('../data-grid.js').Options;
/** @typedef {import('../data-grid.js').Options} Options */
/**
 * Base element that does not contain any specific logic
 * related to this project but makes HTMLElement usable
 */
declare class BaseElement extends HTMLElement {
    /** @type {Options} */
    options: Options;
    setup: boolean;
    rendered: boolean;
    fireEvents: boolean;
    /**
     * @param {Object} options
     */
    constructor(options?: Object);
    /**
     * @returns {Object}
     */
    get defaultOptions(): Object;
    /**
     * @returns {Array<any>}
     */
    static get observedAttributes(): Array<any>;
    /**
     * @returns {String}
     */
    static template(): string;
    /**
     * This is called at the end of constructor. Extend in subclass if needed.
     */
    _ready(): void;
    /**
     * This is called when connected. Extend in subclass if needed.
     */
    _connected(): void;
    /**
     * This is called when disconnected. Extend in subclass if needed.
     */
    _disconnected(): void;
    /**
     * @param {any[]} data
     */
    log(...data: any[]): void;
    /**
     * Handle events within the component
     * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
     * @param {Event} event
     */
    handleEvent(event: Event): void;
    connectedCallback(): void;
    /**
     * @link https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
     */
    disconnectedCallback(): void;
    /**
     * Handle an observed attribute change in a subclass.
     * @param {String} attributeName
     * @param {String|null} newValue
     * @param {String|null} oldValue
     */
    attributeChanged(attributeName: string, newValue: string | null, oldValue: string | null): void;
    /**
     * Forward the native custom-element callback to the subclass policy.
     * BaseElement deliberately does not know how attributes map to options.
     * @param {String} attributeName
     * @param {String|null} oldValue
     * @param {String|null} newValue
     */
    attributeChangedCallback(attributeName: string, oldValue: string | null, newValue: string | null): void;
}
export default BaseElement;
//# sourceMappingURL=base-element.d.ts.map