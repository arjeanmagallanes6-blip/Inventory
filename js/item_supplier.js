document.addEventListener('DOMContentLoaded', () => {
    loadDropdownOptions();
    loadJunctionData();

    const form      = document.getElementById('itemSupplierForm');
    const modal     = document.getElementById('itemSupplierModal');
    const openBtn   = document.getElementById('openAddModalBtn');
    const closeBtn  = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (form) form.reset();
            if (modal) modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox  = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveBtn');
            const formData  = new FormData(form);

            submitBtn.disabled = true;
            submitBtn.innerText = 'Linking...';
            if (alertBox) alertBox.classList.add('d-none');

            try {
                const response = await fetch('../php/item_supplier_process.php?action=create', {
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
                    form.reset();
                    loadJunctionData();
                    setTimeout(() => {
                        if (modal) modal.style.display = 'none';
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
                console.error('Save failed:', err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Create Link';
            }
        });
    }
});

async function loadDropdownOptions() {
    try {
        const res  = await fetch('../php/item_supplier_process.php?action=get_options');
        const data = await res.json();
        if (!data.success) return;

        const itemSelect     = document.getElementById('item_id');
        const supplierSelect = document.getElementById('supplier_id');

        if (itemSelect) {
            itemSelect.innerHTML = '<option value="">Select Item / Product *</option>';
            data.items.forEach(i => {
                itemSelect.innerHTML += `<option value="${i.item_id}">#${i.item_id} - ${i.item_name}</option>`;
            });
        }

        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">Select Supplier *</option>';
            data.suppliers.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.supplier_id}">#${s.supplier_id} - ${s.supplier_name}</option>`;
            });
        }
    } catch (e) {
        console.error('Failed to load options:', e);
    }
}

async function loadJunctionData() {
    const tbody = document.getElementById('junctionTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('../php/item_supplier_process.php?action=list');
        const data     = await response.json();

        if (!data.success && data.unauthorized) {
            window.location.href = 'login.html';
            return;
        }

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No item-supplier relationship records found.</td></tr>';
            return;
        }

        data.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${row.item_supplier_id}</strong></td>
                <td>#${row.item_id} - <strong>${row.item_name}</strong></td>
                <td>#${row.supplier_id} - <strong>${row.supplier_name}</strong></td>
                <td><span class="badge bg-secondary">Many-to-Many</span></td>
                <td>${row.contact_person || 'N/A'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteJunctionRow(${row.item_supplier_id})">Unlink</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load junction table:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#D3453C;">Error loading records.</td></tr>';
    }
}

async function deleteJunctionRow(itemSupplierId) {
    if (!confirm('Are you sure you want to remove this item-supplier link?')) return;

    const formData = new FormData();
    formData.append('item_supplier_id', itemSupplierId);

    try {
        const response = await fetch('../php/item_supplier_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadJunctionData();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete link:', err);
        alert('Server error removing link.');
    }
}