<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        $response['message'] = 'Please enter both username and password.';
        echo json_encode($response);
        exit;
    }

    try {
        // Fetch user details and role name
        $stmt = $pdo->prepare("
            SELECT u.user_id, u.first_name, u.last_name, u.username, u.password, u.status, r.role_name 
            FROM users u
            INNER JOIN role r ON u.role_id = r.role_id
            WHERE u.username = :username
        ");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if ($user) {
            if ($user['status'] !== 'Active') {
                $response['message'] = 'Account is inactive. Please contact an admin.';
            } elseif (password_verify($password, $user['password'])) {
                // Set session variables upon successful login
                $_SESSION['user_id']   = $user['user_id'];
                $_SESSION['username']  = $user['username'];
                $_SESSION['full_name'] = $user['first_name'] . ' ' . $user['last_name'];
                $_SESSION['role_name'] = $user['role_name'];

                $response['success'] = true;
                $response['message'] = 'Login successful! Redirecting...';
            } else {
                $response['message'] = 'Invalid username or password.';
            }
        } else {
            $response['message'] = 'Invalid username or password.';
        }
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }

            $stmt = $pdo->prepare("
            SELECT u.user_id, u.first_name, u.last_name, u.username, u.password, u.status, r.role_name
            FROM users u
            INNER JOIN role r ON u.role_id = r.role_id
            WHERE u.username = :username AND u.is_deleted = 0
        ");
}

echo json_encode($response);
?>