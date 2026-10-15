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
            SELECT b.brand_id, b.brand_name, COUNT(i.item_id) AS total_items
            FROM brand b
            LEFT JOIN items i ON b.brand_id = i.brand_id AND i.is_deleted = 0
            WHERE b.is_deleted = 0
            GROUP BY b.brand_id
            ORDER BY b.brand_name ASC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $brand_id = (int)($_POST['brand_id'] ?? 0);
        if ($brand_id <= 0) {
            $response['message'] = 'Invalid brand ID.';
            echo json_encode($response);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE brand SET is_deleted = 1 WHERE brand_id = :id");
        $stmt->execute([':id' => $brand_id]);
        echo json_encode(['success' => true, 'message' => 'Brand deleted successfully.']);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $brand_name = trim($_POST['brand_name'] ?? '');
        if ($brand_name === '') {
            $response['message'] = 'Brand name is required.';
            echo json_encode($response);
            exit;
        }
        $check = $pdo->prepare("SELECT brand_id FROM brand WHERE brand_name = :n AND is_deleted = 0");
        $check->execute([':n' => $brand_name]);
        if ($check->fetch()) {
            $response['message'] = 'A brand with this name already exists.';
            echo json_encode($response);
            exit;
        }
        $stmt = $pdo->prepare("INSERT INTO brand (brand_name) VALUES (:n)");
        $stmt->execute([':n' => $brand_name]);
        echo json_encode(['success' => true, 'message' => 'Brand added successfully.']);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $brand_id   = (int)($_POST['brand_id'] ?? 0);
        $brand_name = trim($_POST['brand_name'] ?? '');
        if ($brand_id <= 0 || $brand_name === '') {
            $response['message'] = 'Valid brand ID and name are required.';
            echo json_encode($response);
            exit;
        }
        $check = $pdo->prepare("SELECT brand_id FROM brand WHERE brand_name = :n AND is_deleted = 0 AND brand_id != :id");
        $check->execute([':n' => $brand_name, ':id' => $brand_id]);
        if ($check->fetch()) {
            $response['message'] = 'A brand with this name already exists.';
            echo json_encode($response);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE brand SET brand_name = :n WHERE brand_id = :id");
        $stmt->execute([':n' => $brand_name, ':id' => $brand_id]);
        echo json_encode(['success' => true, 'message' => 'Brand updated successfully.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>