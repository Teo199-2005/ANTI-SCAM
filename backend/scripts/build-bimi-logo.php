<?php

/**
 * Build BIMI-friendly assets from frontend/public/mainlogo.png.
 * Run: php scripts/build-bimi-logo.php
 */

$root = dirname(__DIR__, 2);
$source = $root.'/frontend/public/mainlogo.png';
$outPng = $root.'/frontend/public/mainlogo-bimi.png';
$outSvg = $root.'/frontend/public/logo.svg';
$outBackendPng = $root.'/backend/public/brand/mainlogo.png';
$outBackendSvg = $root.'/backend/public/logo.svg';

if (! is_readable($source)) {
    fwrite(STDERR, "Missing source: {$source}\n");
    exit(1);
}

$src = imagecreatefrompng($source);
if ($src === false) {
    fwrite(STDERR, "Could not read PNG\n");
    exit(1);
}

$w = imagesx($src);
$h = imagesy($src);
$size = 96;
$dst = imagecreatetruecolor($size, $size);
imagealphablending($dst, false);
imagesavealpha($dst, true);
$trans = imagecolorallocatealpha($dst, 255, 255, 255, 0);
imagefilledrectangle($dst, 0, 0, $size, $size, $trans);
imagealphablending($dst, true);

$scale = min($size / $w, $size / $h);
$nw = (int) round($w * $scale);
$nh = (int) round($h * $scale);
$x = (int) (($size - $nw) / 2);
$y = (int) (($size - $nh) / 2);
imagecopyresampled($dst, $src, $x, $y, 0, 0, $nw, $nh, $w, $h);

$bestQuality = 9;
foreach ([9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as $quality) {
    imagepng($dst, $outPng, $quality);
    $bytes = filesize($outPng);
    echo "PNG quality {$quality}: {$bytes} bytes\n";
    if ($bytes <= 28000) {
        $bestQuality = $quality;
        break;
    }
}

imagepng($dst, $outPng, $bestQuality);
$pngBytes = file_get_contents($outPng);
$b64 = base64_encode($pngBytes);

$svg = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
    .'<svg version="1.2" baseProfile="tiny-ps" xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'."\n"
    .'  <title>Anti-Scam PH</title>'."\n"
    .'  <image width="96" height="96" href="data:image/png;base64,'.$b64.'"/>'."\n"
    .'</svg>'."\n";

file_put_contents($outSvg, $svg);
copy($outPng, $root.'/backend/public/brand/mainlogo-bimi.png');
copy($source, $outBackendPng);
file_put_contents($outBackendSvg, $svg);

echo 'Wrote '.$outPng.' ('.strlen($pngBytes)." bytes PNG)\n";
echo 'Wrote '.$outSvg.' ('.strlen($svg)." bytes SVG)\n";
echo "Synced backend/public/brand/mainlogo.png\n";

imagedestroy($src);
imagedestroy($dst);
