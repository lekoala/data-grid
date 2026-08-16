# Translations

All UI labels are plain strings and can be overridden at any time. Labels are
expressed as full phrases: `pageRange` uses `{from}`, `{to}` and `{total}`
placeholders, `resultCount` and `selectedCount` use `{count}`.

```js
DataGrid.setLabels({
    pageRange: "{from} - {to} of {total} rows",
    resultCount: "{count} rows",
});
```

`setLabels()` updates every connected grid immediately. It should normally be
called before creating grids (the internal template is built from the current
labels on first render).

## Application labels (JSON)

`loadLabels()` fetches a flat JSON file with the same keys and applies it:

```js
await DataGrid.loadLabels("/i18n/data-grid.fr.json");
```

```json
{
  "itemsPerPage": "Éléments par page",
  "pageRange": "{from} – {to} sur {total}",
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
`gotoNextPage`, `gotoLastPage`, `pageRange`, `resultCount`, `selectedCount`,
`selectAll`, `selectRow`, `toggleActions`, `resizeColumn`, `search`, `noData`,
`loading`, `areYouSure`, `networkError`.
