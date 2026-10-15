document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

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

async function loadDashboard() {
    const tbody = document.getElementById('inventoryTableBody');
    try {
        const res = await fetch('../php/dashboard_data.php');
        const data = await res.json();

        if (!data.success && data.unauthorized) {
            window.location.href = 'login.html';
            return;
        }
        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#D3453C;">${data.message}</td></tr>`;
            return;
        }

        document.getElementById('userNameDisplay').innerText = data.full_name;
        document.getElementById('totalStockDisplay').innerText = data.stats.total_stock;
        document.getElementById('lowStockDisplay').innerText = data.stats.low_stock_count;
        document.getElementById('categoriesDisplay').innerText = data.stats.active_categories;

        if (data.stats.low_stock_count > 0) {
            document.getElementById('lowStockCard').classList.add('card-blink');
        }

        tbody.innerHTML = '';
        if (data.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No inventory records yet.</td></tr>';
            return;
        }

        data.items.forEach(item => {
            const stock = parseInt(item.in_stock) || 0;
            const min = parseInt(item.minimum_stock) || 0;
            const isLow = min > 0 && stock < min;

            const tr = document.createElement('tr');
            if (isLow) tr.classList.add('row-warning');
            tr.innerHTML = `
                <td><strong>${item.item_name}</strong></td>
                <td>${item.category_name || 'N/A'}</td>
                <td>${stock}</td>
                <td>${isLow
                    ? '<span class="badge-blink">Low Stock</span>'
                    : '<span class="badge badge-success">In Stock</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load dashboard:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#D3453C;">Connection error loading data.</td></tr>';
    }
}