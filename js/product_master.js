window.productDataStore = {};
let allProductsList = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDropdownOptions();
    loadProducts();

    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterBrand = document.getElementById('filterBrand');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
    if (filterCategory) filterCategory.addEventListener('change', applyFiltersAndRender);
    if (filterBrand) filterBrand.addEventListener('change', applyFiltersAndRender);
    if (sortOrder) sortOrder.addEventListener('change', applyFiltersAndRender);

    const productForm = document.getElementById('productForm');
    const modal = document.getElementById('productModal');
    const openBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            const itemIdEl = document.getElementById('item_id');
            if (itemIdEl) itemIdEl.value = '';
            if (productForm) productForm.reset();
            
            const supplierSelect = document.getElementById('supplier_ids');
            if (supplierSelect) {
                Array.from(supplierSelect.options).forEach(opt => opt.selected = false);
            }

            document.getElementById('modalTitle').innerText = 'Add New Product';
            document.getElementById('saveProductBtn').innerText = 'Save Product';
            if (modal) modal.style.display = 'block';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBox = document.getElementById('formAlert');
            const submitBtn = document.getElementById('saveProductBtn');
            const formData = new FormData(productForm);
            const itemIdEl = document.getElementById('item_id');
            const itemId = itemIdEl ? itemIdEl.value : '';
            const action = itemId ? 'update' : 'create';

            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            if (alertBox) alertBox.classList.add('d-none');

            try {
                const response = await fetch(`../php/product_master_process.php?action=${action}`, {
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
                    productForm.reset();
                    loadProducts();
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
                if (alertBox) {
                    alertBox.className = 'alert alert-danger py-2';
                    alertBox.innerText = 'Server error saving product.';
                    alertBox.classList.remove('d-none');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = itemId ? 'Update Product' : 'Save Product';
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

async function loadDropdownOptions() {
    try {
        const res = await fetch('../php/product_master_process.php?action=get_options');
        const data = await res.json();
        if (!data.success) return;

        const categorySelect = document.getElementById('category_id');
        const brandSelect    = document.getElementById('brand_id');
        const unitSelect     = document.getElementById('unit_id');
        const shelfSelect    = document.getElementById('shelf_id');
        const supplierSelect = document.getElementById('supplier_ids');

        const filterCategory = document.getElementById('filterCategory');
        const filterBrand    = document.getElementById('filterBrand');

        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category *</option>';
            data.categories.forEach(c => {
                categorySelect.innerHTML += `<option value="${c.category_id}">${c.category_name}</option>`;
            });
        }

        if (brandSelect) {
            brandSelect.innerHTML = '<option value="">Select Brand (Optional)</option>';
            data.brands.forEach(b => {
                brandSelect.innerHTML += `<option value="${b.brand_id}">${b.brand_name}</option>`;
            });
        }

        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">Select Unit *</option>';
            data.units.forEach(u => {
                unitSelect.innerHTML += `<option value="${u.unit_id}">${u.unit_name}</option>`;
            });
        }

        if (shelfSelect) {
            shelfSelect.innerHTML = '<option value="">Select*</option>';
            data.shelves.forEach(s => {
                shelfSelect.innerHTML += `<option value="${s.shelf_id}">${s.shelf_name}</option>`;
            });
        }

        if (supplierSelect && data.suppliers) {
            supplierSelect.innerHTML = '';
            data.suppliers.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.supplier_id}">${s.supplier_name}</option>`;
            });
        }

        if (filterCategory) {
            filterCategory.innerHTML = '<option value="">All Categories</option>';
            data.categories.forEach(c => {
                filterCategory.innerHTML += `<option value="${c.category_name}">${c.category_name}</option>`;
            });
        }

        if (filterBrand) {
            filterBrand.innerHTML = '<option value="">All Brands</option>';
            data.brands.forEach(b => {
                filterBrand.innerHTML += `<option value="${b.brand_name}">${b.brand_name}</option>`;
            });
        }

    } catch (e) {
        console.error('Failed to load options:', e);
    }
}

