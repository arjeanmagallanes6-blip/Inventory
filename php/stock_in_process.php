<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['user_id'])) {
    $response['message'] = 'Unauthorized access. Please log in.';
    echo json_encode($response);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    // Purchase orders that still have items waiting to be received (supports partial receiving)
    if ($action === 'get_pending_pos') {
        $stmt = $pdo->query("
            SELECT * FROM (
                SELECT
                    po.purchase_order_id,
                    po.purchase_order_number,
                    po.order_date,
                    s.supplier_name,
                    COUNT(pod.purchase_order_detail_id) AS total_items,
                    COALESCE(SUM(pod.quantity), 0) AS ordered_qty,
                    COALESCE((
                        SELECT SUM(sid.quantity)
                        FROM stock_in_details sid
                        INNER JOIN stock_in si ON sid.stock_in_id = si.stock_in_id
                        WHERE si.purchase_order_id = po.purchase_order_id
                    ), 0) AS received_qty
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
                LEFT JOIN purchase_order_details pod ON po.purchase_order_id = pod.purchase_order_id
                GROUP BY po.purchase_order_id
            ) t
            WHERE ordered_qty > received_qty
            ORDER BY purchase_order_id DESC
        ");

        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    // PO header + line items with quantity already received
    if ($action === 'get_po_for_receiving') {
        $po_id = (int)($_GET['po_id'] ?? 0);

        if ($po_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid Purchase Order ID.']);
            exit;
        }

        $stmtHeader = $pdo->prepare("
            SELECT po.*, s.supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.purchase_order_id = :po_id
        ");
        $stmtHeader->execute([':po_id' => $po_id]);
        $header = $stmtHeader->fetch();

        $stmtDetails = $pdo->prepare("
            SELECT pod.*, i.item_name,
                   COALESCE((
                       SELECT SUM(sid.quantity)
                       FROM stock_in_details sid
                       INNER JOIN stock_in si ON sid.stock_in_id = si.stock_in_id
                       WHERE si.purchase_order_id = pod.purchase_order_id AND sid.item_id = pod.item_id
                   ), 0) AS received_qty
            FROM purchase_order_details pod
            LEFT JOIN items i ON pod.item_id = i.item_id
            WHERE pod.purchase_order_id = :po_id
        ");
        $stmtDetails->execute([':po_id' => $po_id]);

        echo json_encode([
            'success' => true,
            'header'  => $header,
            'details' => $stmtDetails->fetchAll()
        ]);
        exit;
    }

    // Stock receiving history
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT
                si.stock_in_id,
                po.purchase_order_number,
                i.item_name,
                sd.quantity,
                sd.unit_cost,
                sd.total_cost,
                s.supplier_name,
                DATE_FORMAT(si.delivery_date, '%b %d, %Y') AS delivery_date,
                DATE_FORMAT(si.stock_in_date, '%b %d, %Y %h:%i %p') AS stock_in_date
            FROM stock_in si
            INNER JOIN stock_in_details sd ON si.stock_in_id = sd.stock_in_id
            INNER JOIN items i ON sd.item_id = i.item_id
            LEFT JOIN purchase_orders po ON si.purchase_order_id = po.purchase_order_id
            LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
            ORDER BY si.stock_in_id DESC
        ");

        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    // Receive stock against a purchase order
    if ($action === 'receive_po' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $po_id         = (int)($_POST['purchase_order_id'] ?? 0);
        $delivery_date = !empty($_POST['delivery_date']) ? $_POST['delivery_date'] : null;
        $items         = $_POST['item_ids'] ?? [];
        $qtys          = $_POST['quantities'] ?? [];
        $user_id       = $_SESSION['user_id'];

        if ($po_id <= 0 || empty($items)) {
            echo json_encode(['success' => false, 'message' => 'Invalid PO or missing items to receive.']);
            exit;
        }

        // Supplier comes from the PO
        $stmtPo = $pdo->prepare("SELECT supplier_id FROM purchase_orders WHERE purchase_order_id = :id");
        $stmtPo->execute([':id' => $po_id]);
        $supplier_id = $stmtPo->fetchColumn();
        if ($supplier_id === false) {
            echo json_encode(['success' => false, 'message' => 'Purchase order not found.']);
            exit;
        }

        // Ordered vs. already received per item
        $stmtLines = $pdo->prepare("
            SELECT pod.item_id, pod.quantity AS ordered, pod.unit_cost,
                   COALESCE((
                       SELECT SUM(sid.quantity)
                       FROM stock_in_details sid
                       INNER JOIN stock_in si ON sid.stock_in_id = si.stock_in_id
                       WHERE si.purchase_order_id = pod.purchase_order_id AND sid.item_id = pod.item_id
                   ), 0) AS received
            FROM purchase_order_details pod
            WHERE pod.purchase_order_id = :po_id
        ");
        $stmtLines->execute([':po_id' => $po_id]);
        $lines = [];
        foreach ($stmtLines->fetchAll() as $l) {
            $lines[(int)$l['item_id']] = $l;
        }

        $toInsert = [];
        for ($i = 0; $i < count($items); $i++) {
            $item_id  = (int)$items[$i];
            $received = (int)($qtys[$i] ?? 0);
            if ($received <= 0) continue;

            if (!isset($lines[$item_id])) {
                echo json_encode(['success' => false, 'message' => 'An item is not part of this purchase order.']);
                exit;
            }
            $remaining = (int)$lines[$item_id]['ordered'] - (int)$lines[$item_id]['received'];
            if ($received > $remaining) {
                echo json_encode(['success' => false, 'message' => 'Receiving quantity is more than the quantity still to be received.']);
                exit;
            }
            $toInsert[] = [$item_id, $received, (float)$lines[$item_id]['unit_cost']];
        }

        if (empty($toInsert)) {
            echo json_encode(['success' => false, 'message' => 'Enter a receiving quantity for at least one item.']);
            exit;
        }

        $pdo->beginTransaction();

        // 1. stock_in header
        $pdo->prepare("
            INSERT INTO stock_in (purchase_order_id, supplier_id, user_id, stock_in_date, delivery_date)
            VALUES (:po_id, :supplier_id, :user_id, NOW(), :delivery_date)
        ")->execute([
            ':po_id'         => $po_id,
            ':supplier_id'   => $supplier_id,
            ':user_id'       => $user_id,
            ':delivery_date' => $delivery_date
        ]);
        $stock_in_id = $pdo->lastInsertId();

        // 2. stock_in_details
        $stmtDetail = $pdo->prepare("
            INSERT INTO stock_in_details (stock_in_id, item_id, quantity, unit_cost, total_cost)
            VALUES (:stock_in_id, :item_id, :quantity, :unit_cost, :total_cost)
        ");
        foreach ($toInsert as [$item_id, $received, $unitCost]) {
            $stmtDetail->execute([
                ':stock_in_id' => $stock_in_id,
                ':item_id'     => $item_id,
                ':quantity'    => $received,
                ':unit_cost'   => $unitCost,
                ':total_cost'  => $unitCost * $received
            ]);
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Stock received successfully!']);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>