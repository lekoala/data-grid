# Data Grid Web Component

[![NPM](https://nodei.co/npm/data-grid-component.png?mini=true)](https://nodei.co/npm/data-grid-component/)
[![Downloads](https://img.shields.io/npm/dt/data-grid-component.svg)](https://www.npmjs.com/package/data-grid-component)

Autonomous open source grid component with RTL support built on Custom Elements and Shadow DOM specifications.

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
  grid.dataset.url = "data.json";
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

Data Grid inherits wherever possible from Bootstrap 5.1 styles.

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

- field: the key in the data
- title: the title to display in the header (defaults to "field" if not set)
- width: the width of the column (auto otherwise)
- class: class to set on the column (target body or header with th.class or td.class)
- attr: don't render the column and set a matching attribute on the row with the value of the field
- hidden: hide the column

Note : you can also pass a plain list of comma separated string, or a js object with the field => title mapping.

### Options attributes

These attributes can be used to configure the component.

| Option           | Required | Type    | Default     | Description                                                                              |
| ---------------- | :------: | ------- | ----------- | ---------------------------------------------------------------------------------------- |
| **url**          |   Yes    | String  | **(empty)** | An URL with data to display in JSON format.                                              |
| **page**         |    No    | Number  | **1**       | Currently displayed page.                                                                |
| **per-page**     |    No    | Number  | **10**      | Number of records displayed per page.                                                    |
| **debug**        |    No    | Boolean | **false**   | Log actions in DevTools console.                                                         |
| **filter**       |    No    | Boolean | **false**   | Allows a filtering functionallity.                                                       |
| **sort**         |    No    | Boolean | **false**   | Allows a sort by column functionallity.                                                  |
| **reorder**      |    No    | Boolean | **false**   | Allows a column reordering functionallity.                                               |
| **dir**          |    No    | String  | **ltr**     | Text direction. Accepted values are **ltr** (left-to-right) and **rtl** (right-to-left). |
| **default-sort** |    No    | String  | **id**      | Default sort field if sorting is enabled.                                                |
| **expand**       |    No    | Boolean | **false**   | Expand cells on hover if truncated                                                       |
| **sticky**       |    No    | Boolean | **false**   | Sticky headers                                                                           |
| **resizable**    |    No    | Boolean | **false**   | Resizable columns                                                                        |
| **autosize**     |    No    | Boolean | **false**   | Compute column sizes based on given data.                                                |
| **responsive**   |    No    | Boolean | **false**   | Change display mode on small screens.                                                    |
| **selectable**   |    No    | Boolean | **false**   | Allow selecting rows with a checkbox.                                                    |

## Translations

Provide a global variable with the required translations.

```html
<script type="module">
  window["DataGridLabels"] = {
    page: "Go to page",
    gotoPage: "Go to page",
  };
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

## Api

- getFirst: go to first page
- getLast: go to last page
- getPrev: go to previous page
- getNext: go to next page
- getSelection: get selected data
- clearData: clear loaded data
- refresh: refresh data from url
- clearFilter: clear current filters
- addRow: add a new row
- removeRow: remove a row
- getData: get data

## Todo

- Server side pagination/filtering
- Actions
- Inline editing

## Demo

<!--
```
<custom-element-demo>
  <template>
    <script type="module" src="https://cdn.jsdelivr.net/gh/lekoala/data-grid/data-grid.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lekoala/data-grid/data-grid.min.css" />
    <data-grid url="https://cdn.jsdelivr.net/gh/lekoala/data-grid/demo.json" sticky expand></data-grid>
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
