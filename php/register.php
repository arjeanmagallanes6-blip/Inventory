<?php
require_once '../php/db.php';

// Fetch roles using PDO
$roles_stmt = $pdo->query("SELECT role_id, role_name FROM role ORDER BY role_id ASC");
$roles = $roles_stmt->fetchAll();
?>

<!-- Inside register.php select element -->
<select name="role_id" id="role_id" class="form-select" required>
    <option value="" disabled selected>-- Select Role --</option>
    <?php foreach ($roles as $role): ?>
        <option value="<?= $role['role_id'] ?>">
            <?= htmlspecialchars($role['role_name']) ?>
        </option>
    <?php endforeach; ?>
</select>