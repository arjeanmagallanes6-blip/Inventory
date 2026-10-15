document.addEventListener('DOMContentLoaded', () => {
    loadBrands();

    const brandForm = document.getElementById('brandForm');
    const modal = document.getElementById('brandModal');
    const openBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('brand_id').value = '';
            brandForm.reset();
            document.getElementById('modalTitle').innerText = 'Create New Brand';
            document.getElementById('saveBrandBtn').innerText = 'Save Brand';
            modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (brandForm) {
        brandForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveBrandBtn');
            const formData = new FormData(brandForm);
            const brandId = document.getElementById('brand_id').value;
            const action = brandId ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/brand_process.php?action=${action}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    alertBox.className = 'alert alert-success py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                    brandForm.reset();
                    loadBrands();
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
                alertBox.innerText = 'Server error. Failed to save brand.';
                alertBox.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = brandId ? 'Update Brand' : 'Save Brand';
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

async function loadBrands() {
    const tbody = document.getElementById('brandTableBody');
    try {
        const response = await fetch('../php/brand_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No brands registered yet.</td></tr>';
            return;
        }

        data.data.forEach(item => {
            const tr = document.createElement('tr');
            const safeName = item.brand_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            tr.innerHTML = `
                <td>${item.brand_name}</td>
                <td><span class="badge badge-success">${item.total_items} product(s)</span></td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="openEditModal(${item.brand_id}, '${safeName}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="softDeleteBrand(${item.brand_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load brands:', err);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#D3453C;">Connection error loading data.</td></tr>';
    }
}

function openEditModal(brandId, brandName) {
    document.getElementById('brand_id').value = brandId;
    document.getElementById('brand_name').value = brandName;
    document.getElementById('modalTitle').innerText = 'Edit Brand';
    document.getElementById('saveBrandBtn').innerText = 'Update Brand';
    document.getElementById('brandModal').style.display = 'block';
}

async function softDeleteBrand(brandId) {
    if (!confirm('Are you sure you want to remove this brand?')) return;

    const formData = new FormData();
    formData.append('brand_id', brandId);

    try {
        const response = await fetch('../php/brand_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadBrands();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete brand:', err);
        alert('Server error occurred while deleting.');
    }
} 