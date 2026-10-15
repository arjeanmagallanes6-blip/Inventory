let poBalances = [];

function peso(n) {
    return '₱' + (parseFloat(n) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener('DOMContentLoaded', () => {
    loadBalances();
    loadPayments();

    const form = document.getElementById('paymentForm');
    const alertBox = document.getElementById('formAlert');
    const {close} = setupModal('paymentModal', 'openAddModalBtn', () => {
        form.reset();
        alertBox.classList.add('d-none');
        document.getElementById('payment_date').value = new Date().toISOString().split('T')[0];
        fillPoSelect();
        document.getElementById('balanceHint').innerText = '';
    });

    document.getElementById('purchase_order_id').addEventListener('change', e => {
        const po = poBalances.find(p => p.purchase_order_id == e.target.value);
        if (po) {
            const bal = po.total_amount - po.paid;
            document.getElementById('balanceHint').innerText = 'Remaining balance: ' + peso(bal);
            document.getElementById('amount').value = bal.toFixed(2);
        }
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('savePaymentBtn');
        btn.disabled = true; btn.innerText = 'Saving...';
        try {
            const data = await api('../php/payments_process.php?action=create', new FormData(form));
            if (data.success) {
                showAlert(alertBox, 'success', data.message);
                loadBalances(); loadPayments();
                setTimeout(close, 900);
            } else showAlert(alertBox, 'danger', data.message);
        } catch (err) { showAlert(alertBox, 'danger', 'Server error. Failed to save payment.'); }
        finally { btn.disabled = false; btn.innerText = 'Save Payment'; }
    });
});

function fillPoSelect() {
    const sel = document.getElementById('purchase_order_id');
    sel.innerHTML = '<option value="">Select Purchase Order *</option>';
    poBalances.filter(p => p.total_amount - p.paid > 0.001).forEach(p => {
        sel.innerHTML += `<option value="${p.purchase_order_id}">${esc(p.purchase_order_number)} - ${esc(p.supplier_name || 'N/A')}</option>`;
    });
}

async function loadBalances() {
    const tbody = document.getElementById('balanceTableBody');
    try {
        const data = await api('../php/payments_process.php?action=balances');
        if (!data.success) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#D3453C;">${esc(data.message)}</td></tr>`; return; }
        poBalances = data.data.map(p => ({...p, total_amount: parseFloat(p.total_amount), paid: parseFloat(p.paid)}));
        if (!poBalances.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No purchase orders yet.</td></tr>'; return; }
        tbody.innerHTML = '';
        poBalances.forEach(p => {
            const bal = p.total_amount - p.paid;
            let badge = '<span class="badge badge-warning">Unpaid</span>';
            if (bal <= 0.001) badge = '<span class="badge badge-success">Paid</span>';
            else if (p.paid > 0) badge = '<span class="badge bg-info text-dark">Partial</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${esc(p.purchase_order_number)}</strong></td><td>${esc(p.supplier_name || 'N/A')}</td>
                <td>${peso(p.total_amount)}</td><td>${peso(p.paid)}</td><td>${peso(bal)}</td><td>${badge}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#D3453C;">Connection error.</td></tr>'; }
}

async function loadPayments() {
    const tbody = document.getElementById('paymentTableBody');
    try {
        const data = await api('../php/payments_process.php?action=list');
        if (!data.success) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#D3453C;">${esc(data.message)}</td></tr>`; return; }
        if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No payments recorded yet.</td></tr>'; return; }
        tbody.innerHTML = '';
        data.data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${esc(p.payment_date)}</td><td><strong>${esc(p.purchase_order_number)}</strong></td>
                <td>${esc(p.supplier_name || 'N/A')}</td><td>${esc(p.payment_method)}</td><td>${peso(p.amount)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deletePayment(${p.payment_id})">Delete</button></td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#D3453C;">Connection error.</td></tr>'; }
}

async function deletePayment(id) {
    if (!confirm('Delete this payment record?')) return;
    const fd = new FormData(); fd.append('payment_id', id);
    const data = await api('../php/payments_process.php?action=delete', fd);
    if (data.success) { loadBalances(); loadPayments(); } else alert(data.message);
}