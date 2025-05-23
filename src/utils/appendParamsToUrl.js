/**
 * @param {URL} url
 * @param {Object} params
 */
export default function appendParamsToUrl(url, params = {}) {
    for (const key of Object.keys(params)) {
        if (Array.isArray(params[key])) {
            for (const k of Object.keys(params[key])) {
                // @ts-ignore
                url.searchParams.append(isNaN(k) ? `${key}[${k}]` : key, params[key][k]);
            }
        } else {
            url.searchParams.append(key, params[key]);
        }
    }
}
