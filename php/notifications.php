<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/stock_helper.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => 'Unauthorized access.']);
    exit;
}

$role  = $_SESSION['role_name'] ?? '';
$notes = [];

// Pila ka adlaw sa unahan ang i-notify para sa mo-abot nga order
const ARRIVAL_WINDOW_DAYS = 3;

// Payment terms: pila ka adlaw human sa receiving (o expected delivery / order date) ang due sa bayronon
const PAYMENT_TERM_DAYS = 7;

// Pila ka adlaw sa unahan ang i-notify para sa due nga payment
const PAYMENT_WINDOW_DAYS = 3;

// I-set sa true kung gusto nimo nga mogawas pud ang low stock sa notifications
const INCLUDE_LOW_STOCK = false;

try {
    // ------------------------------------------------------------
    // 1. COMING ORDERS (tanang role): purchase orders nga wala pa hingpit na-receive
    //    - overdue: lapas na sa expected delivery date
    //    - incoming: mo-abot karon / ugma / sulod sa ARRIVAL_WINDOW_DAYS
    //    - pending_po: wala pay expected date o mas layo pa
    // ------------------------------------------------------------
    $stmt = $pdo->query("
        SELECT * FROM (
            SELECT
                po.purchase_order_id,
                po.purchase_order_number,
                po.expected_delivery_date,
                s.supplier_name,
                COALESCE(SUM(pod.quantity), 0) AS ordered_qty,
                COALESCE((
                    SELECT SUM(sid.quantity)
                    FROM stock_in_details sid
                    INNER JOIN stock_in si ON sid.stock_in_id = si.stock_in_id
                    WHERE si.purchase_order_id = po.purchase_order_id
                ), 0) AS received_qty,
                DATEDIFF(po.expected_delivery_date, CURDATE()) AS days_left
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN purchase_order_details pod ON po.purchase_order_id = pod.purchase_order_id
            GROUP BY po.purchase_order_id
        ) t
        WHERE ordered_qty > received_qty
        ORDER BY (expected_delivery_date IS NULL) ASC, expected_delivery_date ASC, purchase_order_id DESC
    ");
    $pendingPos = $stmt->fetchAll();

    $overdue  = [];
    $incoming = [];
    $pending  = [];

    foreach ($pendingPos as $r) {
        $received = (int)$r['received_qty'];
        $ordered  = (int)$r['ordered_qty'];
        $supplier = $r['supplier_name'] ?? 'N/A';
        $progress = $received . ' / ' . $ordered . ' received';
        $poNo     = $r['purchase_order_number'];

        if ($r['expected_delivery_date'] !== null && $r['days_left'] !== null) {
            $days    = (int)$r['days_left'];
            $dateFmt = date('M d, Y', strtotime($r['expected_delivery_date']));

            if ($days < 0) {
                $late = abs($days);
                $overdue[] = [
                    'id'      => 'late-' . $r['purchase_order_id'] . '-' . $received . '-' . $days,
                    'type'    => 'overdue',
                    'title'   => $poNo . ' is overdue by ' . $late . ($late === 1 ? ' day' : ' days'),
                    'message' => $supplier . ' - expected ' . $dateFmt . ' - ' . $progress,
                    'link'    => 'stock_in.html'
                ];
                continue;
            }

            if ($days <= ARRIVAL_WINDOW_DAYS) {
                if ($days === 0)      $when = 'arrives today';
                elseif ($days === 1)  $when = 'arrives tomorrow';
                else                  $when = 'arrives in ' . $days . ' days';

                $incoming[] = [
                    'id'      => 'in-' . $r['purchase_order_id'] . '-' . $received . '-' . $days,
                    'type'    => 'incoming',
                    'title'   => $poNo . ' ' . $when,
                    'message' => $supplier . ' - expected ' . $dateFmt . ' - ' . $progress,
                    'link'    => 'stock_in.html'
                ];
                continue;
            }

            // Naay expected date pero layo pa
            $pending[] = [
                'id'      => 'po-' . $r['purchase_order_id'] . '-' . $received,
                'type'    => 'pending_po',
                'title'   => $poNo . ' is on its way',
                'message' => $supplier . ' - expected ' . $dateFmt . ' - ' . $progress,
                'link'    => 'stock_in.html'
            ];
            continue;
        }

        // Wala pay expected delivery date
        $pending[] = [
            'id'      => 'po-' . $r['purchase_order_id'] . '-' . $received,
            'type'    => 'pending_po',
            'title'   => $poNo . ' is waiting to be received',
            'message' => $supplier . ' - no expected date - ' . $progress,
            'link'    => 'stock_in.html'
        ];
    }

    // Pinaka-importante una: overdue, dayon incoming, dayon pending
    $notes = array_merge(
        array_slice($overdue, 0, 10),
        array_slice($incoming, 0, 10),
        array_slice($pending, 0, 10)
    );

    // ------------------------------------------------------------
    // 2. COMING PAYMENTS (Admin ug Manager ra)
    //    due date = (unang receiving date, o expected delivery, o order date) + PAYMENT_TERM_DAYS
    //    - overdue: lapas na sa due date
    //    - due: due karon / ugma / sulod sa PAYMENT_WINDOW_DAYS
    //    - unpaid: naay balance pero layo pa ang due date
    // ------------------------------------------------------------
    if ($role === 'Admin' || $role === 'Manager') {
        $stmt = $pdo->query("
            SELECT * FROM (
                SELECT
                    po.purchase_order_id,
                    po.purchase_order_number,
                    s.supplier_name,
                    COALESCE((SELECT SUM(d.total_cost) FROM purchase_order_details d WHERE d.purchase_order_id = po.purchase_order_id), 0) AS total_amount,
                    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.purchase_order_id = po.purchase_order_id), 0) AS paid,
                    DATE(COALESCE(
                        (SELECT MIN(si.stock_in_date) FROM stock_in si WHERE si.purchase_order_id = po.purchase_order_id),
                        po.expected_delivery_date,
                        po.order_date
                    )) AS base_date
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            ) t
            WHERE total_amount - paid > 0.001
            ORDER BY base_date ASC, purchase_order_id ASC
        ");

        $today = new DateTime('today');

        $payOverdue = [];
        $payDue     = [];
        $payUnpaid  = [];

        foreach ($stmt->fetchAll() as $r) {
            $total   = (float)$r['total_amount'];
            $paid    = (float)$r['paid'];
            $balance = $total - $paid;
            $poNo    = $r['purchase_order_number'];
            $sup     = $r['supplier_name'] ?? 'N/A';
            $paidKey = number_format($paid, 2, '.', '');

            $dueDate = new DateTime($r['base_date']);
            $dueDate->modify('+' . PAYMENT_TERM_DAYS . ' days');
            $days    = (int)$today->diff($dueDate)->format('%r%a');   // negatibo = lapas na
            $dueFmt  = $dueDate->format('M d, Y');

            $balanceTxt = 'balance P' . number_format($balance, 2) . ($paid > 0 ? ' (partially paid)' : '');

            if ($days < 0) {
                $late = abs($days);
                $payOverdue[] = [
                    'id'      => 'payod-' . $r['purchase_order_id'] . '-' . $paidKey . '-' . $days,
                    'type'    => 'overdue',
                    'title'   => $poNo . ' payment is overdue by ' . $late . ($late === 1 ? ' day' : ' days'),
                    'message' => $sup . ' - due ' . $dueFmt . ' - ' . $balanceTxt,
                    'link'    => 'payments.html'
                ];
            } elseif ($days <= PAYMENT_WINDOW_DAYS) {
                if ($days === 0)     $when = 'payment is due today';
                elseif ($days === 1) $when = 'payment is due tomorrow';
                else                 $when = 'payment is due in ' . $days . ' days';

                $payDue[] = [
                    'id'      => 'paydue-' . $r['purchase_order_id'] . '-' . $paidKey . '-' . $days,
                    'type'    => 'unpaid',
                    'title'   => $poNo . ' ' . $when,
                    'message' => $sup . ' - due ' . $dueFmt . ' - ' . $balanceTxt,
                    'link'    => 'payments.html'
                ];
            } else {
                $payUnpaid[] = [
                    'id'      => 'pay-' . $r['purchase_order_id'] . '-' . $paidKey,
                    'type'    => 'unpaid',
                    'title'   => $poNo . ($paid > 0 ? ' is partially paid' : ' has an upcoming payment'),
                    'message' => $sup . ' - due ' . $dueFmt . ' - ' . $balanceTxt,
                    'link'    => 'payments.html'
                ];
            }
        }

        $notes = array_merge(
            $notes,
            array_slice($payOverdue, 0, 10),
            array_slice($payDue, 0, 10),
            array_slice($payUnpaid, 0, 10)
        );
    }

    // ------------------------------------------------------------
    // 3. Low stock (optional, gi-off sa default)
    // ------------------------------------------------------------
    if (INCLUDE_LOW_STOCK) {
        $stmt = $pdo->query("
            SELECT i.item_id, i.item_name, i.minimum_stock, " . stock_expr('i') . " AS in_stock
            FROM items i
            WHERE i.is_deleted = 0 AND i.minimum_stock > 0
            ORDER BY i.item_name ASC
        ");
        $count = 0;
        foreach ($stmt->fetchAll() as $r) {
            $stock = (int)$r['in_stock'];
            $min   = (int)$r['minimum_stock'];
            if ($stock < $min) {
                if ($count++ >= 10) break;
                $notes[] = [
                    'id'      => 'low-' . $r['item_id'] . '-' . $stock,
                    'type'    => 'low_stock',
                    'title'   => 'Low stock: ' . $r['item_name'],
                    'message' => $stock . ' left (minimum ' . $min . ')',
                    'link'    => 'dashboard.html'
                ];
            }
        }
    }

    echo json_encode(['success' => true, 'data' => $notes]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>