let adjItems = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOptions();
    loadAdjustments();

    const form = document.getElementById('adjForm');
    const alertBox = document.getElementById('formAlert');
    const {close} = setupModal('adjModal', 'openAddModalBtn', () => {
        form.reset();
        alertBox.classList.add('d-none');
        document.getElementById('currentStock').innerText = '-';
        document.getElementById('afterStock').innerText = '-';
    });

    document.getElementById('item_id').addEventListener('change', e => {
        const it = adjItems.find(i => i.item_id == e.target.value);
        if (it) {
            document.getElementById('shelf_id').value = it.shelf_id || '';
            document.getElementById('currentStock').innerText = it.current_stock;
        }
        updateAfter();
    });
    document.getElementById('quantity_adjusted').addEventListener('input', updateAfter);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('saveAdjBtn');
        btn.disabled = true; btn.innerText = 'Saving...';
        try {
            const data = await api('../php/stock_adjustment_process.php?action=create', new FormData(form));
            if (data.success) {
                showAlert(alertBox, 'success', data.message);
                loadOptions(); loadAdjustments();
                setTimeout(close, 1000);
            } else showAlert(alertBox, 'danger', data.message);
        } catch (err) { showAlert(alertBox, 'danger', 'Server error. Failed to save adjustment.'); }
        finally { btn.disabled = false; btn.innerText = 'Save Adjustment'; }
    });
});

function updateAfter() {
    const it = adjItems.find(i => i.item_id == document.getElementById('item_id').value);
    const adj = parseInt(document.getElementById('quantity_adjusted').value) || 0;
    const el = document.getElementById('afterStock');
    if (!it) { el.innerText = '-'; return; }
    const after = parseInt(it.current_stock) + adj;
    el.innerText = after;
    el.classList.toggle('negative', after < 0);
}

async function loadOptions() {
    const data = await api('../php/stock_adjustment_process.php?action=get_options');
    if (!data.success) return;
    adjItems = data.items;
    const itemSel = document.getElementById('item_id');
    itemSel.innerHTML = '<option value="">Select Item *</option>';
    data.items.forEach(i => itemSel.innerHTML += `<option value="${i.item_id}">${esc(i.item_name)}</option>`);
    const shelfSel = document.getElementById('shelf_id');
    shelfSel.innerHTML = '<option value="">No shelf</option>';
    data.shelves.forEach(s => shelfSel.innerHTML += `<option value="${s.shelf_id}">${esc(s.shelf_name)}</option>`);
}

async function loadAdjustments() {
    const tbody = document.getElementById('adjTableBody');
    try {
        const data = await api('../php/stock_adjustment_process.php?action=list');
        if (!data.success) { tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#D3453C;">${esc(data.message)}</td></tr>`; return; }
        if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No stock adjustments yet.</td></tr>'; return; }
        tbody.innerHTML = '';
        data.data.forEach(r => {
            const adj = parseInt(r.quantity_adjusted);
            const badge = adj > 0 ? `<span class="adj-plus">+${adj}</span>` : `<span class="adj-minus">${adj}</span>`;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${esc(r.adjustment_no)}</strong></td><td>${esc(r.item_name)}</td><td>${esc(r.shelf_name || 'N/A')}</td>
                <td>${r.quantity_before}</td><td>${badge}</td><td>${r.quantity_after}</td>
                <td>${esc(r.user_name || 'N/A')}</td><td>${esc(r.adjustment_date)}</td><td>${esc(r.remarks || '')}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#D3453C;">Connection error.</td></tr>'; }
}