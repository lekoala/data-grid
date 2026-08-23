# Translations

All UI labels are plain strings and can be overridden at any time. Labels are
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

`setLabels()` updates every connected grid immediately. It should normally be
called before creating grids (the internal template is built from the current
labels on first render).

An explicit override can still bring the wording back on screen:

```js
DataGrid.setLabels({
    pageRange: "{from} - {to} of {total} rows",
    resultCount: "{count} rows",
});
```

## Placeholders are not labels

`search-placeholder` and `filter-placeholder` default to the language-neutral
ellipsis `…`. Applications can replace it with a business hint that explains a
format or a domain ("Name, email or user ID", "≥ 100"), while the accessible
name always comes from the labels / the column header.

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
`setLabels()` for you, so a language switch just works:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/data-grid-component@3/locales/fr.js"></script>
```

```js
import "data-grid-component/locales/fr";
```

For a dynamic switch, import the module and let it refresh the grids:

```js
const { default: labels } = await import("data-grid-component/locales/fr");
DataGrid.setLabels(labels);
```

Available locales: `en`, `fr`, `nl`, `de`, `es`, `it`, `pt-BR`, `pt-PT`,
`zh-CN`, `ja`, `ko`, `ar`, `hi`, `ru`, `tr`, `id`, `pl`.

Available labels: `itemsPerPage`, `gotoPage`, `gotoFirstPage`, `gotoPrevPage`,
`gotoNextPage`, `gotoLastPage`, `pageRange`, `pageStatus`, `resultCount`,
`selectedCount`, `selectAll`, `selectRow`, `toggleActions`, `resizeColumn`,
`search`, `noData`, `loading`, `areYouSure`, `networkError`.
