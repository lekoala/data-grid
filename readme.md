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

Data Grid inherits wherever possible from Bootstrap 5 styles.

You can also override the following variables.

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

### Configuring columns

When using the response data or the JS api, you have the opportunity to pass column definitions. This scenario is not supported using
regular attributes to avoid cluttering the node with a very large attribute.

The columns must be an array with the following fields:

| Field      | Description                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------- |
| **field**  | the key in the data                                                                         |
| **title**  | the title to display in the header (defaults to "field" if not set)                         |
| **width**  | the width of the column (auto otherwise)                                                    |
| **class**  | class to set on the column (target body or header with th.class or td.class)                |
| **attr**   | don't render the column and set a matching attribute on the row with the value of the field |
| **hidden** | hide the column                                                                             |

Note : you can also pass a plain list of comma separated string, or a js object with the field => title mapping.

### Options attributes

These are the options accessibles through the components data attributes. Some options only work if the proper plugin is loaded.

| Option                  | Required | Type    | Default     | Description                                                                             |
| ----------------------- | :------: | ------- | ----------- | --------------------------------------------------------------------------------------- |
| **url**                 |   Yes    | String  | **(empty)** | An URL with data to display in JSON format                                              |
| **default-page**        |    No    | Number  | **1**       | Starting page                                                                           |
| **per-page**            |    No    | Number  | **10**      | Number of records displayed per page                                                    |
| **debug**               |    No    | Boolean | **false**   | Log actions in DevTools console                                                         |
| **filter**              |    No    | Boolean | **false**   | Allows a filtering functionallity                                                       |
| **sort**                |    No    | Boolean | **false**   | Allows a sort by column functionallity                                                  |
| **dir**                 |    No    | String  | **ltr**     | Text direction. Accepted values are **ltr** (left-to-right) and **rtl** (right-to-left) |
| **default-sort**        |    No    | String  | **id**      | Default sort field if sorting is enabled                                                |
| **expand**              |    No    | Boolean | **false**   | Allow cell content to spawn over multiple lines                                         |
| **resizable**           |    No    | Boolean | **false**   | Resizable columns (ColumnResizer module)                                                |
| **reorder**             |    No    | Boolean | **false**   | Allows a column reordering functionality (DraggableHeaders module)                      |
| **menu**                |    No    | Boolean | **false**   | Right click menu on column headers (ContextMenu module)                                 |
| **autosize**            |    No    | Boolean | **true**    | Compute column sizes based on given data                                                |
| **responsive**          |    No    | Boolean | **false**   | Change display mode on small screens                                                    |
| **selectable**          |    No    | Boolean | **false**   | Allow selecting rows with a checkbox                                                    |
| **select-visible-only** |    No    | Boolean | **true**    | Select all only selects visible rows                                                    |
| **server**              |    No    | Boolean | **false**   | Is a server side powered grid                                                           |
| **server-params**       |    No    | Object  |             | Describe keys passed to the server backed                                               |
| **autoheight**          |    No    | Object  | **true**    | Adjust fixed height so that it matches table size (FixedHeight module)                  |

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

| Name             | Description           |
| ---------------- | --------------------- |
| **getFirst**     | go to first page      |
| **getLast**      | go to last page       |
| **getPrev**      | go to previous page   |
| **getNext**      | go to next page       |
| **getSelection** | get selected data     |
| **clearData**    | clear loaded data     |
| **refresh**      | refresh data from url |
| **clearFilter**  | clear current filters |
| **addRow**       | add a new row         |
| **removeRow**    | remove a row          |
| **getData**      | get data              |

## Events

| Name                 | Trigger                      |
| -------------------- | ---------------------------- |
| **edit**             | A row is edited              |
| **action**           | An action is performed       |
| **connected**        | The grid is connected        |
| **disconnected**     | The grid is disconnected     |
| **columnResized**    | A column is resized          |
| **columnVisibility** | A column is hidden/shown     |
| **columnReordered**  | A column is dragged          |
| **rowsSelected**     | Any or all rows are selected |

## Server

For large data set, you may need to use the pagination or filtering on the server.

It works just the same way except the response should return a a `meta` key with

- total: the total (unfiltered) number of rows (info only).
- filtered: the total value of rows matching the current filter (used for pagination).

Server parameters are sent as query string and are `start`, `length` and `search`.
To enable server mode, use `server=true`. These can be changed to your own server
settings with the `serverParams` option object.

You can check `demo/server.html` and `demo-server.php` for an example.

## Plugins

Some features have been extracted as plugins to make base class lighter. You can
find them in the `plugins` directory.

| Name                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| **ColumnResizer**    | resize handlers in the headers                 |
| **ContextMenu**      | menu to show/hide columns                      |
| **DraggableHeaders** | draggable headers columns                      |
| **TouchSupport**     | touch swipe                                    |
| **SelectableRows**   | create a column with checkboxes to select rows |
| **FixedHeight**      | allows having fixed height tables              |
| **AutosizeColumns**      | allows having fixed height tables              |

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
