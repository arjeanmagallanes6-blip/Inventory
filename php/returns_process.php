<?php
// Customer returns (RETURNS + RETURN_DETAILS) tied to a stock_out transaction
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

function returnable_lines(PDO $pdo, int $stock_out_id): array {
    $stmt = $pdo->prepare("
        SELECT sod.item_id, i.item_name, sod.quantity AS dispatched,
               COALESCE((SELECT SUM(rd.quantity) FROM return_details rd
                         INNER JOIN returns r ON rd.return_id = r.return_id
                         WHERE r.stock_out_id = sod.stock_out_id AND rd.item_id = sod.item_id),0) AS returned
        FROM stock_out_details sod
        INNER JOIN items i ON sod.item_id = i.item_id
        WHERE sod.stock_out_id = :id
    ");
    $stmt->execute([':id' => $stock_out_id]);
    return $stmt->fetchAll();
}

try {
    if ($action === 'get_stock_outs') {
        $stmt = $pdo->query("
            SELECT so.stock_out_id,
                   CONCAT('SO-', LPAD(so.stock_out_id, 4, '0')) AS stock_out_no,
                   DATE_FORMAT(so.stock_out_date, '%b %d, %Y') AS stock_out_date,
                   GROUP_CONCAT(CONCAT(i.item_name, ' x', sod.quantity) SEPARATOR ', ') AS items
            FROM stock_out so
            LEFT JOIN stock_out_details sod ON so.stock_out_id = sod.stock_out_id
            LEFT JOIN items i ON sod.item_id = i.item_id
            GROUP BY so.stock_out_id
            ORDER BY so.stock_out_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'get_details') {
        echo json_encode(['success' => true, 'details' => returnable_lines($pdo, (int)($_GET['stock_out_id'] ?? 0))]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT r.return_id, DATE_FORMAT(r.return_date, '%b %d, %Y %h:%i %p') AS return_date,
                   CONCAT('SO-', LPAD(r.stock_out_id, 4, '0')) AS stock_out_no,
                   i.item_name, rd.quantity,
                   CONCAT(u.first_name, ' ', u.last_name) AS user_name
            FROM returns r
            INNER JOIN return_details rd ON rd.return_id = r.return_id
            INNER JOIN items i ON rd.item_id = i.item_id
            LEFT JOIN users u ON r.user_id = u.user_id
            ORDER BY r.return_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $stock_out_id = (int)($_POST['stock_out_id'] ?? 0);
        $item_ids = $_POST['item_ids'] ?? [];
        $qtys     = $_POST['quantities'] ?? [];

        if ($stock_out_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Please select a stock-out transaction.']);
            exit;
        }

        $remaining = [];
        foreach (returnable_lines($pdo, $stock_out_id) as $l) {
            $remaining[(int)$l['item_id']] = (int)$l['dispatched'] - (int)$l['returned'];
        }

        $toInsert = [];
        for ($i = 0; $i < count($item_ids); $i++) {
            $item = (int)$item_ids[$i];
            $qty  = (int)($qtys[$i] ?? 0);
            if ($qty <= 0) continue;
            if (!isset($remaining[$item]) || $qty > $remaining[$item]) {
                echo json_encode(['success' => false, 'message' => 'Return quantity exceeds the quantity still returnable for an item.']);
                exit;
            }
            $toInsert[] = [$item, $qty];
        }
        if (empty($toInsert)) {
            echo json_encode(['success' => false, 'message' => 'Enter a return quantity for at least one item.']);
            exit;
        }

        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO returns (stock_out_id, user_id, return_date) VALUES (:so, :u, NOW())")
            ->execute([':so' => $stock_out_id, ':u' => $_SESSION['user_id']]);
        $return_id = $pdo->lastInsertId();

        $ins = $pdo->prepare("INSERT INTO return_details (return_id, item_id, quantity) VALUES (:r, :i, :q)");
        foreach ($toInsert as [$item, $qty]) {
            $ins->execute([':r' => $return_id, ':i' => $item, ':q' => $qty]);
        }
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Return recorded. Stock has been added back.']);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>