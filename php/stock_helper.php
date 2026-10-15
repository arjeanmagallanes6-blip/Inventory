<?php
// current stock = stock in - stock out + customer returns - purchase returns + stock adjustments
function stock_expr(string $a = 'i'): string {
    return "(
        COALESCE((SELECT SUM(x.quantity) FROM stock_in_details x WHERE x.item_id = $a.item_id),0)
      - COALESCE((SELECT SUM(x.quantity) FROM stock_out_details x WHERE x.item_id = $a.item_id),0)
      + COALESCE((SELECT SUM(x.quantity) FROM return_details x WHERE x.item_id = $a.item_id),0)
      - COALESCE((SELECT SUM(x.quantity) FROM purchase_return_details x WHERE x.item_id = $a.item_id),0)
      + COALESCE((SELECT SUM(d.quantity_adjusted) FROM stock_adjustment_dtl d
                  JOIN stock_adjustment_header h ON d.adjustment_hdr_id = h.adjustment_header_id
                  WHERE h.item_id = $a.item_id),0)
    )";
}

function get_stock(PDO $pdo, int $item_id): int {
    $stmt = $pdo->prepare("SELECT " . stock_expr('i') . " AS s FROM items i WHERE i.item_id = :id");
    $stmt->execute([':id' => $item_id]);
    return (int)$stmt->fetchColumn();
}