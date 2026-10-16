<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $first_name = trim($_POST['first_name'] ?? '');
    $last_name  = trim($_POST['last_name'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $username   = trim($_POST['username'] ?? '');
    $password   = $_POST['password'] ?? '';
    $status     = 'Active';

    if (empty($first_name) || empty($last_name) || empty($email) || empty($username) || empty($password)) {
        $response['message'] = 'All fields are required.';
        echo json_encode($response);
        exit;
    }

    if (strlen($password) < 6) {
        $response['message'] = 'Password must be at least 6 characters.';
        echo json_encode($response);
        exit;
    }

    try {
        // Public registration = Staff ra
        $roleStmt = $pdo->query("SELECT role_id FROM role WHERE role_name = 'Staff' AND is_deleted = 0 LIMIT 1");
        $role_id  = (int)$roleStmt->fetchColumn();

        if ($role_id <= 0) {
            $response['message'] = 'Staff role is not configured. Please contact an admin.';
            echo json_encode($response);
            exit;
        }

        $check_stmt = $pdo->prepare("SELECT user_id FROM users WHERE username = :username OR email = :email");
        $check_stmt->execute([
            ':username' => $username,
            ':email'    => $email
        ]);

        if ($check_stmt->fetch()) {
            $response['message'] = 'Username or Email is already registered.';
            echo json_encode($response);
            exit;
        }

        $hashed_password = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("
            INSERT INTO users (role_id, first_name, last_name, username, password, email, status)
            VALUES (:role_id, :first_name, :last_name, :username, :password, :email, :status)
        ");

        $executed = $stmt->execute([
            ':role_id'    => $role_id,
            ':first_name' => $first_name,
            ':last_name'  => $last_name,
            ':username'   => $username,
            ':password'   => $hashed_password,
            ':email'      => $email,
            ':status'     => $status
        ]);

        if ($executed) {
            $response['success'] = true;
            $response['message'] = 'Account created successfully! Redirecting...';
        }
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>