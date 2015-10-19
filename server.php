<?php

header('Content-Type: application/json');

// If we don't have an authentication token, fail the request
if (!array_key_exists('HTTP_AUTH_TOKEN', $_SERVER)) {
    header('HTTP/1.0 403 Forbidden');
    echo json_encode(['error' => 'no_auth_token']);
    exit;
}

echo json_encode(['response' => 'Your settings are saved']);
