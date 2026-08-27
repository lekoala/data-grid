# Translations

All UI labels are plain strings and should normally be configured before grids
are created. Labels are
expressed as full phrases: `pageRange` uses `{from}`, `{to}` and `{total}`
placeholders, `pageStatus` uses `{page}` and `{pages}`, `resultCount` and
`selectedCount` use `{count}`.

## Language-neutral visible UI

The visible chrome is intentionally language-neutral by default: numbers and
structure carry the information, so nothing on screen needs translating.

```text
1–10 / 198     [10⌄]   ‹ ‹ [1] › ›
```

```text
[ 3 ] [Archive] [Delete]
```

The words live in the accessibility layer, as `aria-label`, `title` or a live
region:

- `pageRange` — visible range, defaults to the symbolic `{from}–{to} / {total}`
- `pageStatus` — accessible page context (`Page 1 of 20`), never visible
- `selectedCount` — the selected count announced by the live badge
- `search`, `gotoPage`, `gotoFirstPage`, ... — accessible names

`setLabels()` changes the shared labels used by new grids. It does not track or
refresh connected instances.

An explicit override can still bring the wording back on screen:

```js
DataGrid.setLabels({
    pageRange: "{from} - {to} of {total} rows",
    resultCount: "{count} rows",
});
```

## Placeholders are not labels

`search-placeholder` is empty by default, while `filter-placeholder` can provide
a language-neutral hint. Applications can replace either with a business hint
that explains a format or a domain ("Name, email or user ID", "≥ 100"), while
the accessible name always comes from the labels / the column header.

## Application labels (JSON)

`loadLabels()` fetches a flat JSON file with the same keys and applies it:

```js
await DataGrid.loadLabels("/i18n/data-grid.fr.json");
```

```json
{
  "itemsPerPage": "Éléments par page",
  "pageStatus": "Page {page} sur {pages}",
  "noData": "Aucune donnée"
}
```

## Official locales (modules)

Ready-made, self-applying locales ship in the package. Importing one calls
`setLabels()` for you; import it before creating grids:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/data-grid-component@3/locales/fr.js"></script>
```

```js
import "data-grid-component/locales/fr";
```

For a dynamic switch, the application chooses which connected grids to refresh:

```js
const { default: labels } = await import("data-grid-component/locales/fr");
DataGrid.setLabels(labels);
for (const grid of document.querySelectorAll("data-grid")) {
    grid.updateLabels();
}
```

Available locales: `en`, `fr`, `nl`, `de`, `es`, `it`, `pt-BR`, `pt-PT`,
`zh-CN`, `ja`, `ko`, `ar`, `hi`, `ru`, `tr`, `id`, `pl`.

Available labels: `itemsPerPage`, `gotoPage`, `gotoFirstPage`, `gotoPrevPage`,
`gotoNextPage`, `gotoLastPage`, `pageRange`, `pageStatus`, `resultCount`,
`selectedCount`, `selectAll`, `selectRow`, `toggleActions`, `resizeColumn`,
`showDetails`, `hideDetails`, `showHiddenColumns`, `hideHiddenColumns`, `search`,
`noData`, `loading`, `areYouSure`, `networkError`, `booleanTrue`, `booleanFalse`.
