/**
 * Conservative guard against common template mistakes. This is not a
 * sanitizer: the template itself is trusted application markup.
 * @param {HTMLTemplateElement} template
 * @returns {Boolean}
 */
export declare function isSafeCellTemplate(template: HTMLTemplateElement): boolean;
export type CellTemplateCollection = {
    templates: Map<string, HTMLTemplateElement>;
    rejected: Array<{
        field: string;
        template: HTMLTemplateElement;
    }>;
    duplicates: string[];
};
/**
 * @typedef {Object} CellTemplateCollection
 * @property {Map<String, HTMLTemplateElement>} templates
 * @property {Array<{field: String, template: HTMLTemplateElement}>} rejected
 * @property {String[]} duplicates
 */
/**
 * Collect the cell templates declared as direct children of `root`, independent
 * from the column schema. An unsafe template is reported, never registered.
 * @param {ParentNode} root
 * @returns {CellTemplateCollection}
 */
export declare function collectCellTemplates(root: ParentNode): CellTemplateCollection;
/**
 * Clone a cell template and fill its `data-dg-text="value"` bindings with the
 * raw scalar value. Non-scalar values render as empty text and expose no
 * `data-value`, so nothing is serialized implicitly.
 * @param {HTMLElement} target
 * @param {HTMLTemplateElement} template
 * @param {*} value
 */
export declare function applyCellTemplate(target: HTMLElement, template: HTMLTemplateElement, value: any): void;
//# sourceMappingURL=cellTemplate.d.ts.map