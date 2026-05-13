<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$base = $root.'/../frontend/node_modules/@jobuntux/psgc/data/2025-2Q';
$provincesPath = $base.'/provinces.json';
$muncitiesPath = $base.'/muncities.json';
if (! is_readable($provincesPath) || ! is_readable($muncitiesPath)) {
    fwrite(STDERR, "Missing @jobuntux/psgc JSON under frontend/node_modules. Run npm install in frontend first.\n");
    exit(1);
}

/** @var array<int, array<string, mixed>> $provinces */
$provinces = json_decode((string) file_get_contents($provincesPath), true, 512, JSON_THROW_ON_ERROR);
/** @var array<int, array<string, mixed>> $muncities */
$muncities = json_decode((string) file_get_contents($muncitiesPath), true, 512, JSON_THROW_ON_ERROR);

/** @var array<string, string[]> $byProv */
$byProv = [];
foreach ($muncities as $m) {
    $pc = isset($m['provCode']) ? (string) $m['provCode'] : '';
    if ($pc === '') {
        continue;
    }
    $byProv[$pc][] = trim((string) $m['munCityName']).' ('.(string) $m['psgcCode'].')';
}

foreach ($byProv as $k => $list) {
    sort($list, SORT_STRING);
    $byProv[$k] = $list;
}

$outDir = $root.'/../frontend/data';
$outPath = $outDir.'/psgc-provinces-cities.txt';
if (! is_dir($outDir)) {
    mkdir($outDir, 0777, true);
}

$fh = fopen($outPath, 'wb');
fwrite($fh, "Philippine provinces and cities/municipalities (PSA PSGC 2025-2Q, dataset via @jobuntux/psgc)\n");
fwrite($fh, str_repeat('=', 80)."\n\n");

foreach ($provinces as $p) {
    $name = trim((string) $p['provName']);
    $code = (string) $p['psgcCode'];
    $pc = isset($p['provCode']) ? (string) $p['provCode'] : '';
    fwrite($fh, "{$name} ({$code})\n");
    $cities = $pc !== '' ? ($byProv[$pc] ?? []) : [];
    foreach ($cities as $line) {
        fwrite($fh, "  - {$line}\n");
    }
    fwrite($fh, "\n");
}

fclose($fh);
echo "Wrote {$outPath}\n";
