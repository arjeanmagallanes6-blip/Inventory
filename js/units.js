document.addEventListener('DOMContentLoaded', () => {
    loadUnits();

    const unitForm = document.getElementById('unitForm');
    const modal = document.getElementById('unitModal');
    const openBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('unit_id').value = '';
            unitForm.reset();
            document.getElementById('modalTitle').innerText = 'Create New Unit';
            document.getElementById('saveUnitBtn').innerText = 'Save Unit';
            modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (unitForm) {
        unitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveUnitBtn');
            const formData = new FormData(unitForm);
            const unitId = document.getElementById('unit_id').value;
            const action = unitId ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/units_process.php?action=${action}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    alertBox.className = 'alert alert-success py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                    unitForm.reset();
                    loadUnits();
                    setTimeout(() => {
                        modal.style.display = 'none';
                        alertBox.classList.add('d-none');
                    }, 1200);
                } else {
                    alertBox.className = 'alert alert-danger py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                }
            } catch (err) {
                console.error(err);
                alertBox.className = 'alert alert-danger py-2';
                alertBox.innerText = 'Server error. Failed to save unit.';
                alertBox.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = unitId ? 'Update Unit' : 'Save Unit';
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
                if (data.success) {
                    window.location.href = 'login.html';
                }
            } catch (err) {
                console.error('Logout failed:', err);
            }
        });
    }
});

async function loadUnits() {
    const tbody = document.getElementById('unitTableBody');
    try {
        const response = await fetch('../php/units_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No measurement units registered yet.</td></tr>';
            return;
        }

        data.data.forEach(item => {
            const tr = document.createElement('tr');
            const safeName = item.unit_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            tr.innerHTML = `
                <td>${item.unit_name}</td>
                <td><span class="badge badge-success">${item.total_items} item(s)</span></td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="openEditModal(${item.unit_id}, '${safeName}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="softDeleteUnit(${item.unit_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load units:', err);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#D3453C;">Connection error loading data.</td></tr>';
    }
}

function openEditModal(unitId, unitName) {
    document.getElementById('unit_id').value = unitId;
    document.getElementById('unit_name').value = unitName;
    document.getElementById('modalTitle').innerText = 'Edit Unit';
    document.getElementById('saveUnitBtn').innerText = 'Update Unit';
    document.getElementById('unitModal').style.display = 'block';
}

async function softDeleteUnit(unitId) {
    if (!confirm('Are you sure you want to remove this unit?')) return;

    const formData = new FormData();
    formData.append('unit_id', unitId);

    try {
        const response = await fetch('../php/units_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadUnits();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete unit:', err);
        alert('Server error occurred while deleting.');
    }
}