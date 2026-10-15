let availableItems = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDropdownOptions();
    loadPurchaseOrders();

    const poForm         = document.getElementById('poForm');
    const poModal        = document.getElementById('poModal');
    const viewPoModal    = document.getElementById('viewPoModal');
    const openBtn        = document.getElementById('openAddModalBtn');
    const closeBtn       = document.getElementById('closeModalBtn');
    const cancelBtn      = document.getElementById('cancelModalBtn');
    const closeViewBtn   = document.getElementById('closeViewModalBtn');
    const addItemRowBtn  = document.getElementById('addItemRowBtn');
    const supplierSelect = document.getElementById('supplier_id');

    // Reset items completely when supplier changes
    if (supplierSelect) {
        supplierSelect.addEventListener('change', async (e) => {
            const supplierId = e.target.value;
            await loadSupplierItems(supplierId);
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (poForm) poForm.reset();
            document.getElementById('order_date').value = new Date().toISOString().split('T')[0];
            generatePoNumber();
            document.getElementById('poItemsBody').innerHTML = '';
            availableItems = []; 
            addPoItemRow(); 
            updateGrandTotal();
            if (poModal) poModal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => poModal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => poModal.style.display = 'none');
    if (closeViewBtn) closeViewBtn.addEventListener('click', () => viewPoModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === poModal) poModal.style.display = 'none';
        if (e.target === viewPoModal) viewPoModal.style.display = 'none';
    });

    if (addItemRowBtn) {
        addItemRowBtn.addEventListener('click', () => addPoItemRow());
    }

    if (poForm) {
        poForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const alertBox  = document.getElementById('formAlert');
            const submitBtn = document.getElementById('savePoBtn');

            // 1. Trigger browser HTML5 form validation
            if (!poForm.checkValidity()) {
                poForm.reportValidity();
                return;
            }

            // 2. Validate line items table
            const itemSelects = document.querySelectorAll('#poItemsBody .item-select');
            if (itemSelects.length === 0) {
                if (alertBox) {
                    alertBox.className = 'alert alert-danger py-2';
                    alertBox.innerText = 'Please add at least one item row.';
                    alertBox.classList.remove('d-none');
                }
                return;
            }

            let hasEmptyField = false;
            itemSelects.forEach(select => {
                if (!select.value) {
                    hasEmptyField = true;
                }
            });

            if (hasEmptyField) {
                if (alertBox) {
                    alertBox.className = 'alert alert-danger py-2';
                    alertBox.innerText = 'Please select a valid item for every line item row.';
                    alertBox.classList.remove('d-none');
                }
                return;
            }

            const formData = new FormData(poForm);

            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';
            if (alertBox) alertBox.classList.add('d-none');

            try {
                const response = await fetch('../php/purchase_orders_process.php?action=create', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    if (alertBox) {
                        alertBox.className = 'alert alert-success py-2';
                        alertBox.innerText = data.message;
                        alertBox.classList.remove('d-none');
                    }
                    poForm.reset();
                    loadPurchaseOrders();
                    setTimeout(() => {
                        if (poModal) poModal.style.display = 'none';
                        if (alertBox) alertBox.classList.add('d-none');
                    }, 1000);
                } else {
                    if (alertBox) {
                        alertBox.className = 'alert alert-danger py-2';
                        alertBox.innerText = data.message;
                        alertBox.classList.remove('d-none');
                    }
                }
            } catch (err) {
                console.error('Failed to create PO:', err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Order';
            }
        });
    }
});

function generatePoNumber() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const poNumInput = document.getElementById('purchase_order_number');
    if (poNumInput) {
        poNumInput.value = `PO-${new Date().getFullYear()}-${randomNum}`;
    }
}

async function loadDropdownOptions() {
    try {
        const res  = await fetch('../php/purchase_orders_process.php?action=get_options');
        const data = await res.json();
        if (!data.success) return;

        const supplierSelect = document.getElementById('supplier_id');
        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="" selected disabled>Select Supplier *</option>';
            data.suppliers.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.supplier_id}">${s.supplier_name}</option>`;
            });
        }
    } catch (e) {
        console.error('Failed to load PO dropdown options:', e);
    }
}

// Fetch items linked to supplier and RESTART table rows
async function loadSupplierItems(supplierId) {
    const tbody = document.getElementById('poItemsBody');

    if (!supplierId) {
        availableItems = [];
        if (tbody) tbody.innerHTML = '';
        addPoItemRow();
        updateGrandTotal();
        return;
    }

    try {
        const res = await fetch(`../php/purchase_orders_process.php?action=get_items_by_supplier&supplier_id=${supplierId}`);
        const data = await res.json();

        if (data.success) {
            availableItems = data.items || [];
            
            // Restart line items table back to 1 fresh row for the selected supplier
            if (tbody) tbody.innerHTML = '';
            addPoItemRow();
            updateGrandTotal();
        }
    } catch (e) {
        console.error('Failed to fetch supplier items:', e);
    }
}

function generateItemOptionsHtml() {
    if (availableItems.length === 0) {
        return '<option value="" selected disabled>-- Select a Supplier First --</option>';
    }

    let options = '<option value="" selected disabled>Select Item *</option>';
    availableItems.forEach(i => {
        options += `<option value="${i.item_id}" data-price="${i.unit_price}">${i.item_name}</option>`;
    });
    return options;
}

