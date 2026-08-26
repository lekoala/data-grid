/** @typedef {import("./data-source.js").FilterOperator} FilterOperator */
/** @typedef {import("./data-source.js").FilterState} FilterState */

/** @type {Array<[string, FilterOperator]>} */
const TEXT_FILTER_OPERATORS = [
    [">=", "gte"],
    ["<=", "lte"],
    ["!=", "neq"],
    [">", "gt"],
    ["<", "lt"],
    ["=", "eq"],
];

const LEADING_QUERY_CHARS = "!=<>%";

/**
 * @param {string} value
 * @param {number} index
 * @returns {boolean}
 */
function isEscapedAt(value, index) {
    let slashes = 0;
    for (let i = index - 1; i >= 0 && value[i] === "\\"; i--) {
        slashes++;
    }
    return slashes % 2 === 1;
}

/**
 * @param {string} value
 * @returns {string}
 */
function unescapeFilterQueryText(value) {
    let result = "";
    for (let i = 0; i < value.length; i++) {
        if (value[i] === "\\" && i + 1 < value.length) {
            result += value[i + 1];
            i++;
            continue;
        }
        result += value[i];
    }
    return result;
}

/**
 * Escape a text value so it round-trips through the mini-language without
 * turning into an operator or a % pattern.
 * @param {string} value
 * @returns {string}
 */
function escapePatternText(value) {
    let result = "";
    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (char === "\\") {
            result += "\\\\";
            continue;
        }
        if ((i === 0 && LEADING_QUERY_CHARS.includes(char)) || (char === "%" && i === value.length - 1)) {
            result += `\\${char}`;
            continue;
        }
        result += char;
    }
    return result;
}

/**
 * @param {string} value
 * @param {FilterOperator} containsOperator
 * @param {FilterOperator} startsWithOperator
 * @param {FilterOperator} endsWithOperator
 * @returns {FilterState}
 */
function parsePatternFilter(value, containsOperator, startsWithOperator, endsWithOperator) {
    const hasLeadingPercent = value.startsWith("%");
    const hasTrailingPercent = value.endsWith("%") && !isEscapedAt(value, value.length - 1);
    if (value.length > 2 && hasLeadingPercent && hasTrailingPercent) {
        return { operator: containsOperator, value: unescapeFilterQueryText(value.slice(1, -1)) };
    }
    if (value.length > 1 && hasTrailingPercent) {
        return { operator: startsWithOperator, value: unescapeFilterQueryText(value.slice(0, -1)) };
    }
    if (value.length > 1 && hasLeadingPercent) {
        return { operator: endsWithOperator, value: unescapeFilterQueryText(value.slice(1)) };
    }

    return { operator: containsOperator, value: unescapeFilterQueryText(value) };
}

const DATE_YEAR_PATTERN = /^(\d{4})$/;
const DATE_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * @param {number} value
 * @returns {string}
 */
function pad2(value) {
    return String(value).padStart(2, "0");
}

/**
 * @param {string} value
 * @returns {{ precision: "year"|"month"|"day", raw: string, start: string, end: string }|null}
 */
function parseCanonicalDateFragment(value) {
    const yearMatch = DATE_YEAR_PATTERN.exec(value);
    if (yearMatch) {
        return {
            precision: "year",
            raw: yearMatch[1],
            start: `${yearMatch[1]}-01-01`,
            end: `${yearMatch[1]}-12-31`,
        };
    }

    const monthMatch = DATE_MONTH_PATTERN.exec(value);
    if (monthMatch) {
        const year = Number(monthMatch[1]);
        const month = Number(monthMatch[2]);
        if (month < 1 || month > 12) {
            return null;
        }
        return {
            precision: "month",
            raw: `${monthMatch[1]}-${monthMatch[2]}`,
            start: `${monthMatch[1]}-${monthMatch[2]}-01`,
            end: `${monthMatch[1]}-${monthMatch[2]}-${pad2(daysInMonth(year, month))}`,
        };
    }

    const dayMatch = DATE_DAY_PATTERN.exec(value);
    if (dayMatch) {
        const year = Number(dayMatch[1]);
        const month = Number(dayMatch[2]);
        const day = Number(dayMatch[3]);
        if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
            return null;
        }
        return {
            precision: "day",
            raw: `${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}`,
            start: `${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}`,
            end: `${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}`,
        };
    }

    return null;
}

/**
 * @param {FilterOperator} operator
 * @param {string} value
 * @returns {FilterState}
 */
function fallbackDateFilter(operator, value) {
    if (operator === "eq") {
        return { operator: "startsWith", value };
    }
    return { operator, value };
}

/**
 * @param {string} value
 * @returns {{ complete: boolean, operator: FilterOperator, value: string }|null}
 */
function readLeadingOperator(value) {
    for (const [token, operator] of TEXT_FILTER_OPERATORS) {
        if (!value.startsWith(token)) {
            continue;
        }
        const nextValue = value.slice(token.length);
        return { complete: Boolean(nextValue), operator, value: nextValue };
    }
    return null;
}

/**
 * @param {string} start
 * @param {string} end
 * @returns {string|null}
 */
function compressDateRange(start, end) {
    if (start === end && parseCanonicalDateFragment(start)?.precision === "day") {
        return start;
    }

    const yearMatch = /^(\d{4})-01-01$/.exec(start);
    if (yearMatch && end === `${yearMatch[1]}-12-31`) {
        return yearMatch[1];
    }

    const monthMatch = /^(\d{4})-(\d{2})-01$/.exec(start);
    if (monthMatch) {
        const year = Number(monthMatch[1]);
        const month = Number(monthMatch[2]);
        if (end === `${monthMatch[1]}-${monthMatch[2]}-${pad2(daysInMonth(year, month))}`) {
            return `${monthMatch[1]}-${monthMatch[2]}`;
        }
    }

    return null;
}

