window.supplierDataStore = {};

document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();

    const supplierForm = document.getElementById('supplierForm');
    const modal        = document.getElementById('supplierModal');
    const openBtn      = document.getElementById('openAddModalBtn');
    const closeBtn     = document.getElementById('closeModalBtn');
    const cancelBtn    = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('supplier_id').value = '';
            if (supplierForm) supplierForm.reset();
            document.getElementById('modalTitle').innerText = 'Add New Supplier';
            document.getElementById('saveSupplierBtn').innerText = 'Save Supplier';
            if (modal) modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (supplierForm) {
        supplierForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox  = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveSupplierBtn');
            const formData  = new FormData(supplierForm);
            const id        = document.getElementById('supplier_id').value;
            const action    = id ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            if (alertBox) alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/supplier_process.php?action=${action}`, {
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
                    supplierForm.reset();
                    loadSuppliers();
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
                submitBtn.innerText = id ? 'Update Supplier' : 'Save Supplier';
            }
        });
    }
});

async function loadSuppliers() {
    const tbody = document.getElementById('supplierTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('../php/supplier_process.php?action=list');
        const data = await response.json();

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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No suppliers registered yet.</td></tr>';
            return;
        }

        window.supplierDataStore = {};
        data.data.forEach(item => {
            window.supplierDataStore[item.supplier_id] = item;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.supplier_name}</strong></td>
                <td>${item.contact_person || 'N/A'}</td>
                <td>${item.contact_number || 'N/A'}</td>
                <td>${item.email || 'N/A'}</td>
                <td>${item.address || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary btn-sm me-1" onclick="openEditModal(${item.supplier_id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${item.supplier_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load suppliers:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#D3453C;">Connection error loading supplier records.</td></tr>';
    }
}

function openEditModal(id) {
    const item = window.supplierDataStore[id];
    if (!item) return;

    document.getElementById('supplier_id').value    = item.supplier_id;
    document.getElementById('supplier_name').value  = item.supplier_name;
    document.getElementById('contact_person').value = item.contact_person || '';
    document.getElementById('contact_number').value = item.contact_number || '';
    document.getElementById('email').value          = item.email || '';
    document.getElementById('address').value        = item.address || '';

    document.getElementById('modalTitle').innerText      = 'Edit Supplier';
    document.getElementById('saveSupplierBtn').innerText = 'Update Supplier';
    document.getElementById('supplierModal').style.display = 'block';
}

async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    const formData = new FormData();
    formData.append('supplier_id', id);

    try {
        const response = await fetch('../php/supplier_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadSuppliers();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete supplier:', err);
        alert('Server error occurred while deleting.');
    }
}