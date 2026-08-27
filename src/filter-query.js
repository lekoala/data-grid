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

/** @type {Partial<Record<FilterOperator, string>>} */
const FILTER_OPERATOR_TOKENS = Object.fromEntries(TEXT_FILTER_OPERATORS.map(([token, operator]) => [operator, token]));

/** @type {Partial<Record<FilterOperator, { bound: "start"|"end", upper: boolean }>>} */
const DATE_COMPARISON_RULES = {
    gt: { bound: "end", upper: true },
    gte: { bound: "start", upper: false },
    lt: { bound: "start", upper: false },
    lte: { bound: "end", upper: true },
};

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

const DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

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
    const match = DATE_PATTERN.exec(value);
    if (!match) {
        return null;
    }

    const yearText = match[1];
    const monthText = match[2];
    const dayText = match[3];
    const year = Number(yearText);

    if (!monthText) {
        return {
            precision: "year",
            raw: yearText,
            start: `${yearText}-01-01`,
            end: `${yearText}-12-31`,
        };
    }

    const month = Number(monthText);
    if (month < 1 || month > 12) {
        return null;
    }
    const prefix = `${yearText}-${monthText}`;
    const lastDay = daysInMonth(year, month);

    if (!dayText) {
        return {
            precision: "month",
            raw: prefix,
            start: `${prefix}-01`,
            end: `${prefix}-${pad2(lastDay)}`,
        };
    }

    const day = Number(dayText);
    if (day < 1 || day > lastDay) {
        return null;
    }

    return { precision: "day", raw: value, start: value, end: value };
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
    if (start === end) {
        return parseCanonicalDateFragment(start)?.precision === "day" ? start : null;
    }

    const lower = compressDateBound(start, false);
    const upper = compressDateBound(end, true);
    return lower && lower === upper ? lower : null;
}

/**
 * @param {string} value
 * @param {boolean} upper
 * @returns {string|null}
 */
function compressDateBound(value, upper) {
    const fragment = parseCanonicalDateFragment(value);
    if (fragment?.precision !== "day") {
        return null;
    }

    const [year, month, day] = value.split("-");
    if (upper) {
        if (month === "12" && day === "31") {
            return year;
        }
        if (Number(day) === daysInMonth(Number(year), Number(month))) {
            return `${year}-${month}`;
        }
    } else {
        if (month === "01" && day === "01") {
            return year;
        }
        if (day === "01") {
            return `${year}-${month}`;
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
    const rule = DATE_COMPARISON_RULES[operator];
    return { operator, value: rule ? fragment[rule.bound] : rawValue };
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
    const token = FILTER_OPERATOR_TOKENS[filter.operator];
    if (token) {
        return `${token}${text}`;
    }

    switch (filter.operator) {
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

    const rule = DATE_COMPARISON_RULES[filter.operator];
    if (rule) {
        return `${FILTER_OPERATOR_TOKENS[filter.operator]}${compressDateBound(text, rule.upper) ?? text}`;
    }

    switch (filter.operator) {
        case "eq":
            return parseCanonicalDateFragment(text)?.precision === "day" ? text : `=${text}`;
        case "neq":
            return `!=${text}`;
        case "notStartsWith":
            return `!=${text}`;
        case "startsWith":
            return text;
        default:
            return text;
    }
}
