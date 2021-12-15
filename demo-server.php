<?php

// Filters as key => value
$q = [];
if (isset($_GET["search"]) && is_array($_GET["search"])) {
    $q = filter_var_array($_GET["search"]);
}
$start = intval($_GET["start"] ?? 0);
$length = intval($_GET["length"] ?? 10);
$sort = $_GET["sort"] ?? null;
$sortDir = $_GET["sortDir"] ?? null;
$data = [];
$companies = [
    "Acme",
    "Google",
    "Facebook",
];
// Mock some data
foreach (range(1, 1000) as $i) {
    $data[] = [
        "id" => $i,
        "first_name" => "First name " . $i,
        "last_name" => "Last name " . $i,
        "company" => $companies[$i % 3]
    ];
}

if ($sort && $sortDir) {
    switch ($sortDir) {
        case "ascending":
            $dir = SORT_ASC;
            break;
        case "descending":
            $dir = SORT_DESC;
            break;
    }
    array_multisort(array_column($data, $sort), $dir, $data);
}

// Filter
// In practice, you would make a db query with a where clause
$filteredData = [];
foreach ($data as $row) {
    $found = true;
    foreach ($q as $col => $val) {
        if (!$val) {
            continue;
        }
        if (!isset($row[$col])) {
            continue;
        }
        if (stripos($row[$col], $val) === false) {
            $found = false;
        }
    }
    if ($found) {
        $filteredData[] = $row;
    }
}
// a query with limit clause
$chunk = array_slice($filteredData, $start * $length, $length);

$arr = [
    "meta" => [
        // probably some count query on the db
        "total" => count($data),
        "filtered" => count($filteredData),
    ],
    "data" => $chunk,
];

header("Content-Type: application/json");
echo json_encode($arr);
