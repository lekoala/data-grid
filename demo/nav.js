/**
 * Shared demo navigation (demo-only glue, not part of the package).
 *
 * Single source of truth for the demo index: adding a page is one entry in
 * DEMOS instead of editing every demo file. Renders grouped pills and marks
 * the current page from location.pathname. Dependency-free, so it works from
 * any static host as well as file://.
 */

const GROUPS = [
    { id: "grids", label: "Grids" },
    { id: "recipes", label: "Recipes" },
];

const DEMOS = [
    { href: "index.html", label: "Default", group: "grids" },
    { href: "server.html", label: "Server", group: "grids" },
    { href: "lazy.html", label: "Lazy", group: "grids" },
    { href: "declarative.html", label: "Declarative", group: "grids" },
    { href: "responsive.html", label: "Responsive", group: "grids" },
    { href: "i18n.html", label: "i18n", group: "grids" },
    { href: "actions.html", label: "Actions", group: "recipes" },
    { href: "api.html", label: "API", group: "recipes" },
    { href: "formatters.html", label: "Formatters", group: "recipes" },
    { href: "advanced-search.html", label: "Advanced search", group: "recipes" },
    { href: "url-state.html", label: "Shareable URLs", group: "recipes" },
    { href: "logs.html", label: "Event logs", group: "recipes" },
];

/**
 * Basename of the current page, defaulting to the index for directory URLs
 * (the demo server redirects / to /demo/). Unknown pages yield "" so no
 * pill is marked active.
 * @returns {String}
 */
function currentHref() {
    const base = location.pathname.split("/").pop() || "index.html";
    return DEMOS.some((demo) => demo.href === base) ? base : "";
}

/**
 * Render the grouped demo navigation into the [data-demo-nav] mount.
 * @param {HTMLElement|null} [mount]
 */
export function renderDemoNav(mount = document.querySelector("[data-demo-nav]")) {
    if (!mount) {
        return;
    }
    const active = currentHref();
    const nav = document.createElement("nav");
    nav.className = "demo-nav-wrap";
    nav.setAttribute("aria-label", "Demos");
    for (const group of GROUPS) {
        const section = document.createElement("section");
        section.className = "demo-nav-group";
        const heading = document.createElement("span");
        heading.className = "demo-nav-group-label";
        heading.id = `demo-nav-${group.id}`;
        heading.textContent = group.label;
        const list = document.createElement("ul");
        list.className = "demo-nav";
        list.setAttribute("aria-labelledby", heading.id);
        for (const demo of DEMOS.filter((entry) => entry.group === group.id)) {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.className = "demo-nav-link";
            link.textContent = demo.label;
            if (demo.href === active) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
                link.href = "#";
            } else {
                link.href = demo.href;
            }
            item.append(link);
            list.append(item);
        }
        section.append(heading, list);
        nav.append(section);
    }
    mount.replaceChildren(nav);
}
