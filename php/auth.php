<?php
/**
 * Access control list.
 * '*'         = tanang actions
 * 'NO_DELETE' = tanang actions gawas sa bisan unsang delete
 * [..]        = listahan sa gitugotan nga actions
 * walay entry = bawal
 */
function acl(): array {
    return [
        'dashboard'         => ['Admin' => '*', 'Manager' => '*', 'Staff' => '*'],

        'product_master'    => ['Admin' => '*', 'Manager' => 'NO_DELETE',
                                'Staff' => ['list', 'get_options']],

        'category'          => ['Admin' => '*', 'Manager' => 'NO_DELETE'],
        'brand'             => ['Admin' => '*', 'Manager' => 'NO_DELETE'],
        'units'             => ['Admin' => '*', 'Manager' => 'NO_DELETE'],
        'shelf'             => ['Admin' => '*', 'Manager' => 'NO_DELETE'],
        'item_supplier'     => ['Admin' => '*', 'Manager' => 'NO_DELETE'],
        'supplier'          => ['Admin' => '*', 'Manager' => 'NO_DELETE'],

        'purchase_orders'   => ['Admin' => '*', 'Manager' => 'NO_DELETE',
                                'Staff' => ['list', 'get_options', 'get_items_by_supplier', 'get_details', 'create']],

        'stock_in'          => ['Admin' => '*', 'Manager' => 'NO_DELETE', 'Staff' => '*'],
        'stock_out'         => ['Admin' => '*', 'Manager' => 'NO_DELETE', 'Staff' => '*'],
        'returns'           => ['Admin' => '*', 'Manager' => 'NO_DELETE', 'Staff' => '*'],

        'purchase_returns'  => ['Admin' => '*', 'Manager' => 'NO_DELETE'],

        'stock_adjustment'  => ['Admin' => '*', 'Manager' => 'NO_DELETE',
                                'Staff' => ['list', 'get_options', 'create']],

        'payments'          => ['Admin' => '*', 'Manager' => 'NO_DELETE'],

        'users'             => ['Admin' => '*'],
    ];
}

// Unsang PHP file ang mo-belong sa unsang module
function module_map(): array {
    return [
        'dashboard_data.php'           => 'dashboard',
        'product_master_process.php'   => 'product_master',
        'category_process.php'         => 'category',
        'brand_process.php'            => 'brand',
        'units_process.php'            => 'units',
        'shelf_process.php'            => 'shelf',
        'item_supplier_process.php'    => 'item_supplier',
        'supplier_process.php'         => 'supplier',
        'purchase_orders_process.php'  => 'purchase_orders',
        'stock_in_process.php'         => 'stock_in',
        'stock_out_process.php'        => 'stock_out',
        'returns_process.php'          => 'returns',
        'purchase_returns_process.php' => 'purchase_returns',
        'stock_adjustment_process.php' => 'stock_adjustment',
        'payments_process.php'         => 'payments',
        'users_process.php'            => 'users',
    ];
}

function authorize(string $module): void {
    $action = $_GET['action'] ?? $_POST['action'] ?? 'list';
    $role   = $_SESSION['role_name'] ?? '';
    $rule   = acl()[$module][$role] ?? [];

    if ($rule === '*') {
        return;
    }

    // Manager: tanang actions gawas sa delete
    if ($rule === 'NO_DELETE' && stripos($action, 'delete') === false) {
        return;
    }

    if (is_array($rule) && in_array($action, $rule, true)) {
        return;
    }

    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Access denied. Your role (' . $role . ') is not allowed to do this.'
    ]);
    exit;
}

function enforce_access(): void {
    $script = basename($_SERVER['SCRIPT_NAME'] ?? '');
    $map    = module_map();

    // login, register, logout, me.php: wala sa listahan, dili gi-check
    if (!isset($map[$script])) return;

    // Kung wala pa naka-login, ang matag process file na ang mo-return og "Unauthorized"
    if (!isset($_SESSION['user_id'])) return;

    authorize($map[$script]);
}