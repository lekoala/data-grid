<?php

// Filters as key => value
$q = [];
if (isset($_GET["search"])) {
    $q = filter_var_array($_GET["search"]);
}
$start = $_GET["start"] ?? 0;
$length = $_GET["length"] ?? 10;

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

// Filter
// In practice, you would make a db query with a where clause
$filteredData = [];
foreach ($data as $row) {
    $found = true;
    foreach ($q as $col => $val) {
        if (!$val) {
            continue;
        }
        if (!isset($data[$col])) {
            continue;
        }
        if (strpos($data[$col], $val) === false) {
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
