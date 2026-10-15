document.addEventListener('DOMContentLoaded', () => {
    loadPendingPOs();
    loadStockInHistory();

    const receiveForm = document.getElementById('receivePoForm');
    const modal = document.getElementById('receivePoModal');
    const receiptModal = document.getElementById('receiptModal');

    const closeBtn = document.getElementById('closeReceiveModalBtn');
    const cancelBtn = document.getElementById('cancelReceiveModalBtn');
    const closeReceiptBtn = document.getElementById('closeReceiptBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    if (closeReceiptBtn) closeReceiptBtn.addEventListener('click', () => receiptModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === receiptModal) receiptModal.style.display = 'none';
    });

    if (receiveForm) {
        receiveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const modalAlert = document.getElementById('modalAlert');
            const submitBtn = document.getElementById('confirmReceiveBtn');
            const formData = new FormData(receiveForm);

            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing Stock In...';
            modalAlert.classList.add('d-none');

            try {
                const response = await fetch('../php/stock_in_process.php?action=receive_po', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    // Collect receipt info before the form is reset
                    const poNumber = document.getElementById('modalPoTitle').innerText.replace('Receive Stock for ', '');
                    const supplier = document.getElementById('displaySupplierName').innerText || 'N/A';
                    const deliveryDate = document.getElementById('delivery_date').value || 'N/A';

                    const receiptItems = [];
                    let grandTotal = 0;

                    document.querySelectorAll('#receivePoItemsBody tr').forEach(row => {
                        const qtyInput = row.querySelector('input[name="quantities[]"]');
                        if (!qtyInput) return;

                        const name = row.dataset.itemName;
                        const qty = parseInt(qtyInput.value) || 0;
                        const unitCost = parseFloat(row.dataset.unitCost) || 0;
                        const totalCost = qty * unitCost;

                        if (qty > 0) {
                            grandTotal += totalCost;
                            receiptItems.push({ name, qty, unitCost, totalCost });
                        }
                    });

                    modal.style.display = 'none';
                    receiveForm.reset();

                    loadPendingPOs();
                    loadStockInHistory();

                    showReceiptModal(poNumber, supplier, deliveryDate, receiptItems, grandTotal);
                } else {
                    modalAlert.className = 'alert alert-danger py-2';
                    modalAlert.innerText = data.message || 'Failed to process stock receiving.';
                    modalAlert.classList.remove('d-none');
                }
            } catch (err) {
                console.error(err);
                modalAlert.className = 'alert alert-danger py-2';
                modalAlert.innerText = 'Server error. Failed to process receiving.';
                modalAlert.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirm & Update Stock';
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch('../php/logout.php');
                const data = await res.json();
                if (data.success) window.location.href = 'login.html';
            } catch (err) {
                console.error('Logout failed:', err);
            }
        });
    }
});

