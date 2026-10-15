<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/stock_helper.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    if ($action === 'get_options') {
        $items = $pdo->query("SELECT i.item_id, i.item_name, i.shelf_id, " . stock_expr('i') . " AS current_stock
                              FROM items i WHERE i.is_deleted = 0 ORDER BY i.item_name ASC")->fetchAll();
        $shelves = $pdo->query("SELECT shelf_id, shelf_name FROM shelf ORDER BY shelf_name ASC")->fetchAll();
        echo json_encode(['success' => true, 'items' => $items, 'shelves' => $shelves]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT h.adjustment_header_id, h.adjustment_no, h.remarks,
                   DATE_FORMAT(h.adjustment_date, '%b %d, %Y %h:%i %p') AS adjustment_date,
                   i.item_name, sh.shelf_name, CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                   d.quantity_before, d.quantity_adjusted, d.quantity_after
            FROM stock_adjustment_header h
            INNER JOIN stock_adjustment_dtl d ON d.adjustment_hdr_id = h.adjustment_header_id
            INNER JOIN items i ON h.item_id = i.item_id
            LEFT JOIN shelf sh ON h.shelf_id = sh.shelf_id
            LEFT JOIN users u ON h.user_id = u.user_id
            ORDER BY h.adjustment_header_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_id  = (int)($_POST['item_id'] ?? 0);
        $shelf_id = !empty($_POST['shelf_id']) ? (int)$_POST['shelf_id'] : null;
        $adjusted = (int)($_POST['quantity_adjusted'] ?? 0);
        $remarks  = trim($_POST['remarks'] ?? '');

        if ($item_id <= 0 || $adjusted === 0 || $remarks === '') {
            echo json_encode(['success' => false, 'message' => 'Item, a non-zero adjustment, and remarks (reason) are required.']);
            exit;
        }

        $before = get_stock($pdo, $item_id);
        $after  = $before + $adjusted;
        if ($after < 0) {
            echo json_encode(['success' => false, 'message' => "Adjustment would make stock negative (current stock: $before)."]);
            exit;
        }

        $pdo->beginTransaction();
        $adj_no = 'ADJ-' . date('Y') . '-' . random_int(10000, 99999);

        $pdo->prepare("INSERT INTO stock_adjustment_header (adjustment_no, item_id, shelf_id, user_id, adjustment_date, remarks)
                       VALUES (:no, :item, :shelf, :user, NOW(), :remarks)")
            ->execute([':no' => $adj_no, ':item' => $item_id, ':shelf' => $shelf_id,
                       ':user' => $_SESSION['user_id'], ':remarks' => $remarks]);
        $hdr = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO stock_adjustment_dtl (adjustment_hdr_id, quantity_before, quantity_adjusted, quantity_after)
                       VALUES (:h, :b, :a, :af)")
            ->execute([':h' => $hdr, ':b' => $before, ':a' => $adjusted, ':af' => $after]);
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => "Stock adjustment $adj_no saved."]);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>