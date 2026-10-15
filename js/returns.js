document.addEventListener('DOMContentLoaded', () => {
    loadSources();
    loadReturns();

    const form = document.getElementById('returnForm');
    const alertBox = document.getElementById('formAlert');
    const {close} = setupModal('returnModal', 'openAddModalBtn', () => {
        form.reset();
        alertBox.classList.add('d-none');
        document.getElementById('returnItemsBody').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select a stock-out transaction.</td></tr>';
    });

    document.getElementById('stock_out_id').addEventListener('change', async e => {
        const tbody = document.getElementById('returnItemsBody');
        if (!e.target.value) return;
        const data = await api('../php/returns_process.php?action=get_details&stock_out_id=' + e.target.value);
        tbody.innerHTML = '';
        data.details.forEach(d => {
            const remaining = d.dispatched - d.returned;
            tbody.innerHTML += `<tr><td>${esc(d.item_name)}<input type="hidden" name="item_ids[]" value="${d.item_id}"></td>
                <td>${d.dispatched}</td><td>${remaining}</td>
                <td><input type="number" name="quantities[]" class="form-control" min="0" max="${remaining}" value="0" ${remaining <= 0 ? 'disabled' : ''}></td></tr>`;
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('saveReturnBtn');
        btn.disabled = true; btn.innerText = 'Saving...';
        try {
            const data = await api('../php/returns_process.php?action=create', new FormData(form));
            if (data.success) {
                showAlert(alertBox, 'success', data.message);
                loadSources(); loadReturns();
                setTimeout(close, 1000);
            } else showAlert(alertBox, 'danger', data.message);
        } catch (err) { showAlert(alertBox, 'danger', 'Server error. Failed to save return.'); }
        finally { btn.disabled = false; btn.innerText = 'Save Return'; }
    });
});

async function loadSources() {
    const sel = document.getElementById('stock_out_id');
    const data = await api('../php/returns_process.php?action=get_stock_outs');
    sel.innerHTML = '<option value="">Select Stock-Out Transaction *</option>';
    (data.data || []).forEach(s => {
        sel.innerHTML += `<option value="${s.stock_out_id}">${esc(s.stock_out_no)} - ${esc(s.items || 'no items')} (${esc(s.stock_out_date)})</option>`;
    });
}

async function loadReturns() {
    const tbody = document.getElementById('returnTableBody');
    try {
        const data = await api('../php/returns_process.php?action=list');
        if (!data.success) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#D3453C;">${esc(data.message)}</td></tr>`; return; }
        if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No customer returns yet.</td></tr>'; return; }
        tbody.innerHTML = '';
        data.data.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>RET-${r.return_id}</strong></td><td>${esc(r.return_date)}</td><td>${esc(r.stock_out_no)}</td>
                <td>${esc(r.item_name)}</td><td><span class="adj-plus">+${r.quantity}</span></td>
                <td>${esc(r.user_name || 'N/A')}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#D3453C;">Connection error.</td></tr>'; }
}