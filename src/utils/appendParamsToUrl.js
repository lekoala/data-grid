/**
 * @param {URL} url
 * @param {Object} params
 */
export default function appendParamsToUrl(url, params = {}) {
  Object.keys(params).forEach((key) => {
    if (Array.isArray(params[key])) {
      // @ts-ignore
      Object.keys(params[key]).forEach((k) => url.searchParams.append(isNaN(k) ? `${key}[${k}]` : key, params[key][k]));
    } else {
      url.searchParams.append(key, params[key]);
    }
  });
}
