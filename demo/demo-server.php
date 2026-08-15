<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

$page = intval($_GET["page"] ?? 1);
$pageSize = intval($_GET["pageSize"] ?? 10);
$sort = $_GET["sort"][0]["field"] ?? null;
$sortDir = $_GET["sort"][0]["direction"] ?? null;
$filters = $_GET["filters"] ?? [];
$action = $_GET["action"] ?? null;

session_start();
if (empty($_SESSION["data"])) {
    $_SESSION["data"] = [];
}

// Basic action routing
if ($action) {
    switch ($action) {
        case "edit":
            $content = trim(file_get_contents("php://input"));
            $decoded = json_decode($content, true);
            $data = $decoded["data"];
            $_SESSION["data"][$data["id"]] = $data;
            echo json_encode(["success" => 1, "record" => $data]);
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
    // Retrieve data from session if present
    if (isset($_SESSION["data"][$i])) {
        $data[] = $_SESSION["data"][$i];
    } else {
        $data[] = [
            "id" => $i,
            "first_name" => "First name " . $i,
            "last_name" => "Last name " . $i,
            "company" => $companies[$i % 3],
        ];
    }
}

// That would be an order by clause
if ($sort) {
    $dir = $sortDir === "desc" ? SORT_DESC : SORT_ASC;
    array_multisort(array_column($data, $sort), $dir, $data);
}

// Filter
// In practice, you would make a db query with a where clause
$filteredData = [];
foreach ($data as $row) {
    $found = true;
    foreach ($filters as $col => $filter) {
        $operator = $filter["operator"] ?? "contains";
        $value = $filter["value"] ?? "";

        // empty / notEmpty operate on the cell itself
        if ($operator === "empty" || $operator === "notEmpty") {
            $empty = !isset($row[$col]) || $row[$col] === null || $row[$col] === "";
            if ($operator === "empty" && !$empty) $found = false;
            if ($operator === "notEmpty" && $empty) $found = false;
            continue;
        }

        // All remaining operators require a value
        if ($value === "" || $value === null) {
            continue;
        }
        if (!isset($row[$col])) {
            continue;
        }
        $cell = (string)$row[$col];
        $stringValue = (string)$value;
        switch ($operator) {
            case "eq":
                if ($cell !== $stringValue) $found = false;
                break;
            case "neq":
                if ($cell === $stringValue) $found = false;
                break;
            case "startsWith":
                if (stripos($cell, $stringValue) !== 0) $found = false;
                break;
            case "endsWith":
                if (substr($cell, -strlen($stringValue)) !== $stringValue) $found = false;
                break;
            case "lt":
            case "lte":
            case "gt":
            case "gte":
                if (!is_numeric($row[$col]) || !is_numeric($value)) break;
                $a = (float)$row[$col];
                $b = (float)$value;
                if ($operator === "lt" && $a >= $b) $found = false;
                if ($operator === "lte" && $a > $b) $found = false;
                if ($operator === "gt" && $a <= $b) $found = false;
                if ($operator === "gte" && $a < $b) $found = false;
                break;
            case "between":
                if (!is_array($value) || count($value) !== 2) break;
                if (!is_numeric($row[$col])) break;
                $a = (float)$row[$col];
                $min = (float)$value[0];
                $max = (float)$value[1];
                if ($a < $min || $a > $max) $found = false;
                break;
            case "in":
                if (!is_array($value)) break;
                $values = array_map("strval", $value);
                if (!in_array($cell, $values)) $found = false;
                break;
            default:
                if (stripos($cell, $stringValue) === false) $found = false;
        }
    }
    if ($found) {
        $filteredData[] = $row;
    }
}

// a query with limit clause, 1 based pages
$totalPages = max(1, ceil(count($filteredData) / $pageSize));
if ($page > $totalPages) {
    $page = $totalPages;
}
if ($page < 1) {
    $page = 1;
}
$offset = ($page - 1) * $pageSize;
$chunk = array_slice($filteredData, $offset, $pageSize);

$arr = [
    "meta" => [
        // probably some count query on the db
        "total" => count($data),
        "filtered" => count($filteredData),
    ],
    "data" => $chunk,
];

// simulate laggy server
sleep(rand(0, 2));

header("Content-Type: application/json");
echo json_encode($arr);
