<?php

header('Content-Type: application/json');

if (array_key_exists('fail', $_GET)) {
    header('HTTP/1.0 403 Forbidden');
}

echo json_encode(['response' => 'yeah !']);
