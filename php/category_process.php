<?php
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
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT 
                c.category_id,
                c.category_name,
                c.description,
                COUNT(i.item_id) AS total_items
            FROM category c
            LEFT JOIN items i ON c.category_id = i.category_id AND i.is_deleted = 0
            WHERE c.is_deleted = 0
            GROUP BY c.category_id
            ORDER BY c.category_name ASC
        ");
        
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $category_id = (int)($_POST['category_id'] ?? 0);

        if ($category_id <= 0) {
            $response['message'] = 'Invalid category ID.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE category SET is_deleted = 1 WHERE category_id = :category_id");
        $stmt->execute([':category_id' => $category_id]);

        $response['success'] = true;
        $response['message'] = 'Category deleted successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $category_name = trim($_POST['category_name'] ?? '');
        $description   = trim($_POST['description'] ?? '');

        if (empty($category_name)) {
            $response['message'] = 'Category name is required.';
            echo json_encode($response);
            exit;
        }

        // Check for existing active category name
        $checkStmt = $pdo->prepare("SELECT category_id FROM category WHERE category_name = :name AND is_deleted = 0");
        $checkStmt->execute([':name' => $category_name]);
        if ($checkStmt->fetch()) {
            $response['message'] = 'A category with this name already exists.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO category (category_name, description)
            VALUES (:category_name, :description)
        ");

        $stmt->execute([
            ':category_name' => $category_name,
            ':description'   => $description
        ]);

        $response['success'] = true;
        $response['message'] = 'Category added successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $category_id   = (int)($_POST['category_id'] ?? 0);
        $category_name = trim($_POST['category_name'] ?? '');
        $description   = trim($_POST['description'] ?? '');

        if ($category_id <= 0) {
            $response['message'] = 'Invalid category ID.';
            echo json_encode($response);
            exit;
        }

        if (empty($category_name)) {
            $response['message'] = 'Category name is required.';
            echo json_encode($response);
            exit;
        }

        // Check for existing active category name excluding current category
        $checkStmt = $pdo->prepare("SELECT category_id FROM category WHERE category_name = :name AND is_deleted = 0 AND category_id != :category_id");
        $checkStmt->execute([':name' => $category_name, ':category_id' => $category_id]);
        if ($checkStmt->fetch()) {
            $response['message'] = 'A category with this name already exists.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE category 
            SET category_name = :category_name,
                description = :description 
            WHERE category_id = :category_id
        ");

        $stmt->execute([
            ':category_name' => $category_name,
            ':description'   => $description,
            ':category_id'   => $category_id
        ]);

        $response['success'] = true;
        $response['message'] = 'Category updated successfully.';
        echo json_encode($response);
        exit;
    }
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    echo json_encode($response);
}
?>