<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

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
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT shelf_id, shelf_code, shelf_name 
            FROM shelf 
            ORDER BY shelf_id DESC
        ");
        
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $shelf_code = trim($_POST['shelf_code'] ?? '');
        $shelf_name = trim($_POST['shelf_name'] ?? '');

        if (empty($shelf_code) || empty($shelf_name)) {
            $response['message'] = 'Both Shelf Code and Shelf Name are required.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO shelf (shelf_code, shelf_name) 
            VALUES (:shelf_code, :shelf_name)
        ");
        $stmt->execute([
            ':shelf_code' => $shelf_code,
            ':shelf_name' => $shelf_name
        ]);

        $response['success'] = true;
        $response['message'] = 'Shelf created successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $shelf_id   = (int)($_POST['shelf_id'] ?? 0);
        $shelf_code = trim($_POST['shelf_code'] ?? '');
        $shelf_name = trim($_POST['shelf_name'] ?? '');

        if ($shelf_id <= 0 || empty($shelf_code) || empty($shelf_name)) {
            $response['message'] = 'Valid Shelf ID, Code, and Name are required.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE shelf 
            SET shelf_code = :shelf_code, 
                shelf_name = :shelf_name 
            WHERE shelf_id = :shelf_id
        ");
        $stmt->execute([
            ':shelf_code' => $shelf_code,
            ':shelf_name' => $shelf_name,
            ':shelf_id'   => $shelf_id
        ]);

        $response['success'] = true;
        $response['message'] = 'Shelf updated successfully.';
        echo json_encode($response);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $shelf_id = (int)($_POST['shelf_id'] ?? 0);

        if ($shelf_id <= 0) {
            $response['message'] = 'Invalid shelf ID.';
            echo json_encode($response);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM shelf WHERE shelf_id = :shelf_id");
        $stmt->execute([':shelf_id' => $shelf_id]);

        $response['success'] = true;
        $response['message'] = 'Shelf deleted successfully.';
        echo json_encode($response);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>