async function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('../php/product_master_process.php?action=list');
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonErr) {
            console.error('Server response:', text);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#D3453C;">Server error output. Open Console (F12) to inspect.</td></tr>`;
            return;
        }

        if (!data.success && data.unauthorized) {
            window.location.href = 'login.html';
            return;
        }

        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        allProductsList = data.data || [];
        applyFiltersAndRender();

    } catch (err) {
        console.error('Failed to load products:', err);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#D3453C;">Connection error loading product records.</td></tr>';
    }
}

function applyFiltersAndRender() {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const selectedCategory = document.getElementById('filterCategory')?.value || '';
    const selectedBrand = document.getElementById('filterBrand')?.value || '';
    const sortOrder = document.getElementById('sortOrder')?.value || 'name_asc';

    // 1. Filter
    let filtered = allProductsList.filter(item => {
        const nameMatch = (item.item_name || '').toLowerCase().includes(searchTerm);
        const descMatch = (item.description || '').toLowerCase().includes(searchTerm);
        const matchesSearch = !searchTerm || nameMatch || descMatch;

        const matchesCategory = !selectedCategory || (item.category_name === selectedCategory);
        const matchesBrand = !selectedBrand || (item.brand_name === selectedBrand);

        return matchesSearch && matchesCategory && matchesBrand;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (sortOrder === 'name_asc') {
            return (a.item_name || '').localeCompare(b.item_name || '');
        } else if (sortOrder === 'name_desc') {
            return (b.item_name || '').localeCompare(a.item_name || '');
        } else if (sortOrder === 'category_asc') {
            return (a.category_name || '').localeCompare(b.category_name || '');
        } else if (sortOrder === 'brand_asc') {
            return (a.brand_name || '').localeCompare(b.brand_name || '');
        }
        return 0;
    });

    // 3. Render
    tbody.innerHTML = '';
    window.productDataStore = {};

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;" class="text-muted">No matching products found.</td></tr>';
        return;
    }

    filtered.forEach(item => {
        window.productDataStore[item.item_id] = item;
        
        let suppliersBadgeList = '<em style="color:#888;">None</em>';
        if (item.supplier_names) {
            const badges = item.supplier_names.split(', ').map(name => 
                `<span class="badge bg-secondary">${name}</span>`
            ).join('');
            suppliersBadgeList = `<div class="supplier-badges-vertical">${badges}</div>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.item_name}</strong></td>
            <td>${item.category_name || 'N/A'}</td>
            <td>${item.brand_name || 'N/A'}</td>
            <td>${suppliersBadgeList}</td>
            <td>${item.unit_name || 'N/A'}</td>
            <td>${item.shelf_name || 'N/A'}</td>
            <td>₱${parseFloat(item.selling_price).toFixed(2)}</td>
            <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
            <td style="white-space: nowrap;">
                <button class="btn btn-primary btn-sm me-1" onclick="openEditModal(${item.item_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${item.item_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditModal(itemId) {
    const item = window.productDataStore[itemId];
    if (!item) return;

    const itemIdEl = document.getElementById('item_id');
    if (itemIdEl) itemIdEl.value = item.item_id;

    document.getElementById('item_name').value = item.item_name;
    document.getElementById('category_id').value = item.category_id;
    document.getElementById('brand_id').value = item.brand_id || '';
    document.getElementById('unit_id').value = item.unit_id;
    document.getElementById('shelf_id').value = item.shelf_id || '';
    document.getElementById('description').value = item.description || '';
    document.getElementById('selling_price').value = item.selling_price;
    document.getElementById('unit_price').value = item.unit_price;
    document.getElementById('minimum_stock').value = item.minimum_stock;
    document.getElementById('maximum_stock').value = item.maximum_stock;

    const supplierSelect = document.getElementById('supplier_ids');
    if (supplierSelect) {
        const selectedIds = item.supplier_ids ? item.supplier_ids.split(',') : [];
        Array.from(supplierSelect.options).forEach(option => {
            option.selected = selectedIds.includes(option.value);
        });
    }

    document.getElementById('modalTitle').innerText = 'Edit Product';
    document.getElementById('saveProductBtn').innerText = 'Update Product';
    document.getElementById('productModal').style.display = 'block';
}

async function deleteProduct(itemId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const formData = new FormData();
    formData.append('item_id', itemId);

    try {
        const response = await fetch('../php/product_master_process.php?action=delete', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            loadProducts();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Failed to delete product:', err);
        alert('Server error occurred while deleting.');
    }
}