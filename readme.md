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

- Install with **bower**

```
$ bower install data-grid-component
```

### Initialization

- HTML way

```html
<data-grid data-url="data.json"></data-grid>
<script type="module" src="./data-grid.js"></script>
```

Grid customizations are possible via `data-*` attributes.

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

Note : you can also pass a plain list of comma separated string, or a js object with the field => title mapping.

### Options attributes

These attributes can be used to configure the component.

| Option           | Required | Type    | Default     | Description                                                                              |
| ---------------- | :------: | ------- | ----------- | ---------------------------------------------------------------------------------------- |
| **url**          |   Yes    | String  | **(empty)** | An URL with data to display in JSON format.                                              |
| **page**         |    No    | Number  | **1**       | Currently displayed page.                                                                |
| **perPage**      |    No    | Number  | **5**       | Number of records displayed per page.                                                    |
| **debug**        |    No    | Boolean | **false**   | Log actions in DevTools console.                                                         |
| **filter**       |    No    | Boolean | **false**   | Allows a filtering functionallity.                                                       |
| **sort**         |    No    | Boolean | **false**   | Allows a sort by column functionallity.                                                  |
| **reorder**      |    No    | Boolean | **false**   | Allows a column reordering functionallity.                                               |
| **dir**          |    No    | String  | **ltr**     | Text direction. Accepted values are **ltr** (left-to-right) and **rtl** (right-to-left). |
| **default-sort** |    No    | String  | **id**      | Default sort field if sorting is enabled.                                                |

## Todo

- Server side pagination/filtering
- Row selection
- Actions
- Inline editing

## Browser Support

Only modern browsers (anything that supports js modules)

## Credits

This component is heavily inspired by https://github.com/riverside/zino-grid

## License

data-grid-component is licensed under the MIT license.
