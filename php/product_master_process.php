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
        $categories = $pdo->query("SELECT category_id, category_name FROM category WHERE is_deleted = 0 ORDER BY category_name ASC")->fetchAll();
        $brands     = $pdo->query("SELECT brand_id, brand_name FROM brand WHERE is_deleted = 0 ORDER BY brand_name ASC")->fetchAll();
        $units      = $pdo->query("SELECT unit_id, unit_name FROM units WHERE is_deleted = 0 ORDER BY unit_name ASC")->fetchAll();
        $shelves    = $pdo->query("SELECT shelf_id, shelf_name FROM shelf ORDER BY shelf_name ASC")->fetchAll();
        $suppliers  = $pdo->query("SELECT supplier_id, supplier_name FROM suppliers ORDER BY supplier_name ASC")->fetchAll();

        echo json_encode([
            'success'    => true,
            'categories' => $categories,
            'brands'     => $brands,
            'units'      => $units,
            'shelves'    => $shelves,
            'suppliers'  => $suppliers
        ]);
        exit;
    }

    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT 
                i.item_id,
                i.item_name,
                i.description,
                i.unit_price,
                i.selling_price,
                i.minimum_stock,
                i.reorder_level,
                i.maximum_stock,
                i.category_id,
                i.brand_id,
                i.unit_id,
                i.shelf_id,
                c.category_name,
                b.brand_name,
                u.unit_name,
                s.shelf_name,
                GROUP_CONCAT(sup.supplier_name SEPARATOR ', ') AS supplier_names,
                GROUP_CONCAT(sup.supplier_id) AS supplier_ids
            FROM items i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN brand b ON i.brand_id = b.brand_id
            LEFT JOIN units u ON i.unit_id = u.unit_id
            LEFT JOIN shelf s ON i.shelf_id = s.shelf_id
            LEFT JOIN item_supplier isu ON i.item_id = isu.item_id
            LEFT JOIN suppliers sup ON isu.supplier_id = sup.supplier_id
            WHERE i.is_deleted = 0
            GROUP BY i.item_id
            ORDER BY i.item_id DESC
        ");
        
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $category_id   = (int)($_POST['category_id'] ?? 0);
        $brand_id      = !empty($_POST['brand_id']) ? (int)$_POST['brand_id'] : null;
        $unit_id       = (int)($_POST['unit_id'] ?? 0);
        $shelf_id      = !empty($_POST['shelf_id']) ? (int)$_POST['shelf_id'] : null;
        $item_name     = trim($_POST['item_name'] ?? '');
        $description   = trim($_POST['description'] ?? '');
        $unit_price    = (float)($_POST['unit_price'] ?? 0.00);
        $selling_price = (float)($_POST['selling_price'] ?? 0.00);
        $minimum_stock = (int)($_POST['minimum_stock'] ?? 0);
        $maximum_stock = (int)($_POST['maximum_stock'] ?? 0);
        $supplier_ids  = $_POST['supplier_ids'] ?? [];

        if (empty($item_name) || empty($category_id) || empty($unit_id)) {
            echo json_encode(['success' => false, 'message' => 'Item name, category, and unit are required.']);
            exit;
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO items 
                (category_id, brand_id, unit_id, shelf_id, item_name, description, selling_price, unit_price, minimum_stock, maximum_stock)
            VALUES 
                (:category_id, :brand_id, :unit_id, :shelf_id, :item_name, :description, :selling_price, :unit_price, :minimum_stock, :maximum_stock)
        ");

        $stmt->execute([
            ':category_id'   => $category_id,
            ':brand_id'      => $brand_id,
            ':unit_id'       => $unit_id,
            ':shelf_id'      => $shelf_id,
            ':item_name'     => $item_name,
            ':description'   => $description,
            ':selling_price' => $selling_price,
            ':unit_price'    => $unit_price,
            ':minimum_stock' => $minimum_stock,
            ':maximum_stock' => $maximum_stock
        ]);

        $item_id = $pdo->lastInsertId();

        // Save records in item_supplier junction table
        if (!empty($supplier_ids) && is_array($supplier_ids)) {
            $stmtSup = $pdo->prepare("INSERT INTO item_supplier (item_id, supplier_id) VALUES (:item_id, :supplier_id)");
            foreach ($supplier_ids as $sup_id) {
                if (!empty($sup_id)) {
                    $stmtSup->execute([
                        ':item_id'     => $item_id,
                        ':supplier_id' => (int)$sup_id
                    ]);
                }
            }
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Product successfully added.']);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_id       = (int)($_POST['item_id'] ?? 0);
        $category_id   = (int)($_POST['category_id'] ?? 0);
        $brand_id      = !empty($_POST['brand_id']) ? (int)$_POST['brand_id'] : null;
        $unit_id       = (int)($_POST['unit_id'] ?? 0);
        $shelf_id      = !empty($_POST['shelf_id']) ? (int)$_POST['shelf_id'] : null;
        $item_name     = trim($_POST['item_name'] ?? '');
        $description   = trim($_POST['description'] ?? '');
        $unit_price    = (float)($_POST['unit_price'] ?? 0.00);
        $selling_price = (float)($_POST['selling_price'] ?? 0.00);
        $minimum_stock = (int)($_POST['minimum_stock'] ?? 0);
        $maximum_stock = (int)($_POST['maximum_stock'] ?? 0);
        
        // Normalize supplier_ids input into a clean array
        $raw_suppliers = $_POST['supplier_ids'] ?? [];
        if (!is_array($raw_suppliers)) {
            $supplier_ids = !empty($raw_suppliers) ? explode(',', $raw_suppliers) : [];
        } else {
            $supplier_ids = $raw_suppliers;
        }

        if ($item_id <= 0 || empty($item_name) || empty($category_id) || empty($unit_id)) {
            echo json_encode(['success' => false, 'message' => 'Valid Product ID, Name, Category, and Unit are required.']);
            exit;
        }

        $pdo->beginTransaction();

        // 1. Update items table
        $stmt = $pdo->prepare("
            UPDATE items 
            SET category_id   = :category_id,
                brand_id      = :brand_id,
                unit_id       = :unit_id,
                shelf_id      = :shelf_id,
                item_name     = :item_name,
                description   = :description,
                selling_price = :selling_price,
                unit_price    = :unit_price,
                minimum_stock = :minimum_stock,
                maximum_stock = :maximum_stock
            WHERE item_id = :item_id AND is_deleted = 0
        ");

        $stmt->execute([
            ':category_id'   => $category_id,
            ':brand_id'      => $brand_id,
            ':unit_id'       => $unit_id,
            ':shelf_id'      => $shelf_id,
            ':item_name'     => $item_name,
            ':description'   => $description,
            ':selling_price' => $selling_price,
            ':unit_price'    => $unit_price,
            ':minimum_stock' => $minimum_stock,
            ':maximum_stock' => $maximum_stock,
            ':item_id'       => $item_id
        ]);

        // 2. Smart Sync: Fetch existing suppliers to preserve unchanged item_supplier IDs
        $stmtExisting = $pdo->prepare("SELECT supplier_id FROM item_supplier WHERE item_id = :item_id");
        $stmtExisting->execute([':item_id' => $item_id]);
        $existing_suppliers = array_map('intval', $stmtExisting->fetchAll(PDO::FETCH_COLUMN));

        $new_suppliers = array_values(array_filter(array_map('intval', $supplier_ids)));

        $to_remove = array_diff($existing_suppliers, $new_suppliers);
        $to_add    = array_diff($new_suppliers, $existing_suppliers);

        // Remove unselected relationships
        if (!empty($to_remove)) {
            $placeholders = implode(',', array_fill(0, count($to_remove), '?'));
            $stmtDel = $pdo->prepare("DELETE FROM item_supplier WHERE item_id = ? AND supplier_id IN ($placeholders)");
            $stmtDel->execute(array_merge([$item_id], array_values($to_remove)));
        }

        // Add newly selected relationships
        if (!empty($to_add)) {
            $stmtIns = $pdo->prepare("INSERT INTO item_supplier (item_id, supplier_id) VALUES (:item_id, :supplier_id)");
            foreach ($to_add as $sup_id) {
                $stmtIns->execute([
                    ':item_id'     => $item_id,
                    ':supplier_id' => $sup_id
                ]);
            }
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Product updated successfully.']);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $item_id = (int)($_POST['item_id'] ?? 0);

        if ($item_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid product ID.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE items SET is_deleted = 1 WHERE item_id = :item_id");
        $stmt->execute([':item_id' => $item_id]);

        echo json_encode(['success' => true, 'message' => 'Product deleted successfully.']);
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