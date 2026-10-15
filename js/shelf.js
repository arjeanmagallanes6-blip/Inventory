window.shelfDataStore = {};

document.addEventListener('DOMContentLoaded', () => {
    loadShelves();

    const shelfForm = document.getElementById('shelfForm');
    const modal = document.getElementById('shelfModal');
    const openBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('shelf_id').value = '';
            shelfForm.reset();
            document.getElementById('modalTitle').innerText = 'Add New Shelf';
            document.getElementById('saveShelfBtn').innerText = 'Save Shelf';
            modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (shelfForm) {
        shelfForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveShelfBtn');
            const formData = new FormData(shelfForm);
            const shelfId = document.getElementById('shelf_id').value;
            const action = shelfId ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/shelf_process.php?action=${action}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    alertBox.className = 'alert alert-success py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                    shelfForm.reset();
                    loadShelves();
                    setTimeout(() => {
                        modal.style.display = 'none';
                        alertBox.classList.add('d-none');
                    }, 1000);
                } else {
                    alertBox.className = 'alert alert-danger py-2';
                    alertBox.innerText = data.message;
                    alertBox.classList.remove('d-none');
                }
            } catch (err) {
                console.error(err);
                alertBox.className = 'alert alert-danger py-2';
                alertBox.innerText = 'Server error. Failed to save shelf.';
                alertBox.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = shelfId ? 'Update Shelf' : 'Save Shelf';
            }
        });
    }
});

async function loadShelves() {
    const tbody = document.getElementById('shelfTableBody');
    try {
        const response = await fetch('../php/shelf_process.php?action=list');
        const data = await response.json();

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No shelves recorded yet.</td></tr>';
            return;
        }

        window.shelfDataStore = {};
        data.data.forEach(shelf => {
            window.shelfDataStore[shelf.shelf_id] = shelf;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${shelf.shelf_code}</code></td>
                <td><strong>${shelf.shelf_name}</strong></td>
                <td>
                    <button class="btn btn-primary btn-sm me-1" onclick="openEditModal(${shelf.shelf_id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteShelf(${shelf.shelf_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load shelves:', err);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#D3453C;">Connection error loading data.</td></tr>';
    }
}

function openEditModal(shelfId) {
    const shelf = window.shelfDataStore[shelfId];
    if (!shelf) return;

    document.getElementById('shelf_id').value = shelf.shelf_id;
    document.getElementById('shelf_code').value = shelf.shelf_code;
    document.getElementById('shelf_name').value = shelf.shelf_name;

    document.getElementById('modalTitle').innerText = 'Edit Shelf';
    document.getElementById('saveShelfBtn').innerText = 'Update Shelf';
    document.getElementById('shelfModal').style.display = 'block';
}

async function deleteShelf(shelfId) {
    if (!confirm('Are you sure you want to delete this shelf?')) return;

    const formData = new FormData();
    formData.append('shelf_id', shelfId);

    try {
        const response = await fetch('../php/shelf_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadShelves();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete shelf:', err);
        alert('Server error occurred while deleting.');
    }
}