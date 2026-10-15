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
    if ($action === 'list') {
        $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY supplier_id DESC");
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
        exit;
    }

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $supplier_name  = trim($_POST['supplier_name'] ?? '');
        $contact_person = trim($_POST['contact_person'] ?? '');
        $contact_number = trim($_POST['contact_number'] ?? '');
        $email          = trim($_POST['email'] ?? '');
        $address        = trim($_POST['address'] ?? '');

        if (empty($supplier_name)) {
            echo json_encode(['success' => false, 'message' => 'Supplier Name is required.']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO suppliers (supplier_name, contact_person, contact_number, email, address)
            VALUES (:supplier_name, :contact_person, :contact_number, :email, :address)
        ");

        $stmt->execute([
            ':supplier_name'  => $supplier_name,
            ':contact_person' => $contact_person,
            ':contact_number' => $contact_number,
            ':email'          => $email,
            ':address'        => $address
        ]);

        echo json_encode(['success' => true, 'message' => 'Supplier added successfully.']);
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $supplier_id    = (int)($_POST['supplier_id'] ?? 0);
        $supplier_name  = trim($_POST['supplier_name'] ?? '');
        $contact_person = trim($_POST['contact_person'] ?? '');
        $contact_number = trim($_POST['contact_number'] ?? '');
        $email          = trim($_POST['email'] ?? '');
        $address        = trim($_POST['address'] ?? '');

        if ($supplier_id <= 0 || empty($supplier_name)) {
            echo json_encode(['success' => false, 'message' => 'Valid Supplier ID and Name are required.']);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE suppliers 
            SET supplier_name  = :supplier_name,
                contact_person = :contact_person,
                contact_number = :contact_number,
                email          = :email,
                address        = :address
            WHERE supplier_id  = :supplier_id
        ");

        $stmt->execute([
            ':supplier_name'  => $supplier_name,
            ':contact_person' => $contact_person,
            ':contact_number' => $contact_number,
            ':email'          => $email,
            ':address'        => $address,
            ':supplier_id'    => $supplier_id
        ]);

        echo json_encode(['success' => true, 'message' => 'Supplier updated successfully.']);
        exit;
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $supplier_id = (int)($_POST['supplier_id'] ?? 0);

        if ($supplier_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid supplier ID.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM suppliers WHERE supplier_id = :supplier_id");
        $stmt->execute([':supplier_id' => $supplier_id]);

        echo json_encode(['success' => true, 'message' => 'Supplier deleted successfully.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>