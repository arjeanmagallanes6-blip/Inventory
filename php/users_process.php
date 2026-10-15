<?php
// User + Role management (users, role tables). Admin only.
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}
if (($_SESSION['role_name'] ?? '') !== 'Admin') {
    echo json_encode(['success' => false, 'message' => 'Only an Admin can manage users and roles.']);
    exit;
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';

try {
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT u.user_id, u.first_name, u.last_name, u.username, u.email, u.status, u.role_id, r.role_name
            FROM users u INNER JOIN role r ON u.role_id = r.role_id
            WHERE u.is_deleted = 0 ORDER BY u.user_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(), 'current_user_id' => (int)$_SESSION['user_id']]);
        exit;
    }

    if ($action === 'roles_list') {
        $stmt = $pdo->query("
            SELECT r.role_id, r.role_name,
                   (SELECT COUNT(*) FROM users u WHERE u.role_id = r.role_id AND u.is_deleted = 0) AS total_users
            FROM role r WHERE r.is_deleted = 0 ORDER BY r.role_id ASC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create' && $isPost) {
        $first = trim($_POST['first_name'] ?? ''); $last = trim($_POST['last_name'] ?? '');
        $email = trim($_POST['email'] ?? '');      $uname = trim($_POST['username'] ?? '');
        $role  = (int)($_POST['role_id'] ?? 0);    $pass = $_POST['password'] ?? '';
        $status = ($_POST['status'] ?? 'Active') === 'Inactive' ? 'Inactive' : 'Active';

        if ($first === '' || $last === '' || $email === '' || $uname === '' || $role <= 0 || strlen($pass) < 6) {
            echo json_encode(['success' => false, 'message' => 'All fields are required (password min. 6 characters).']);
            exit;
        }
        $chk = $pdo->prepare("SELECT user_id FROM users WHERE username = :u OR email = :e");
        $chk->execute([':u' => $uname, ':e' => $email]);
        if ($chk->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Username or email is already registered.']);
            exit;
        }
        $pdo->prepare("INSERT INTO users (role_id, first_name, last_name, username, password, email, status)
                       VALUES (:r, :f, :l, :u, :p, :e, :s)")
            ->execute([':r' => $role, ':f' => $first, ':l' => $last, ':u' => $uname,
                       ':p' => password_hash($pass, PASSWORD_BCRYPT), ':e' => $email, ':s' => $status]);
        echo json_encode(['success' => true, 'message' => 'User created successfully.']);
        exit;
    }

    if ($action === 'update' && $isPost) {
        $id    = (int)($_POST['user_id'] ?? 0);
        $first = trim($_POST['first_name'] ?? ''); $last = trim($_POST['last_name'] ?? '');
        $email = trim($_POST['email'] ?? '');      $uname = trim($_POST['username'] ?? '');
        $role  = (int)($_POST['role_id'] ?? 0);    $pass = $_POST['password'] ?? '';
        $status = ($_POST['status'] ?? 'Active') === 'Inactive' ? 'Inactive' : 'Active';

        if ($id <= 0 || $first === '' || $last === '' || $email === '' || $uname === '' || $role <= 0) {
            echo json_encode(['success' => false, 'message' => 'Please complete all required fields.']);
            exit;
        }
        if ($id === (int)$_SESSION['user_id'] && $status === 'Inactive') {
            echo json_encode(['success' => false, 'message' => 'You cannot deactivate your own account.']);
            exit;
        }
        $chk = $pdo->prepare("SELECT user_id FROM users WHERE (username = :u OR email = :e) AND user_id != :id");
        $chk->execute([':u' => $uname, ':e' => $email, ':id' => $id]);
        if ($chk->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Username or email is already used by another user.']);
            exit;
        }

        $sql = "UPDATE users SET role_id=:r, first_name=:f, last_name=:l, username=:u, email=:e, status=:s";
        $params = [':r' => $role, ':f' => $first, ':l' => $last, ':u' => $uname, ':e' => $email, ':s' => $status, ':id' => $id];
        if ($pass !== '') {
            if (strlen($pass) < 6) { echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']); exit; }
            $sql .= ", password=:p";
            $params[':p'] = password_hash($pass, PASSWORD_BCRYPT);
        }
        $pdo->prepare($sql . " WHERE user_id=:id")->execute($params);
        echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
        exit;
    }

    if ($action === 'delete' && $isPost) {
        $id = (int)($_POST['user_id'] ?? 0);
        if ($id <= 0 || $id === (int)$_SESSION['user_id']) {
            echo json_encode(['success' => false, 'message' => 'You cannot delete your own account.']);
            exit;
        }
        $pdo->prepare("UPDATE users SET is_deleted = 1 WHERE user_id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'User deleted.']);
        exit;
    }

    if ($action === 'role_create' && $isPost) {
        $name = trim($_POST['role_name'] ?? '');
        if ($name === '') { echo json_encode(['success' => false, 'message' => 'Role name is required.']); exit; }
        $chk = $pdo->prepare("SELECT role_id FROM role WHERE role_name = :n AND is_deleted = 0");
        $chk->execute([':n' => $name]);
        if ($chk->fetch()) { echo json_encode(['success' => false, 'message' => 'Role already exists.']); exit; }
        $pdo->prepare("INSERT INTO role (role_name) VALUES (:n)")->execute([':n' => $name]);
        echo json_encode(['success' => true, 'message' => 'Role added.']);
        exit;
    }

    if ($action === 'role_delete' && $isPost) {
        $id = (int)($_POST['role_id'] ?? 0);
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role_id = :id AND is_deleted = 0");
        $cnt->execute([':id' => $id]);
        if ((int)$cnt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete a role that still has users.']);
            exit;
        }
        $pdo->prepare("UPDATE role SET is_deleted = 1 WHERE role_id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Role deleted.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>