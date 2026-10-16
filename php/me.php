<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true]);
    exit;
}

echo json_encode([
    'success' => true,
    'role'    => $_SESSION['role_name'] ?? '',
    'name'    => $_SESSION['full_name'] ?? ''
]);
?>