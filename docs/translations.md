# Translations

All UI labels are plain strings and should normally be configured before grids
are created. Labels are
expressed as full phrases: `pageRange` uses `{from}`, `{to}` and `{total}`,
`pageStatus` uses `{page}` and `{pages}`, `resultCount` and `selectedCount` use
`{count}`, `allSelectedExcept` uses `{count}` for exclusions, and `selectAllResults` uses `{total}`.

## Visible and accessible UI

The footer shows the results window, `pageRange`, as the face of the page size
select: what is shown, out of how many, and the control to change how many per
page. Navigation stays symbolic: arrows and a page number input. The global
search placeholder uses the translated `search` label followed by an ellipsis.
When `showPageSize` is false, the results window stays visible as plain text in the footer.

```text
[1–10 of 198 ⌄]                              |< <  [1]  > >|
```

```text
[☑ 3 | Archive  Delete | ×]
```

Labels describe visible content and the accessibility layer (`aria-label`,
`title` and live regions):

- `pageRange` — visible results window on the page size select (`1–10 of 198`)
- `resultCount` — result count announced after a load (`Total: 198`)
- `pageStatus` — accessible page context (`Page 1 of 20`) of the navigation group
- `selectedCount` — the selected count announced by the live badge
- `selectionActions`, `clearSelection` — accessible names of the floating bar
  and its clear button
- `selectAllResults` (`{total}`), `selectAllMatching`, `allSelected` — visible
  text of the opt-in `selectMatching` prompt and of an all-results count
- `allSelectedExcept` (`{count}`) — all-results selection with exclusions and an unknown total
- `search` — accessible name and default search placeholder (with an ellipsis)
- `gotoPage`, `gotoFirstPage`, ... — accessible names

`setLabels()` changes the shared labels used by new grids. It does not track or
refresh connected instances.

An override can name what the grid holds:

```js
DataGrid.setLabels({
    pageRange: "{from}–{to} of {total} customers",
});
```

## Placeholders are not labels

The default `searchPlaceholder: null` resolves to the current `search` label plus
an ellipsis, for both grid-skinned and host-classed inputs. An explicit string
provides a business hint ("Name, email or user ID"); `search-placeholder=""`
clears it. Removing the attribute restores the translated default.

The generic text `filter-placeholder` remains empty by default; a column can
provide a language-neutral or business hint ("≥ 100"). Accessible names always
come from the labels / the column header, independently of placeholders.
`updateLabels()` refreshes the default search hint without replacing the input
and preserves explicit hints, including an empty string.

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
`loadMore`, `loadedCount`, `loadedCountUnknown`,
`selectedCount`, `selectAll`, `selectRow`, `selectionActions`, `selectAllResults`,
`selectAllMatching`, `allSelected`, `allSelectedExcept`, `clearSelection`, `toggleActions`, `resizeColumn`,
`showDetails`, `hideDetails`, `showHiddenColumns`, `hideHiddenColumns`, `search`,
`noData`, `noResults`, `loading`, `areYouSure`, `networkError`, `booleanTrue`, `booleanFalse`,
`closeDialog`.

`noResults` (`No results for "{query}"`) replaces `noData` when a search is
active and yields nothing, unless `options.noData` overrides both.
