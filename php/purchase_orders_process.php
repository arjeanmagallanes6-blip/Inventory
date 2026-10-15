<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success'      => false,
        'unauthorized' => true,
        'message'      => 'Unauthorized access. Please log in.'
    ]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    if ($action === 'get_options') {
        $suppliers = $pdo->query("SELECT supplier_id, supplier_name FROM suppliers ORDER BY supplier_name ASC")->fetchAll();
        $items     = $pdo->query("SELECT item_id, item_name, unit_price FROM items WHERE is_deleted = 0 ORDER BY item_name ASC")->fetchAll();

        echo json_encode([
            'success'   => true,
            'suppliers' => $suppliers,
            'items'     => $items
        ]);
        exit;
    }

    if ($action === 'get_items_by_supplier') {
        $supplier_id = (int)($_GET['supplier_id'] ?? 0);

        if ($supplier_id <= 0) {
            echo json_encode(['success' => true, 'items' => []]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT DISTINCT i.item_id, i.item_name, i.unit_price 
            FROM items i
            INNER JOIN item_supplier isu ON i.item_id = isu.item_id
            WHERE isu.supplier_id = :supplier_id AND i.is_deleted = 0
            ORDER BY i.item_name ASC
        ");
        $stmt->execute([':supplier_id' => $supplier_id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'items' => $items]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT 
                po.purchase_order_id,
                po.purchase_order_number,
                po.order_date,
                po.expected_delivery_date,
                s.supplier_name,
                COALESCE(SUM(pod.total_cost), 0) AS total_amount,
                COUNT(pod.purchase_order_detail_id) AS total_items
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN purchase_order_details pod ON po.purchase_order_id = pod.purchase_order_id
            GROUP BY po.purchase_order_id
            ORDER BY po.purchase_order_id DESC
        ");

        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'get_details') {
        $po_id = (int)($_GET['po_id'] ?? 0);

        if ($po_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid Purchase Order ID.']);
            exit;
        }

        $stmtHeader = $pdo->prepare("
            SELECT po.*, s.supplier_name, s.contact_person
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.purchase_order_id = :po_id
        ");
        $stmtHeader->execute([':po_id' => $po_id]);
        $header = $stmtHeader->fetch();

        if (!$header) {
            echo json_encode(['success' => false, 'message' => 'Purchase Order not found.']);
            exit;
        }

        $stmtDetails = $pdo->prepare("
            SELECT pod.*, i.item_name
            FROM purchase_order_details pod
            LEFT JOIN items i ON pod.item_id = i.item_id
            WHERE pod.purchase_order_id = :po_id
        ");
        $stmtDetails->execute([':po_id' => $po_id]);
        $details = $stmtDetails->fetchAll();

        echo json_encode([
            'success' => true,
            'header'  => $header,
            'details' => $details
        ]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $supplier_id            = (int)($_POST['supplier_id'] ?? 0);
        $purchase_order_number  = trim($_POST['purchase_order_number'] ?? '');
        $order_date             = $_POST['order_date'] ?? date('Y-m-d');
        $expected_delivery_date = !empty($_POST['expected_delivery_date']) ? $_POST['expected_delivery_date'] : null;

        $items      = $_POST['items'] ?? [];
        $quantities = $_POST['quantities'] ?? [];
        $unit_costs = $_POST['unit_costs'] ?? [];

        if ($supplier_id <= 0 || empty($purchase_order_number) || empty($items)) {
            echo json_encode(['success' => false, 'message' => 'Supplier, PO Number, and at least one item are required.']);
            exit;
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO purchase_orders 
                (supplier_id, purchase_order_number, order_date, expected_delivery_date)
            VALUES 
                (:supplier_id, :purchase_order_number, :order_date, :expected_delivery_date)
        ");

        $stmt->execute([
            ':supplier_id'            => $supplier_id,
            ':purchase_order_number'  => $purchase_order_number,
            ':order_date'             => $order_date,
            ':expected_delivery_date' => $expected_delivery_date
        ]);

        $po_id = $pdo->lastInsertId();

        $stmtDetail = $pdo->prepare("
            INSERT INTO purchase_order_details 
                (purchase_order_id, item_id, quantity, unit_cost, total_cost)
            VALUES 
                (:purchase_order_id, :item_id, :quantity, :unit_cost, :total_cost)
        ");

        for ($i = 0; $i < count($items); $i++) {
            $item_id   = (int)$items[$i];
            $qty       = (int)($quantities[$i] ?? 0);
            $cost      = (float)($unit_costs[$i] ?? 0.00);
            $total_cost = $qty * $cost;

            if ($item_id > 0 && $qty > 0) {
                $stmtDetail->execute([
                    ':purchase_order_id' => $po_id,
                    ':item_id'           => $item_id,
                    ':quantity'          => $qty,
                    ':unit_cost'         => $cost,
                    ':total_cost'        => $total_cost
                ]);
            }
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Purchase Order created successfully.']);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $po_id = (int)($_POST['purchase_order_id'] ?? 0);

        if ($po_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid Purchase Order ID.']);
            exit;
        }

        $pdo->beginTransaction();

        $stmt1 = $pdo->prepare("DELETE FROM purchase_order_details WHERE purchase_order_id = :po_id");
        $stmt1->execute([':po_id' => $po_id]);

        $stmt2 = $pdo->prepare("DELETE FROM purchase_orders WHERE purchase_order_id = :po_id");
        $stmt2->execute([':po_id' => $po_id]);

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Purchase Order deleted successfully.']);
        exit;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>