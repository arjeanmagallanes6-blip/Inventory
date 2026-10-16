<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/stock_helper.php';

// Ensure session is started if not already handled in db.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'unauthorized' => true,
        'message' => 'Unauthorized access.'
    ]);
    exit;
}

try {
    // 1. Active category count (excluding soft-deleted)
    $stmtCat = $pdo->query("SELECT COUNT(*) AS total FROM category WHERE is_deleted = 0");
    $active_categories = (int)($stmtCat->fetch()['total'] ?? 0);

    // 2. Inventory using the full stock formula (see stock_helper.php)
    $stmtItems = $pdo->query("
        SELECT
            i.item_name,
            c.category_name,
            i.minimum_stock,
            " . stock_expr('i') . " AS in_stock
        FROM items i
        LEFT JOIN category c ON i.category_id = c.category_id
        WHERE i.is_deleted = 0
        ORDER BY i.item_id DESC
    ");
    $items = $stmtItems->fetchAll();

    $total_stock = 0;
    $low_stock_count = 0;

    foreach ($items as $item) {
        $stock = (int)$item['in_stock'];
        $min = (int)$item['minimum_stock'];
        $total_stock += $stock;

        if ($min > 0 && $stock < $min) {
            $low_stock_count++;
        }
    }

    echo json_encode([
        'success' => true,
        'full_name' => $_SESSION['full_name'] ?? 'Warehouse Staff',
        'role_name' => $_SESSION['role_name'] ?? 'Staff',
        'stats' => [
            'total_stock' => $total_stock,
            'low_stock_count' => $low_stock_count,
            'active_categories' => $active_categories
        ],
        'items' => $items
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'unauthorized' => false,
        'message' => 'Database Query Error: ' . $e->getMessage()
    ]);
}
?>