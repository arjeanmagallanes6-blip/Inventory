document.addEventListener('DOMContentLoaded', () => {
    loadItemOptions();
    loadStockOutHistory();

    const stockOutForm = document.getElementById('stockOutForm');
    const stockOutModalEl = document.getElementById('stockOutModal');

    if (stockOutForm) {
        stockOutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const modalAlert = document.getElementById('modalAlert');
            const submitBtn = document.getElementById('saveStockBtn');
            const formData = new FormData(stockOutForm);

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            modalAlert.classList.add('d-none');

            try {
                const response = await fetch('../php/stock_out_process.php?action=create', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    modalAlert.className = 'alert alert-success py-2';
                    modalAlert.innerText = data.message;
                    modalAlert.classList.remove('d-none');

                    stockOutForm.reset();
                    loadStockOutHistory();

                    setTimeout(() => {
                        const modalInstance = bootstrap.Modal.getInstance(stockOutModalEl);
                        if (modalInstance) modalInstance.hide();
                        modalAlert.classList.add('d-none');
                    }, 1200);
                } else {
                    modalAlert.className = 'alert alert-danger py-2';
                    modalAlert.innerText = data.message || 'Failed to record stock out.';
                    modalAlert.classList.remove('d-none');
                }
            } catch (err) {
                console.error(err);
                modalAlert.className = 'alert alert-danger py-2';
                modalAlert.innerText = 'Server error. Failed to process transaction.';
                modalAlert.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Save Dispatch';
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

async function loadItemOptions() {
    const itemSelect = document.getElementById('stock_item_id');
    try {
        const response = await fetch('../php/stock_out_process.php?action=get_items');
        const data = await response.json();

        if (data.success) {
            itemSelect.innerHTML = '<option value="" disabled selected>-- Select Product --</option>';
            data.items.forEach(item => {
                const unitLabel = item.unit_name ? ` (${item.unit_name})` : '';
                itemSelect.innerHTML += `<option value="${item.item_id}">${item.item_name}${unitLabel}</option>`;
            });
        } else {
            itemSelect.innerHTML = '<option value="">Failed to load items</option>';
        }
    } catch (err) {
        console.error('Failed to load item options:', err);
        itemSelect.innerHTML = '<option value="">Error loading items</option>';
    }
}

async function loadStockOutHistory() {
    const tbody = document.getElementById('stockOutTableBody');
    try {
        const response = await fetch('../php/stock_out_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No stock-out records found.</td></tr>';
            return;
        }

        data.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.stock_out_no}</strong></td>
                <td>${row.item_name}</td>
                <td><span class="badge bg-danger">-${row.quantity}</span></td>
                <td>${row.user_name || 'N/A'}</td>
                <td>${row.created_at}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load stock history:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Connection error loading data.</td></tr>';
    }
}