/**
 * @param {string} value
 * @returns {string|null}
 */
function compressDateLowerBound(value) {
    const yearMatch = /^(\d{4})-01-01$/.exec(value);
    if (yearMatch) {
        return yearMatch[1];
    }
    const monthMatch = /^(\d{4})-(\d{2})-01$/.exec(value);
    if (monthMatch) {
        return `${monthMatch[1]}-${monthMatch[2]}`;
    }
    return null;
}

/**
 * @param {string} value
 * @returns {string|null}
 */
function compressDateUpperBound(value) {
    const yearMatch = /^(\d{4})-12-31$/.exec(value);
    if (yearMatch) {
        return yearMatch[1];
    }
    const monthMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (monthMatch) {
        const year = Number(monthMatch[1]);
        const month = Number(monthMatch[2]);
        if (Number(monthMatch[3]) === daysInMonth(year, month)) {
            return `${monthMatch[1]}-${monthMatch[2]}`;
        }
    }
    return null;
}

/**
 * Parse the minimal text-filter syntax into a canonical FilterState.
 * Incomplete operator-only inputs stay literal so typing `>` or `%` does not
 * silently clear the filter.
 * @param {string} value
 * @returns {FilterState}
 */
export function parseTextFilterQuery(value) {
    const leading = readLeadingOperator(value);
    if (leading?.complete) {
        return { operator: leading.operator, value: leading.value };
    }
    if (leading) {
        return { operator: "contains", value };
    }

    if (value.startsWith("!") && value.length > 1) {
        return parsePatternFilter(value.slice(1), "notContains", "notStartsWith", "notEndsWith");
    }

    return parsePatternFilter(value, "contains", "startsWith", "endsWith");
}

/**
 * Parse a canonical date query into an explicit, server-friendly FilterState.
 * Bare year/month inputs become inclusive ranges; comparisons on partial dates
 * resolve to the matching lower/upper bound.
 * @param {string} value
 * @returns {FilterState}
 */
export function parseDateFilterQuery(value) {
    const leading = readLeadingOperator(value);
    if (leading && !leading.complete) {
        return fallbackDateFilter("eq", value);
    }
    const operator = leading?.operator ?? "eq";
    const rawValue = leading?.value ?? value;
    const fragment = parseCanonicalDateFragment(rawValue);

    if (!fragment) {
        return fallbackDateFilter(operator, rawValue);
    }

    if (operator === "eq") {
        if (fragment.precision === "day") {
            return { operator: "eq", value: fragment.start };
        }
        return { operator: "between", value: [fragment.start, fragment.end] };
    }
    if (operator === "neq") {
        if (fragment.precision === "day") {
            return { operator: "neq", value: fragment.start };
        }
        return { operator: "notStartsWith", value: fragment.raw };
    }
    if (operator === "gt") {
        return { operator: "gt", value: fragment.end };
    }
    if (operator === "gte") {
        return { operator: "gte", value: fragment.start };
    }
    if (operator === "lt") {
        return { operator: "lt", value: fragment.start };
    }
    if (operator === "lte") {
        return { operator: "lte", value: fragment.end };
    }

    return { operator, value: rawValue };
}

/**
 * Format a text-compatible FilterState back into the minimal input syntax.
 * Operators without a text representation fall back to the raw value.
 * @param {FilterState|undefined} filter
 * @returns {string}
 */
export function formatTextFilterQuery(filter) {
    if (!filter) {
        return "";
    }
    const value = filter.value;
    if (value === undefined || value === null) {
        return "";
    }
    const text = String(value);
    switch (filter.operator) {
        case "eq":
            return `=${text}`;
        case "neq":
            return `!=${text}`;
        case "gt":
            return `>${text}`;
        case "gte":
            return `>=${text}`;
        case "lt":
            return `<${text}`;
        case "lte":
            return `<=${text}`;
        case "notContains":
            return `!${escapePatternText(text)}`;
        case "notStartsWith":
            return `!${escapePatternText(text)}%`;
        case "notEndsWith":
            return `!%${escapePatternText(text)}`;
        case "startsWith":
            return `${escapePatternText(text)}%`;
        case "endsWith":
            return `%${escapePatternText(text)}`;
        default:
            return escapePatternText(text);
    }
}

/**
 * Format a canonical date FilterState back into a concise date query string.
 * @param {FilterState|undefined} filter
 * @returns {string}
 */
export function formatDateFilterQuery(filter) {
    if (!filter) {
        return "";
    }

    if (filter.operator === "between" && Array.isArray(filter.value) && filter.value.length === 2) {
        return compressDateRange(String(filter.value[0]), String(filter.value[1])) ?? "";
    }

    const value = filter.value;
    if (value === undefined || value === null) {
        return "";
    }
    const text = String(value);

    switch (filter.operator) {
        case "eq":
            return parseCanonicalDateFragment(text)?.precision === "day" ? text : `=${text}`;
        case "neq":
            return `!=${text}`;
        case "gt": {
            return `>${compressDateUpperBound(text) ?? text}`;
        }
        case "gte": {
            return `>=${compressDateLowerBound(text) ?? text}`;
        }
        case "lt": {
            return `<${compressDateLowerBound(text) ?? text}`;
        }
        case "lte": {
            return `<=${compressDateUpperBound(text) ?? text}`;
        }
        case "notStartsWith":
            return `!=${text}`;
        case "startsWith":
            return text;
        default:
            return text;
    }
}
