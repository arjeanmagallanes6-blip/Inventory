window.userStore = {};

document.addEventListener('DOMContentLoaded', () => {
    loadRoleOptions();
    loadUsers();
    loadRoles();

    const form = document.getElementById('userForm');
    const alertBox = document.getElementById('formAlert');
    const {close} = setupModal('userModal', 'openAddModalBtn', () => {
        form.reset();
        document.getElementById('user_id').value = '';
        document.getElementById('modalTitle').innerText = 'Add New User';
        document.getElementById('pwHint').innerText = 'Required (min. 6 characters)';
        alertBox.classList.add('d-none');
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('user_id').value;
        const btn = document.getElementById('saveUserBtn');
        btn.disabled = true; btn.innerText = 'Saving...';
        try {
            const data = await api(`../php/users_process.php?action=${id ? 'update' : 'create'}`, new FormData(form));
            if (data.success) {
                showAlert(alertBox, 'success', data.message);
                loadUsers(); loadRoles();
                setTimeout(close, 900);
            } else showAlert(alertBox, 'danger', data.message);
        } catch (err) { showAlert(alertBox, 'danger', 'Server error. Failed to save user.'); }
        finally { btn.disabled = false; btn.innerText = 'Save User'; }
    });

    document.getElementById('addRoleBtn').addEventListener('click', async () => {
        const name = prompt('New role name:');
        if (!name) return;
        const fd = new FormData(); fd.append('role_name', name);
        const data = await api('../php/users_process.php?action=role_create', fd);
        if (data.success) { loadRoles(); loadRoleOptions(); } else alert(data.message);
    });
});

async function loadRoleOptions() {
    const data = await api('../php/users_process.php?action=roles_list');
    const sel = document.getElementById('role_id');
    if (!data.success) return;
    sel.innerHTML = '<option value="">Select Role *</option>';
    data.data.forEach(r => sel.innerHTML += `<option value="${r.role_id}">${esc(r.role_name)}</option>`);
}

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    try {
        const data = await api('../php/users_process.php?action=list');
        if (!data.success) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#D3453C;">${esc(data.message)}</td></tr>`; return; }
        window.userStore = {};
        tbody.innerHTML = '';
        data.data.forEach(u => {
            window.userStore[u.user_id] = u;
            const badge = u.status === 'Active' ? 'badge-success' : 'badge-warning';
            const self = u.user_id == data.current_user_id;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${esc(u.first_name)} ${esc(u.last_name)}</strong></td><td>${esc(u.username)}</td><td>${esc(u.email)}</td>
                <td>${esc(u.role_name)}</td><td><span class="badge ${badge}">${esc(u.status)}</span></td>
                <td><button class="btn btn-primary btn-sm me-1" onclick="editUser(${u.user_id})">Edit</button>
                    ${self ? '' : `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.user_id})">Delete</button>`}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#D3453C;">Connection error.</td></tr>'; }
}

function editUser(id) {
    const u = window.userStore[id]; if (!u) return;
    document.getElementById('user_id').value = u.user_id;
    ['first_name', 'last_name', 'email', 'username', 'role_id', 'status'].forEach(f => document.getElementById(f).value = u[f]);
    document.getElementById('password').value = '';
    document.getElementById('pwHint').innerText = 'Leave blank to keep the current password';
    document.getElementById('modalTitle').innerText = 'Edit User';
    document.getElementById('formAlert').classList.add('d-none');
    document.getElementById('userModal').style.display = 'block';
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    const fd = new FormData(); fd.append('user_id', id);
    const data = await api('../php/users_process.php?action=delete', fd);
    if (data.success) loadUsers(); else alert(data.message);
}

async function loadRoles() {
    const tbody = document.getElementById('roleTableBody');
    const data = await api('../php/users_process.php?action=roles_list');
    if (!data.success) { tbody.innerHTML = ''; return; }
    tbody.innerHTML = '';
    data.data.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${esc(r.role_name)}</td><td><span class="badge badge-success">${r.total_users} user(s)</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteRole(${r.role_id})">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

async function deleteRole(id) {
    if (!confirm('Delete this role?')) return;
    const fd = new FormData(); fd.append('role_id', id);
    const data = await api('../php/users_process.php?action=role_delete', fd);
    if (data.success) { loadRoles(); loadRoleOptions(); } else alert(data.message);
}