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
                u.unit_id,
                u.unit_name,
                COUNT(i.item_id) AS total_items
            FROM units u
            LEFT JOIN items i ON u.unit_id = i.unit_id AND i.is_deleted = 0
            WHERE u.is_deleted = 0
            GROUP BY u.unit_id
            ORDER BY u.unit_name ASC
        ");
        
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $unit_id = (int)($_POST['unit_id'] ?? 0);

        if ($unit_id <= 0) {
            $response['message'] = 'Invalid unit ID.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE units SET is_deleted = 1 WHERE unit_id = :unit_id");
        $stmt->execute([':unit_id' => $unit_id]);

        $response['success'] = true;
        $response['message'] = 'Unit deleted successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $unit_name = trim($_POST['unit_name'] ?? '');

        if (empty($unit_name)) {
            $response['message'] = 'Unit name is required.';
            echo json_encode($response);
            exit;
        }

        // Check for existing active unit name
        $checkStmt = $pdo->prepare("SELECT unit_id FROM units WHERE unit_name = :name AND is_deleted = 0");
        $checkStmt->execute([':name' => $unit_name]);
        if ($checkStmt->fetch()) {
            $response['message'] = 'A unit with this name already exists.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO units (unit_name)
            VALUES (:unit_name)
        ");

        $stmt->execute([':unit_name' => $unit_name]);

        $response['success'] = true;
        $response['message'] = 'Measurement unit added successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $unit_id   = (int)($_POST['unit_id'] ?? 0);
        $unit_name = trim($_POST['unit_name'] ?? '');

        if ($unit_id <= 0) {
            $response['message'] = 'Invalid unit ID.';
            echo json_encode($response);
            exit;
        }

        if (empty($unit_name)) {
            $response['message'] = 'Unit name is required.';
            echo json_encode($response);
            exit;
        }

        // Check for existing active unit name excluding current unit
        $checkStmt = $pdo->prepare("SELECT unit_id FROM units WHERE unit_name = :name AND is_deleted = 0 AND unit_id != :unit_id");
        $checkStmt->execute([':name' => $unit_name, ':unit_id' => $unit_id]);
        if ($checkStmt->fetch()) {
            $response['message'] = 'A unit with this name already exists.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE units 
            SET unit_name = :unit_name 
            WHERE unit_id = :unit_id
        ");

        $stmt->execute([
            ':unit_name' => $unit_name,
            ':unit_id'   => $unit_id
        ]);

        $response['success'] = true;
        $response['message'] = 'Unit updated successfully.';
        echo json_encode($response);
        exit;
    }
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    echo json_encode($response);
}
?>