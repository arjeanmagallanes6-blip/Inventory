<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/stock_helper.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['user_id'])) {
    $response['message'] = 'Unauthorized access. Please log in.';
    echo json_encode($response);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    if ($action === 'get_items') {
        $stmt = $pdo->query("
            SELECT i.item_id, i.item_name, u.unit_name
            FROM items i
            LEFT JOIN units u ON i.unit_id = u.unit_id
            WHERE i.is_deleted = 0
            ORDER BY i.item_name ASC
        ");
        echo json_encode(['success' => true, 'items' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT
                so.stock_out_id,
                CONCAT('SO-', LPAD(so.stock_out_id, 4, '0')) AS stock_out_no,
                sod.quantity,
                DATE_FORMAT(so.stock_out_date, '%b %d, %Y %h:%i %p') AS created_at,
                i.item_name,
                CONCAT(u.first_name, ' ', u.last_name) AS user_name
            FROM stock_out so
            INNER JOIN stock_out_details sod ON so.stock_out_id = sod.stock_out_id
            INNER JOIN items i ON sod.item_id = i.item_id
            LEFT JOIN users u ON so.user_id = u.user_id
            ORDER BY so.stock_out_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_id  = (int)($_POST['item_id'] ?? 0);
        $quantity = (int)($_POST['quantity'] ?? 0);
        $user_id  = $_SESSION['user_id'];

        if ($item_id <= 0 || $quantity <= 0) {
            $response['message'] = 'Please select a valid item and quantity greater than zero.';
            echo json_encode($response);
            exit;
        }

        // Stock check: stock in - stock out + returns - purchase returns + adjustments
        $availableStock = get_stock($pdo, $item_id);
        if ($quantity > $availableStock) {
            $response['message'] = "Insufficient stock! Only {$availableStock} unit(s) available in inventory.";
            echo json_encode($response);
            exit;
        }

        $pdo->beginTransaction();

        // 1. Header (ERD: stock_out_id, user_id, stock_out_date)
        $pdo->prepare("INSERT INTO stock_out (user_id, stock_out_date) VALUES (:user_id, NOW())")
            ->execute([':user_id' => $user_id]);
        $stock_out_id = $pdo->lastInsertId();

        // 2. Detail
        $pdo->prepare("INSERT INTO stock_out_details (stock_out_id, item_id, quantity)
                       VALUES (:stock_out_id, :item_id, :quantity)")
            ->execute([':stock_out_id' => $stock_out_id, ':item_id' => $item_id, ':quantity' => $quantity]);

        $pdo->commit();

        $no = 'SO-' . str_pad($stock_out_id, 4, '0', STR_PAD_LEFT);
        $response['success'] = true;
        $response['message'] = "Stock-out recorded. Number: {$no}";
        echo json_encode($response);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = 'Database error: ' . $e->getMessage();
    echo json_encode($response);
}
?>