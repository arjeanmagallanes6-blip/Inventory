document.addEventListener('DOMContentLoaded', () => {
    loadCategories();

    const categoryForm = document.getElementById('categoryForm');
    const modal = document.getElementById('categoryModal');
    const openBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('category_id').value = '';
            categoryForm.reset();
            document.getElementById('modalTitle').innerText = 'Create New Category';
            document.getElementById('saveCategoryBtn').innerText = 'Save Category';
            modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveCategoryBtn');
            const formData = new FormData(categoryForm);
            const categoryId = document.getElementById('category_id').value;
            const action = categoryId ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/category_process.php?action=${action}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    alertBox.className = 'alert alert-success py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                    categoryForm.reset();
                    loadCategories();
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
                alertBox.innerText = 'Server error. Failed to save category.';
                alertBox.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = categoryId ? 'Update Category' : 'Save Category';
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

async function loadCategories() {
    const tbody = document.getElementById('categoryTableBody');
    try {
        const response = await fetch('../php/category_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No categories created yet.</td></tr>';
            return;
        }

        data.data.forEach(item => {
            const tr = document.createElement('tr');
            const safeName = item.category_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeDesc = (item.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

            tr.innerHTML = `
                <td>${item.category_name}</td>
                <td>${item.description || 'N/A'}</td>
                <td><span class="badge badge-success">${item.total_items} item(s)</span></td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="openEditModal(${item.category_id}, '${safeName}', '${safeDesc}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="softDeleteCategory(${item.category_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#D3453C;">Connection error loading data.</td></tr>';
    }
}

function openEditModal(categoryId, categoryName, description) {
    document.getElementById('category_id').value = categoryId;
    document.getElementById('category_name').value = categoryName;
    document.getElementById('description').value = description;
    document.getElementById('modalTitle').innerText = 'Edit Category';
    document.getElementById('saveCategoryBtn').innerText = 'Update Category';
    document.getElementById('categoryModal').style.display = 'block';
}

async function softDeleteCategory(categoryId) {
    if (!confirm('Are you sure you want to remove this category?')) return;

    const formData = new FormData();
    formData.append('category_id', categoryId);

    try {
        const response = await fetch('../php/category_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadCategories();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete category:', err);
        alert('Server error occurred while deleting.');
    }
}