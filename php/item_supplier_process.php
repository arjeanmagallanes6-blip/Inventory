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
        $items     = $pdo->query("SELECT item_id, item_name FROM items WHERE is_deleted = 0 ORDER BY item_name ASC")->fetchAll();
        $suppliers = $pdo->query("SELECT supplier_id, supplier_name FROM suppliers ORDER BY supplier_name ASC")->fetchAll();

        echo json_encode([
            'success'   => true,
            'items'     => $items,
            'suppliers' => $suppliers
        ]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT 
                isu.item_supplier_id,
                isu.item_id,
                isu.supplier_id,
                i.item_name,
                s.supplier_name,
                s.contact_person
            FROM item_supplier isu
            INNER JOIN items i ON isu.item_id = i.item_id
            INNER JOIN suppliers s ON isu.supplier_id = s.supplier_id
            WHERE i.is_deleted = 0
            ORDER BY isu.item_supplier_id DESC
        ");
        
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_id     = (int)($_POST['item_id'] ?? 0);
        $supplier_id = (int)($_POST['supplier_id'] ?? 0);

        if ($item_id <= 0 || $supplier_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Please select both a product and a supplier.']);
            exit;
        }

        // Check for duplicate relation entry in item_supplier
        $check = $pdo->prepare("SELECT item_supplier_id FROM item_supplier WHERE item_id = :item_id AND supplier_id = :supplier_id");
        $check->execute([':item_id' => $item_id, ':supplier_id' => $supplier_id]);
        if ($check->fetch()) {
            echo json_encode(['success' => false, 'message' => 'This item is already linked to the selected supplier.']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO item_supplier (item_id, supplier_id) VALUES (:item_id, :supplier_id)");
        $stmt->execute([':item_id' => $item_id, ':supplier_id' => $supplier_id]);

        echo json_encode(['success' => true, 'message' => 'Junction record created successfully.']);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_supplier_id = (int)($_POST['item_supplier_id'] ?? 0);

        if ($item_supplier_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid relationship ID.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM item_supplier WHERE item_supplier_id = :item_supplier_id");
        $stmt->execute([':item_supplier_id' => $item_supplier_id]);

        echo json_encode(['success' => true, 'message' => 'Junction record removed successfully.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>