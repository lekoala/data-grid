<?php

// Filters as key => value
$q = [];
if (isset($_GET["search"]) && is_array($_GET["search"])) {
    $q = filter_var_array($_GET["search"]);
}
$start = intval($_GET["start"] ?? 0); // 0 based
$length = intval($_GET["length"] ?? 10);
$sort = $_GET["sort"] ?? null;
$sortDir = $_GET["sortDir"] ?? null;
$action = $_GET["action"] ?? null;

session_start();
if (empty($_SESSION["data"])) {
    $_SESSION["data"] = [];
}
if ($action) {
    switch ($action) {
        case "edit":
            $content = trim(file_get_contents("php://input"));
            $decoded = json_decode($content, true);
            $data = $decoded["data"];
            $_SESSION["data"][$data["id"]] = $data;
            echo json_encode(["success" => 1]);
            break;
    }
    die();
}

// Mock some data instead of querying a db
$data = [];
$companies = [
    "Acme",
    "Google",
    "Facebook",
];
foreach (range(1, 998) as $i) {
    if (isset($_SESSION["data"][$i])) {
        $data[] = $_SESSION["data"][$i];
    } else {
        $data[] = [
            "id" => $i,
            "first_name" => "First name " . $i,
            "last_name" => "Last name " . $i,
            "company" => $companies[$i % 3]
        ];
    }
}

// That would be an order by clause
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
// cap to max amount, 0 based
if ($start * $length > count($filteredData)) {
    $start = floor(count($filteredData) / $length);
}
if ($start < 0) {
    $start = 0;
}
$chunk = array_slice($filteredData, $start * $length, $length);

$arr = [
    "meta" => [
        // probably some count query on the db
        "total" => count($data),
        "filtered" => count($filteredData),
        "start" => $start,
    ],
    "options" => [
        "columns" => [
            [
                "field" => "id",
                "title" => "#",
            ],
            [
                "field" => "first_name",
                "title" => "First Name",
            ],
            [
                "field" => "last_name",
                "title" => "Last Name",
            ],
            [
                "field" => "company",
                "title" => "Company",
                "noSort" => true,
                "editable" => true,
            ],
        ],
    ],
    "data" => $chunk,
];

sleep(rand(0, 2));

header("Content-Type: application/json");
echo json_encode($arr);
