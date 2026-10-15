<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    // Every PO with total, paid and balance
    if ($action === 'balances') {
        $stmt = $pdo->query("
            SELECT * FROM (
                SELECT po.purchase_order_id, po.purchase_order_number, s.supplier_name,
                    COALESCE((SELECT SUM(d.total_cost) FROM purchase_order_details d WHERE d.purchase_order_id = po.purchase_order_id),0) AS total_amount,
                    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.purchase_order_id = po.purchase_order_id),0) AS paid
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            ) t
            ORDER BY purchase_order_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT p.payment_id, p.payment_date, p.amount, p.payment_method,
                   po.purchase_order_number, s.supplier_name
            FROM payments p
            INNER JOIN purchase_orders po ON p.purchase_order_id = po.purchase_order_id
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            ORDER BY p.payment_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $po_id  = (int)($_POST['purchase_order_id'] ?? 0);
        $date   = $_POST['payment_date'] ?? date('Y-m-d');
        $amount = (float)($_POST['amount'] ?? 0);
        $method = trim($_POST['payment_method'] ?? '');

        if ($po_id <= 0 || $amount <= 0 || $method === '') {
            echo json_encode(['success' => false, 'message' => 'Purchase order, amount and payment method are required.']);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT
              COALESCE((SELECT SUM(total_cost) FROM purchase_order_details WHERE purchase_order_id = :a),0) -
              COALESCE((SELECT SUM(amount) FROM payments WHERE purchase_order_id = :b),0) AS balance
        ");
        $stmt->execute([':a' => $po_id, ':b' => $po_id]);
        $balance = (float)$stmt->fetchColumn();

        if ($amount > $balance + 0.001) {
            echo json_encode(['success' => false, 'message' => 'Amount exceeds the remaining balance of ₱' . number_format($balance, 2) . '.']);
            exit;
        }

        $pdo->prepare("INSERT INTO payments (purchase_order_id, payment_date, amount, payment_method)
                       VALUES (:po, :d, :amt, :m)")
            ->execute([':po' => $po_id, ':d' => $date, ':amt' => $amount, ':m' => $method]);

        echo json_encode(['success' => true, 'message' => 'Payment recorded successfully.']);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $id = (int)($_POST['payment_id'] ?? 0);
        if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'Invalid payment ID.']); exit; }
        $pdo->prepare("DELETE FROM payments WHERE payment_id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Payment deleted.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>