function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function showAlert(box, type, msg) {
    if (!box) return;
    box.className = `alert alert-${type} py-2`;
    box.innerText = msg;
    box.classList.remove('d-none');
}
function setupModal(modalId, openBtnId, onOpen) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const close = () => modal.style.display = 'none';
    if (openBtn) openBtn.addEventListener('click', () => { if (onOpen) onOpen(); modal.style.display = 'block'; });
    document.getElementById('closeModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelModalBtn')?.addEventListener('click', close);
    window.addEventListener('click', e => { if (e.target === modal) close(); });
    return {modal, close};
}
async function api(url, formData) {
    const res = await fetch(url, formData ? {method: 'POST', body: formData} : undefined);
    const data = await res.json();
    if (data.unauthorized) { window.location.href = 'login.html'; throw new Error('unauthorized'); }
    return data;
}
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async e => {
            e.preventDefault();
            try {
                const data = await (await fetch('../php/logout.php')).json();
                if (data.success) window.location.href = 'login.html';
            } catch (err) { console.error('Logout failed:', err); }
        });
    }
});