async function loadPendingPOs() {
    const tbody = document.getElementById('pendingPoTableBody');
    try {
        const response = await fetch('../php/stock_in_process.php?action=get_pending_pos');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">All purchase orders have been received.</td></tr>';
            return;
        }

        data.data.forEach(po => {
            const received = parseInt(po.received_qty) || 0;
            const ordered = parseInt(po.ordered_qty) || 0;
            const status = received > 0
                ? '<span class="badge bg-info text-dark">Partially Received</span>'
                : '<span class="badge bg-warning text-dark">Pending Receiving</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${po.purchase_order_number}</strong></td>
                <td>${po.supplier_name || 'N/A'}</td>
                <td>${po.order_date}</td>
                <td>${received} / ${ordered}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="openReceiveModal(${po.purchase_order_id})">📥 Receive Stock</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load pending POs:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading pending purchase orders.</td></tr>';
    }
}

async function openReceiveModal(poId) {
    const modal = document.getElementById('receivePoModal');
    const itemsTbody = document.getElementById('receivePoItemsBody');
    const alertBox = document.getElementById('modalAlert');

    alertBox.classList.add('d-none');
    itemsTbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading PO details...</td></tr>';
    document.getElementById('delivery_date').value = new Date().toISOString().split('T')[0];
    modal.style.display = 'block';

    try {
        const response = await fetch(`../php/stock_in_process.php?action=get_po_for_receiving&po_id=${poId}`);
        const data = await response.json();

        if (!data.success) {
            itemsTbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message}</td></tr>`;
            return;
        }

        const po = data.header;
        document.getElementById('receive_po_id').value = po.purchase_order_id;
        document.getElementById('modalPoTitle').innerText = `Receive Stock for ${po.purchase_order_number}`;
        document.getElementById('displaySupplierName').innerText = po.supplier_name || 'N/A';
        document.getElementById('displayOrderDate').innerText = po.order_date;

        itemsTbody.innerHTML = '';
        data.details.forEach(item => {
            const unitCost = parseFloat(item.unit_cost) || 0;
            const orderedQty = parseInt(item.quantity) || 0;
            const receivedQty = parseInt(item.received_qty) || 0;
            const remaining = Math.max(orderedQty - receivedQty, 0);

            const tr = document.createElement('tr');
            tr.dataset.itemName = item.item_name;
            tr.dataset.unitCost = unitCost;

            // readonly (not disabled) so quantities[] always stays aligned with item_ids[]
            tr.innerHTML = `
                <td>
                    <strong>${item.item_name}</strong>
                    <input type="hidden" name="item_ids[]" value="${item.item_id}">
                </td>
                <td>${orderedQty}</td>
                <td>${receivedQty}</td>
                <td>
                    <input type="number" name="quantities[]" class="form-control qty-input" value="${remaining}" min="0" max="${remaining}" ${remaining === 0 ? 'readonly' : ''}>
                </td>
                <td>₱${unitCost.toFixed(2)}</td>
                <td class="line-total fw-bold">₱${(remaining * unitCost).toFixed(2)}</td>
            `;
            itemsTbody.appendChild(tr);
        });

        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('input', calculateModalTotals);
        });

        calculateModalTotals();

    } catch (err) {
        console.error('Failed to load PO details for receiving:', err);
        itemsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error fetching PO items.</td></tr>';
    }
}

function calculateModalTotals() {
    let grandTotal = 0;

    document.querySelectorAll('#receivePoItemsBody tr').forEach(row => {
        const qtyInput = row.querySelector('.qty-input');
        if (!qtyInput) return;
        const qty = parseInt(qtyInput.value) || 0;
        const unitCost = parseFloat(row.dataset.unitCost) || 0;
        const totalCost = qty * unitCost;

        row.querySelector('.line-total').innerText = `₱${totalCost.toFixed(2)}`;
        grandTotal += totalCost;
    });

    document.getElementById('modalGrandTotal').innerText = `₱${grandTotal.toFixed(2)}`;
}

function showReceiptModal(poNumber, supplier, deliveryDate, items, grandTotal) {
    document.getElementById('receiptPoNumber').innerText = poNumber;
    document.getElementById('receiptSupplier').innerText = supplier;
    document.getElementById('receiptDelivery').innerText = deliveryDate;
    document.getElementById('receiptDate').innerText = new Date().toLocaleString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const tbody = document.getElementById('receiptItemsBody');
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td class="text-center">${item.qty}</td>
            <td class="text-end">₱${item.unitCost.toFixed(2)}</td>
            <td class="text-end fw-bold">₱${item.totalCost.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('receiptGrandTotal').innerText = `₱${grandTotal.toFixed(2)}`;
    document.getElementById('receiptModal').style.display = 'block';
}

async function loadStockInHistory() {
    const tbody = document.getElementById('stockInTableBody');
    try {
        const response = await fetch('../php/stock_in_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No stock receiving history logged yet.</td></tr>';
            return;
        }

        data.data.forEach(row => {
            const unitCost = parseFloat(row.unit_cost) || 0;
            const totalCost = parseFloat(row.total_cost) || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.purchase_order_number || 'N/A'}</strong></td>
                <td>${row.item_name}</td>
                <td><span class="badge bg-success">+${row.quantity}</span></td>
                <td>₱${unitCost.toFixed(2)}</td>
                <td class="fw-bold">₱${totalCost.toFixed(2)}</td>
                <td>${row.supplier_name || 'N/A'}</td>
                <td>${row.delivery_date || 'N/A'}</td>
                <td>${row.stock_in_date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load stock history:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Connection error loading history.</td></tr>';
    }
}