/**
 * @param {URL} url
 * @param {Record<string, any>} params
 */
export default function appendParamsToUrl(url, params = {}) {
    for (const key of Object.keys(params)) {
        const value = params[key];
        if (Array.isArray(value)) {
            const arr = /** @type {any} */ (value);
            for (const k of Object.keys(value)) {
                url.searchParams.append(Number.isNaN(Number(k)) ? `${key}[${k}]` : key, arr[k]);
            }
        } else {
            url.searchParams.append(key, value);
        }
    }
}
