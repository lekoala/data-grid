# Data Grid Web Component

[![NPM](https://nodei.co/npm/data-grid-component.png?mini=true)](https://nodei.co/npm/data-grid-component/)
[![Downloads](https://img.shields.io/npm/dt/data-grid-component.svg)](https://www.npmjs.com/package/data-grid-component)

Autonomous open source grid component with RTL support. Designed for server side paginated content but also work for basic tables.

Key features:

- Server side support
- Inline editing
- Sorting/filtering
- i18n friendly
- Easily themable

## How to use

### Installation

- Install with **npm**

```
$ npm install data-grid-component
```

### Initialization

- HTML way

```html
<data-grid data-url="data.json"></data-grid>
<script type="module" src="./data-grid.js"></script>
```

Grid customizations are possible via attributes.

- using the DOM API

```html
<script type="module" src="./data-grid.js"></script>
<script>
  const grid = document.createElement("data-grid");
  grid.dataset.url = "data.json"; // Use setAttribute on existing instance to trigger reload
  document.body.appendChild(grid);
</script>
```

- using the constructor

```html
<script type="module">
  import { DataGrid } from "./data-grid.js";
  const grid = new DataGrid({
    url: "data.json",
  });
  document.body.appendChild(grid);
</script>
```

### Styling

Data Grid inherits wherever possible from Bootstrap 5 styles (including dark mode support).

You can also override the following variables (see \_core.scss).

```css
data-grid {
  --padding: 0.5rem;
  --header-scale: 1.5;
  --color-rgb: var(--bs-primary-rgb, 13, 110, 253);
  --color: rgb(var(--color-rgb));
  --highlight-color: #fffcee;
  --header-background: var(--bs-gray-200, #e9ecef);
  --header-color: var(--bs-dark, #212529);
  --btn-background: var(--white, #ffffff);
  --btn-color: var(--color);
  --body-color: var(--bs-body-color, #212529);
}
```

### Options attributes

These are the options accessibles through the components data attributes. Some options only work if the proper plugin is loaded.
You can also pass them as a json string in data-config.

| Name                 | Type                                         | Description                                                                                                         |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| id                   | <code>String</code>                          | Custom id for the grid                                                                                              |
| url                  | <code>String</code>                          | An URL with data to display in JSON format                                                                          |
| debug                | <code>Boolean</code>                         | Log actions in DevTools console                                                                                     |
| filter               | <code>Boolean</code>                         | Allows a filtering functionality                                                                                    |
| sort                 | <code>Boolean</code>                         | Allows a sort by column functionality                                                                               |
| defaultSort          | <code>String</code>                          | Default sort field if sorting is enabled                                                                            |
| server               | <code>Boolean</code>                         | Is a server side powered grid                                                                                       |
| serverParams         | [<code>ServerParams</code>](#ServerParams)   | Describe keys passed to the server backend                                                                          |
| dir                  | <code>String</code>                          | Dir                                                                                                                 |
| perPageValues        | <code>Array</code>                           | Available per page options                                                                                          |
| hidePerPage          | <code>Boolean</code>                         | Hides the page size select element                                                                                  |
| columns              | [<code>Array.&lt;Column&gt;</code>](#Column) | Available columns                                                                                                   |
| defaultPage          | <code>Number</code>                          | Starting page                                                                                                       |
| perPage              | <code>Number</code>                          | Number of records displayed per page (page size)                                                                    |
| expand               | <code>Boolean</code>                         | Allow cell content to spawn over multiple lines                                                                     |
| actions              | [<code>Array.&lt;Action&gt;</code>](#Action) | Row actions (RowActions module)                                                                                     |
| collapseActions      | <code>Boolean</code>                         | Group actions (RowActions module)                                                                                   |
| resizable            | <code>Boolean</code>                         | Make columns resizable (ColumnResizer module)                                                                       |
| selectable           | <code>Boolean</code>                         | Allow selecting rows with a checkbox (SelectableRows module)                                                        |
| selectVisibleOnly    | <code>Boolean</code>                         | Select all only selects visible rows (SelectableRows module)                                                        |
| autosize             | <code>Boolean</code>                         | Compute column sizes based on given data (Autosize module)                                                          |
| autoheight           | <code>Boolean</code>                         | Adjust height so that it matches table size (FixedHeight module)                                                    |
| autohidePager        | <code>Boolean</code>                         | auto-hides the pager when number of records falls below the selected page size                                      |
| menu                 | <code>Boolean</code>                         | Right click menu on column headers (ContextMenu module)                                                             |
| reorder              | <code>Boolean</code>                         | Allows a column reordering functionality (DraggableHeaders module)                                                  |
| responsive           | <code>Boolean</code>                         | Change display mode on small screens (ResponsiveGrid module)                                                        |
| responsiveToggle     | <code>Boolean</code>                         | Show toggle column (ResponsiveGrid module)                                                                          |
| filterOnEnter        | <code>Boolean</code>                         | Toggles the ability to filter column data by pressing the Enter or Return key                                       |
| spinnerClass         | <code>String</code>                          | Sets a space-delimited string of css class(es) for a spinner (use spinner-border css class for bootstrap 5 spinner) |
| filterKeypressDelay  | <code>Number</code>                          | Sets a keypress delay time in milliseconds before triggering filter operation.                                                                    |

<a name="Column"></a>

## Column

When using the response data or the JS api, you have the opportunity to pass column definitions. This scenario is not supported using
regular attributes to avoid cluttering the node with a very large attribute.

| Name              | Type                                         | Description                                                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| field             | <code>String</code>                          | the key in the data                                                                                                                                                                                                                                                    |
| title             | <code>String</code>                          | the title to display in the header (defaults to "field" if not set)                                                                                                                                                                                                    |
| width             | <code>Number</code>                          | the width of the column (auto otherwise)                                                                                                                                                                                                                               |
| class             | <code>String</code>                          | class to set on the column (target body or header with th.class or td.class)                                                                                                                                                                                           |
| attr              | <code>String</code>                          | don't render the column and set a matching attribute on the row with the value of the field                                                                                                                                                                            |
| hidden            | <code>Boolean</code>                         | hide the column                                                                                                                                                                                                                                                        |
| noSort            | <code>Boolean</code>                         | allow disabling sort for a given column                                                                                                                                                                                                                                |
| format            | <code>String</code> \| <code>function</code> | custom data formatting, either by a string of HTML template or by a function with an object parameter consisting of column, rowData, cellData, td, tr.                                                                                                                 |
| transform         | <code>String</code>                          | custom value transformation                                                                                                                                                                                                                                            |
| editable          | <code>Boolean</code>                         | replace with input (EditableColumn module)                                                                                                                                                                                                                             |
| responsive        | <code>Number</code>                          | the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)                                                                                                                                                                             |
| responsiveHidden  | <code>Boolean</code>                         | hidden through responsive module (ResponsiveGrid module)                                                                                                                                                                                                               |
| filterType        | <code>String</code>                          | defines a filter field type ("text" or "select" - defaults to "text")                                                                                                                                                                                                  |
| filterList        | <code>Array</code>                           | defines a custom array to populate a filter select field in the format of ```[{value: "", text: ""},...]```.<br/>When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records. |
| firstFilterOption | <code>Object</code>                          | defines an object for the first option element of the filter select field. defaults to ```{value: "", text: ""}
| saveState         | <code>Boolean</code>                         | stores grid filter, sort, and paging ```                                                                                                                                                           |

<a name="Action"></a>

## Action

| Name    | Type                 | Description               |
| ------- | -------------------- | ------------------------- |
| title   | <code>String</code>  | the title of the button   |
| name    | <code>String</code>  | the name of the action    |
| class   | <code>String</code>  | the class for the button  |
| url     | <code>String</code>  | link for the action       |
| html    | <code>String</code>  | custom button data        |
| confirm | <code>Boolean</code> | needs confirmation        |
| default | <code>Boolean</code> | is the default row action |

<a name="Plugins"></a>

## Plugins

Some features have been extracted as plugins to make base class lighter. You can
find them in the `plugins` directory.

| Name               | Type                                               | Description                                               |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------- |
| [ColumnResizer]    | [<code>ColumnResizer</code>](#ColumnResizer)       | resize handlers in the headers                            |
| [ContextMenu]      | [<code>ContextMenu</code>](#ContextMenu)           | menu to show/hide columns                                 |
| [DraggableHeaders] | [<code>DraggableHeaders</code>](#DraggableHeaders) | draggable headers columns                                 |
| [EditableColumn]   | [<code>EditableColumn</code>](#EditableColumn)     | draggable headers columns                                 |
| [TouchSupport]     | [<code>TouchSupport</code>](#TouchSupport)         | touch swipe                                               |
| [SelectableRows]   | [<code>SelectableRows</code>](#SelectableRows)     | create a column with checkboxes to select rows            |
| [FixedHeight]      | [<code>FixedHeight</code>](#FixedHeight)           | allows having fixed height tables                         |
| [AutosizeColumn]   | [<code>AutosizeColumn</code>](#AutosizeColumn)     | compute ideal width based on column content               |
| [ResponsiveGrid]   | [<code>ResponsiveGrid</code>](#ResponsiveGrid)     | hide/show column on the fly                               |
| [RowActions]       | [<code>RowActions</code>](#RowActions)             | add action on rows                                        |
| [SpinnerSupport]   | [<code>SpinnerSupport</code>](#SpinnerSupport)     | inserts a spinning icon element to indicate grid loading. |

<a name="ServerParams"></a>

## ServerParams

| Name                         | Type                |
| ---------------------------- | ------------------- |
| serverParams.start           | <code>String</code> |
| serverParams.length          | <code>String</code> |
| serverParams.search          | <code>String</code> |
| serverParams.sort            | <code>String</code> |
| serverParams.sortDir         | <code>String</code> |
| serverParams.dataKey         | <code>String</code> |
| serverParams.metaKey         | <code>String</code> |
| serverParams.metaTotalKey    | <code>String</code> |
| serverParams.metaFilteredKey | <code>String</code> |
| serverParams.optionsKey      | <code>String</code> |
| serverParams.paramsKey       | <code>String</code> |

## Other attributes

| Option     | Required | Type    | Default   | Description    |
| ---------- | :------: | ------- | --------- | -------------- |
| **sticky** |    No    | Boolean | **false** | Sticky headers |
| **page**   |    No    | Number  | **1**     | Current page   |

## Responsive

This table provide two ways for responsive data.

- A solution based on resizeObserver that will show/hide columns as needed (TODO: display collapsed content with a toggle)
- A CSS Only solution based on media queries that will change the layout on smaller screens

## Translations

You can use when defined to set your own translations with `setLabels`

```html
<script type="module">
  customElements.whenDefined("data-grid").then(() => {
    customElements.get("data-grid").setLabels({
      items: "rows",
    });
  });
</script>
```

| Name          | Type                |
| ------------- | ------------------- |
| itemsPerPage  | <code>String</code> |
| gotoPage      | <code>String</code> |
| gotoFirstPage | <code>String</code> |
| gotoPrevPage  | <code>String</code> |
| gotoNextPage  | <code>String</code> |
| gotoLastPage  | <code>String</code> |
| of            | <code>String</code> |
| items         | <code>String</code> |
| resizeColumn  | <code>String</code> |
| noData        | <code>String</code> |
| areYouSure    | <code>String</code> |
| networkError  | <code>String</code> |

## Actions

Define your actions as part of the options

```js
...
    "actions": [
      {
        "name": "edit"
      },
      {
        "name": "delete",
        "class": "is-danger",
        "url": "/delete/{id}"
      }
    ],
...
```

Then simply listen to them

```js
document.getElementById("demo2-grid").addEventListener("action", (ev) => {
  // It contains data and action
  console.log(ev.detail);
});
```

You can add:

- class: custom class
- url: a formaction will be set (data between {} is interpolated)
- title: a custom title
- html: custom html for the button (in order to provide icons, etc)

## Inline editing

Set your column as editable

```js
...
  {
      "field": "email",
      "title": "Email",
      "width": 200,
      "editable": true
  },
```

Then simply listen to changes

```js
document.getElementById("demo2-grid").addEventListener("edit", (ev) => {
  // It contains data and value
  console.log(ev.detail);
});
```

You can check `demo-server.html` to get a sample usage with saving functionnality

## Api

| Name             | Description                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **getFirst**     | goes to first page                                                                                           |
| **getLast**      | goes to last page                                                                                            |
| **getPrev**      | goes to previous page                                                                                        |
| **getNext**      | goes to next page                                                                                            |
| **getSelection** | gets selected data                                                                                           |
| **clearData**    | clears loaded data                                                                                           |
| **preload**      | preloads the data intended to bypass the initial fetch operation, allowing for faster intial page load time. |
| **refresh**      | clears and reloads data from url                                                                             |
| **reload**       | reloads data from url                                                                                        |
| **clearFilter**  | clears current filters                                                                                       |
| **addRow**       | adds a new row                                                                                               |
| **removeRow**    | removes a row                                                                                                |
| **getData**      | gets data                                                                                                    |
| **sortAsc**      | sorts data by column name in ascending order                                                                  |
| **sortDesc**     | sorts data by column name in descending order                                                                 |
| **sortNone**     | resets column sort state                                                                                     |

## Events

| Name                 | Trigger                                  |
| -------------------- | ---------------------------------------- |
| **edit**             | A row is edited                          |
| **action**           | An action is performed                   |
| **connected**        | The grid is connected                    |
| **disconnected**     | The grid is disconnected                 |
| **columnResized**    | A column is resized                      |
| **columnVisibility** | A column is hidden/shown                 |
| **columnReordered**  | A column is dragged                      |
| **rowsSelected**     | Any or all rows are selected             |
| **headerRendered**   | Column header (thead) render is complete |
| **bodyRendered**     | Table body (tbody) render is complete    |

## Server

For large data set, you may need to use the pagination or filtering on the server.

It works just the same way except the response should return a a `meta` key with

- total: the total (unfiltered) number of rows (info only).
- filtered: the total value of rows matching the current filter (used for pagination).

Server parameters are sent as query string and are `start`, `length` and `search`.
To enable server mode, use `server=true`. These can be changed to your own server
settings with the `serverParams` option object.

You can check `demo/server.html` and `demo-server.php` for an example.

## Demo

<!--
```
<custom-element-demo>
  <template>
    <script type="module" src="https://cdn.jsdelivr.net/gh/lekoala/data-grid/data-grid.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lekoala/data-grid/data-grid.min.css" />
    <data-grid url="https://cdn.jsdelivr.net/gh/lekoala/data-grid/demo.json" sticky></data-grid>
  </template>
</custom-element-demo>
```
-->

This way -> https://codepen.io/lekoalabe/pen/NWvLByP

## Browser Support

Only modern browsers (anything that supports js modules)

## Credits

This component is heavily inspired by https://github.com/riverside/zino-grid

## License

data-grid-component is licensed under the MIT license.