function addPoItemRow() {
    const tbody = document.getElementById('poItemsBody');
    if (!tbody) return;

    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td>
            <select name="items[]" class="form-select item-select" required onchange="handleItemChange(this)">
                ${generateItemOptionsHtml()}
            </select>
        </td>
        <td>
            <input type="number" name="quantities[]" class="form-control qty-input" min="1" value="1" required oninput="calculateRowTotal(this)">
        </td>
        <td>
            <input type="number" step="0.01" name="unit_costs[]" class="form-control cost-input bg-light" placeholder="0.00" readonly required>
        </td>
        <td class="text-end fw-bold row-total">₱0.00</td>
        <td class="text-center">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removePoItemRow(this)">✕</button>
        </td>
    `;

    tbody.appendChild(tr);
}

function handleItemChange(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const price = selectedOption ? selectedOption.getAttribute('data-price') || 0.00 : 0.00;
    const row = selectEl.closest('tr');
    const costInput = row.querySelector('.cost-input');
    
    if (costInput) {
        costInput.value = parseFloat(price).toFixed(2);
        calculateRowTotal(costInput);
    }
}

function calculateRowTotal(inputEl) {
    const row = inputEl.closest('tr');
    const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
    const cost = parseFloat(row.querySelector('.cost-input').value) || 0;
    const total = qty * cost;

    row.querySelector('.row-total').innerText = `₱${total.toFixed(2)}`;
    updateGrandTotal();
}

function removePoItemRow(buttonEl) {
    const tbody = document.getElementById('poItemsBody');
    if (tbody.children.length > 1) {
        buttonEl.closest('tr').remove();
        updateGrandTotal();
    }
}

function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('#poItemsBody tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
        const cost = parseFloat(row.querySelector('.cost-input')?.value) || 0;
        grandTotal += (qty * cost);
    });

    const display = document.getElementById('grandTotalDisplay');
    if (display) display.innerText = grandTotal.toFixed(2);
}

async function loadPurchaseOrders() {
    const tbody = document.getElementById('poTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('../php/purchase_orders_process.php?action=list');
        const data     = await response.json();

        if (!data.success && data.unauthorized) {
            window.location.href = 'login.html';
            return;
        }

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No purchase orders found.</td></tr>';
            return;
        }

        data.data.forEach(po => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${po.purchase_order_number}</strong></td>
                <td>${po.supplier_name || 'N/A'}</td>
                <td>${po.order_date}</td>
                <td>${po.expected_delivery_date || 'N/A'}</td>
                <td><span class="badge bg-secondary">${po.total_items} items</span></td>
                <td>₱${parseFloat(po.total_amount).toFixed(2)}</td>
                <td>
                    <button class="btn btn-info btn-sm text-white me-1" onclick="viewPoDetails(${po.purchase_order_id})">View</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePo(${po.purchase_order_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load purchase orders:', err);
    }
}

async function viewPoDetails(poId) {
    const modalContent = document.getElementById('viewPoContent');
    const viewModal = document.getElementById('viewPoModal');
    if (!modalContent || !viewModal) return;

    modalContent.innerHTML = 'Loading order details...';
    viewModal.style.display = 'block';

    try {
        const res = await fetch(`../php/purchase_orders_process.php?action=get_details&po_id=${poId}`);
        const data = await res.json();

        if (!data.success) {
            modalContent.innerHTML = `<div class="text-danger">${data.message}</div>`;
            return;
        }

        const h = data.header;
        let rowsHtml = '';
        let grandTotal = 0;

        data.details.forEach(d => {
            grandTotal += parseFloat(d.total_cost);
            rowsHtml += `
                <tr>
                    <td>${d.item_name}</td>
                    <td>${d.quantity}</td>
                    <td>₱${parseFloat(d.unit_cost).toFixed(2)}</td>
                    <td class="text-end">₱${parseFloat(d.total_cost).toFixed(2)}</td>
                </tr>
            `;
        });

        modalContent.innerHTML = `
            <div class="row mb-3">
                <div class="col-6">
                    <strong>PO Number:</strong> ${h.purchase_order_number}<br>
                    <strong>Supplier:</strong> ${h.supplier_name}
                </div>
                <div class="col-6 text-end">
                    <strong>Order Date:</strong> ${h.order_date}<br>
                    <strong>Expected Delivery:</strong> ${h.expected_delivery_date || 'N/A'}
                </div>
            </div>
            <table class="table table-bordered align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Item Description</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th class="text-end">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-end">Grand Total:</th>
                        <th class="text-end">₱${grandTotal.toFixed(2)}</th>
                    </tr>
                </tfoot>
            </table>
        `;
    } catch (e) {
        modalContent.innerHTML = `<div class="text-danger">Failed to fetch details.</div>`;
    }
}

async function deletePo(poId) {
    if (!confirm('Are you sure you want to delete this purchase order and its details?')) return;

    const formData = new FormData();
    formData.append('purchase_order_id', poId);

    try {
        const res = await fetch('../php/purchase_orders_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            loadPurchaseOrders();
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert('Server error deleting PO.');
    }
}