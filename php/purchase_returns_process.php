<?php
// Returns to supplier, tied to a stock_in (receiving) record
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/stock_helper.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

function returnable_lines(PDO $pdo, int $stock_in_id): array {
    $stmt = $pdo->prepare("
        SELECT sid.item_id, i.item_name, sid.quantity AS received, sid.unit_cost,
               COALESCE((SELECT SUM(prd.quantity) FROM purchase_return_details prd
                         INNER JOIN purchase_returns pr ON prd.purchase_return_id = pr.purchase_returns_id
                         WHERE pr.stock_in_id = sid.stock_in_id AND prd.item_id = sid.item_id),0) AS returned
        FROM stock_in_details sid
        INNER JOIN items i ON sid.item_id = i.item_id
        WHERE sid.stock_in_id = :id
    ");
    $stmt->execute([':id' => $stock_in_id]);
    return $stmt->fetchAll();
}

try {
    if ($action === 'get_stock_ins') {
        $stmt = $pdo->query("
            SELECT si.stock_in_id, po.purchase_order_number, s.supplier_name,
                   DATE_FORMAT(si.stock_in_date, '%b %d, %Y') AS received_date
            FROM stock_in si
            LEFT JOIN purchase_orders po ON si.purchase_order_id = po.purchase_order_id
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            ORDER BY si.stock_in_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'get_details') {
        echo json_encode(['success' => true, 'details' => returnable_lines($pdo, (int)($_GET['stock_in_id'] ?? 0))]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT pr.purchase_returns_id, DATE_FORMAT(pr.return_date, '%b %d, %Y %h:%i %p') AS return_date,
                   po.purchase_order_number, s.supplier_name, i.item_name, prd.quantity, prd.unit_cost,
                   (prd.quantity * prd.unit_cost) AS total_cost,
                   CONCAT(u.first_name, ' ', u.last_name) AS user_name
            FROM purchase_returns pr
            INNER JOIN purchase_return_details prd ON prd.purchase_return_id = pr.purchase_returns_id
            INNER JOIN items i ON prd.item_id = i.item_id
            INNER JOIN stock_in si ON pr.stock_in_id = si.stock_in_id
            LEFT JOIN purchase_orders po ON si.purchase_order_id = po.purchase_order_id
            LEFT JOIN suppliers s ON pr.supplier_id = s.supplier_id
            LEFT JOIN users u ON pr.user_id = u.user_id
            ORDER BY pr.purchase_returns_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $stock_in_id = (int)($_POST['stock_in_id'] ?? 0);
        $item_ids = $_POST['item_ids'] ?? [];
        $qtys     = $_POST['quantities'] ?? [];

        if ($stock_in_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Please select a stock-in (receiving) record.']);
            exit;
        }

        // supplier comes from the PO of that stock_in
        $sup = $pdo->prepare("SELECT po.supplier_id FROM stock_in si
                              LEFT JOIN purchase_orders po ON si.purchase_order_id = po.purchase_order_id
                              WHERE si.stock_in_id = :id");
        $sup->execute([':id' => $stock_in_id]);
        $supplier_id = (int)$sup->fetchColumn();
        if ($supplier_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Cannot determine the supplier for this stock-in.']);
            exit;
        }

        $lines = [];
        foreach (returnable_lines($pdo, $stock_in_id) as $l) {
            $lines[(int)$l['item_id']] = $l;
        }

        $toInsert = [];
        for ($i = 0; $i < count($item_ids); $i++) {
            $item = (int)$item_ids[$i];
            $qty  = (int)($qtys[$i] ?? 0);
            if ($qty <= 0) continue;
            if (!isset($lines[$item]) || $qty > ((int)$lines[$item]['received'] - (int)$lines[$item]['returned'])) {
                echo json_encode(['success' => false, 'message' => 'Return quantity exceeds the quantity received (minus earlier returns).']);
                exit;
            }
            if ($qty > get_stock($pdo, $item)) {
                echo json_encode(['success' => false, 'message' => 'Not enough current stock to return ' . $lines[$item]['item_name'] . '.']);
                exit;
            }
            $toInsert[] = [$item, $qty, (float)$lines[$item]['unit_cost']];
        }
        if (empty($toInsert)) {
            echo json_encode(['success' => false, 'message' => 'Enter a return quantity for at least one item.']);
            exit;
        }

        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO purchase_returns (stock_in_id, supplier_id, user_id, return_date) VALUES (:si, :s, :u, NOW())")
            ->execute([':si' => $stock_in_id, ':s' => $supplier_id, ':u' => $_SESSION['user_id']]);
        $pr_id = $pdo->lastInsertId();

        $ins = $pdo->prepare("INSERT INTO purchase_return_details (purchase_return_id, item_id, quantity, unit_cost)
                              VALUES (:p, :i, :q, :c)");
        foreach ($toInsert as [$item, $qty, $cost]) {
            $ins->execute([':p' => $pr_id, ':i' => $item, ':q' => $qty, ':c' => $cost]);
        }
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Purchase return recorded. Stock has been deducted.']);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>