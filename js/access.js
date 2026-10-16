(async function () {
    // I-hide dayon ang menu aron dili makita ang flicker samtang gina-check pa ang role
    const hideStyle = document.createElement('style');
    hideStyle.id = 'navHideStyle';
    hideStyle.textContent = '.sidebar .nav-list, .sidebar .sidebar-footer { visibility: hidden; }';
    document.head.appendChild(hideStyle);

    const showNav = () => {
        const s = document.getElementById('navHideStyle');
        if (s) s.remove();
    };

    const ALL = ['Admin', 'Manager', 'Staff'];
    const AM  = ['Admin', 'Manager'];

    // Kinsa ang pwede mo-open sa matag page
    const PAGES = {
        'dashboard.html':        ALL,
        'product_master.html':   ALL,
        'purchase_orders.html':  ALL,
        'stock_in.html':         ALL,
        'stock_out.html':        ALL,
        'returns.html':          ALL,
        'stock_adjustment.html': ALL,
        'shelf.html':            AM,
        'supplier.html':         AM,
        'item_supplier.html':    AM,
        'category.html':         AM,
        'brand.html':            AM,
        'units.html':            AM,
        'payments.html':         AM,
        'purchase_returns.html': AM,
        'users.html':            ['Admin']
    };

    // Buttons nga i-hide per page per role (UI lang ni; ang PHP gihapon ang mo-block)
    const HIDE = {
        'product_master.html':  {
            Staff:   ['#openAddModalBtn', '#productTableBody .btn'],
            Manager: ['#productTableBody .btn-danger']
        },
        'purchase_orders.html': {
            Staff:   ['#poTableBody .btn-danger'],
            Manager: ['#poTableBody .btn-danger']
        },
        'supplier.html':        { Manager: ['#supplierTableBody .btn-danger'] },
        'payments.html':        { Manager: ['#paymentTableBody .btn-danger'] },
        'category.html':        { Manager: ['#categoryTableBody .btn-danger'] },
        'brand.html':           { Manager: ['#brandTableBody .btn-danger'] },
        'units.html':           { Manager: ['#unitTableBody .btn-danger'] },
        'shelf.html':           { Manager: ['#shelfTableBody .btn-danger'] },
        'item_supplier.html':   { Manager: ['#junctionTableBody .btn-danger'] },
        'users.html':           { Manager: ['#userTableBody .btn-danger', '#roleTableBody .btn-danger'] }
    };

    const page = location.pathname.split('/').pop();

    // ---------------------------------------------------------------
    // SIDEBAR SCROLL: tipigan ug ibalik ang scroll position human sa reload
    // ---------------------------------------------------------------
    const SCROLL_KEY = 'sidebarScrollTop';

    function restoreSidebarScroll() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        let saved = null;
        try { saved = sessionStorage.getItem(SCROLL_KEY); } catch (e) {}

        if (saved !== null && !isNaN(parseInt(saved, 10))) {
            sidebar.scrollTop = parseInt(saved, 10);
        } else {
            // Wala pay natipigan: i-scroll hangtod makita ang active nga link
            const active = sidebar.querySelector('.nav-link.active');
            if (active) active.scrollIntoView({ block: 'nearest' });
        }

        // Tipigi ang position kada scroll (gi-attach human sa restore aron dili ma-overwrite)
        sidebar.addEventListener('scroll', () => {
            try { sessionStorage.setItem(SCROLL_KEY, String(sidebar.scrollTop)); } catch (e) {}
        });

        // Dugang nga seguro: tipigi sa dili pa mo-lakaw sa laing page
        sidebar.querySelectorAll('a.nav-link').forEach(a => {
            a.addEventListener('click', () => {
                try { sessionStorage.setItem(SCROLL_KEY, String(sidebar.scrollTop)); } catch (e) {}
            });
        });
        window.addEventListener('pagehide', () => {
            try { sessionStorage.setItem(SCROLL_KEY, String(sidebar.scrollTop)); } catch (e) {}
        });
    }

    // ---------------------------------------------------------------
    // HEADER: notification bell + profile (naay role badge)
    // ---------------------------------------------------------------
    function injectHeaderStyles() {
        if (document.getElementById('headerStyles')) return;
        const css = `
            .topbar { position: sticky; top: 0; z-index: 1000; }
            .topbar .user-badge { display: none; }
            .topbar-right { display: flex; align-items: center; gap: 16px; }
            .header-tools { display: flex; align-items: center; gap: 12px; padding-left: 16px; border-left: 1px solid var(--line); }
            .hd-item { position: relative; }

            .hd-icon-btn {
                position: relative; width: 40px; height: 40px; border-radius: 50%;
                border: 1px solid var(--line); background: var(--sky-light);
                font-size: 17px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                padding: 0; transition: background 0.2s ease;
            }
            .hd-icon-btn:hover { background: #dbeafa; }
            .hd-badge {
                position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px;
                background: #DC3545; color: #fff; border-radius: 9px; font-size: 11px; font-weight: 700;
                display: flex; align-items: center; justify-content: center; border: 2px solid #fff;
            }
            .hd-badge[hidden] { display: none; }

            .hd-profile-btn {
                display: flex; align-items: center; gap: 10px; background: transparent; border: none;
                cursor: pointer; padding: 4px 6px; border-radius: 24px; font-family: inherit;
            }
            .hd-profile-btn:hover { background: var(--sky-light); }
            .hd-avatar {
                width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--sky), var(--blue));
                color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            }
            .hd-pinfo { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; text-align: left; }
            .hd-pname { font-size: 13px; font-weight: 600; color: var(--ink); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .hd-caret { font-size: 11px; color: var(--ink-dim); }

            .hd-role { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; margin-top: 2px; }
            .hd-role.role-admin   { background: #FDECEA; color: #B3261E; }
            .hd-role.role-manager { background: #E3F0FB; color: #0B3C6D; }
            .hd-role.role-staff   { background: #E6F4EA; color: #137333; }

            .hd-dropdown {
                display: none; position: absolute; right: 0; top: calc(100% + 10px);
                background: #fff; border: 1px solid var(--line); border-radius: 12px;
                box-shadow: 0 12px 32px rgba(11, 60, 109, 0.18); z-index: 1100;
            }
            .hd-dropdown.open { display: block; }

            .hd-notif-menu { width: 340px; }
            .hd-dd-head {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 14px;
            }
            .hd-link-btn { background: none; border: none; color: var(--blue); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; font-family: inherit; }
            .hd-link-btn:hover { text-decoration: underline; }
            .hd-notif-list { max-height: 360px; overflow-y: auto; }
            .hd-notif-empty { padding: 28px 16px; text-align: center; color: var(--ink-dim); font-size: 13px; }

            .hd-notif-item {
                display: flex; gap: 12px; padding: 12px 16px; text-decoration: none; color: var(--ink);
                border-bottom: 1px solid var(--line); align-items: flex-start;
            }
            .hd-notif-item:last-child { border-bottom: none; }
            .hd-notif-item:hover { background: var(--sky-light); }
            .hd-notif-item.unread { background: #F7FBFF; }
            .hd-notif-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
            .hd-notif-icon.low_stock  { background: #FDECEA; }
            .hd-notif-icon.pending_po { background: #FEF7E0; }
            .hd-notif-icon.unpaid     { background: #E3F0FB; }
            .hd-notif-body { flex: 1; min-width: 0; }
            .hd-notif-title { font-size: 13px; font-weight: 600; line-height: 1.3; }
            .hd-notif-msg { font-size: 12px; color: var(--ink-dim); margin-top: 2px; }
            .hd-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); margin-top: 6px; flex-shrink: 0; }

            .hd-profile-menu { width: 230px; }
            .hd-profile-head { padding: 14px 16px; border-bottom: 1px solid var(--line); }
            .hd-profile-head .hd-pname { max-width: none; font-size: 14px; }
            .hd-menu-btn {
                display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px; background: none;
                border: none; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--ink); font-family: inherit; text-align: left;
                border-radius: 0 0 12px 12px;
            }
            .hd-menu-btn:hover { background: var(--sky-light); }

            @media (max-width: 768px) {
                .hd-pinfo, .hd-caret { display: none; }
                .hd-notif-menu { width: 290px; right: -60px; }
            }
        `;
        const style = document.createElement('style');
        style.id = 'headerStyles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function esc(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function initials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        const first = parts[0][0] || '';
        const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (first + last).toUpperCase();
    }

    function buildHeader(me) {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        injectHeaderStyles();

        // Ang Log out naa na sa profile dropdown, mao nga tangtangon sa sidebar
        const sidebarFooter = document.querySelector('.sidebar-footer');
        if (sidebarFooter) sidebarFooter.remove();

        // Ibalhin ang tanang elements sa topbar (gawas sa page title) ngadto sa usa ka right-side group
        const right = document.createElement('div');
        right.className = 'topbar-right';
        Array.from(topbar.children).slice(1).forEach(el => right.appendChild(el));

        const roleClass = 'role-' + String(me.role).toLowerCase();

        const tools = document.createElement('div');
        tools.className = 'header-tools';
        tools.innerHTML = `
            <div class="hd-item">
                <button type="button" class="hd-icon-btn" id="hdBellBtn" aria-label="Notifications">
                    🔔<span class="hd-badge" id="hdBadge" hidden>0</span>
                </button>
                <div class="hd-dropdown hd-notif-menu" id="hdNotifMenu">
                    <div class="hd-dd-head">
                        <strong>Notifications</strong>
                        <button type="button" class="hd-link-btn" id="hdMarkRead">Mark all as read</button>
                    </div>
                    <div class="hd-notif-list" id="hdNotifList">
                        <div class="hd-notif-empty">Loading...</div>
                    </div>
                </div>
            </div>
            <div class="hd-item">
                <button type="button" class="hd-profile-btn" id="hdProfileBtn" aria-label="Profile">
                    <span class="hd-avatar">${esc(initials(me.name))}</span>
                    <span class="hd-pinfo">
                        <span class="hd-pname">${esc(me.name || 'User')}</span>
                        <span class="hd-role ${roleClass}">${esc(me.role)}</span>
                    </span>
                    <span class="hd-caret">▾</span>
                </button>
                <div class="hd-dropdown hd-profile-menu" id="hdProfileMenu">
                    <div class="hd-profile-head">
                        <div class="hd-pname">${esc(me.name || 'User')}</div>
                        <span class="hd-role ${roleClass}">${esc(me.role)}</span>
                    </div>
                    <button type="button" class="hd-menu-btn" id="hdLogout">🚪 Log out</button>
                </div>
            </div>
        `;
        right.appendChild(tools);
        topbar.appendChild(right);

        // ---- dropdown open/close ----
        const notifMenu   = document.getElementById('hdNotifMenu');
        const profileMenu = document.getElementById('hdProfileMenu');

        const closeAll = () => {
            notifMenu.classList.remove('open');
            profileMenu.classList.remove('open');
        };

        document.getElementById('hdBellBtn').addEventListener('click', e => {
            e.stopPropagation();
            const willOpen = !notifMenu.classList.contains('open');
            closeAll();
            if (willOpen) notifMenu.classList.add('open');
        });

        document.getElementById('hdProfileBtn').addEventListener('click', e => {
            e.stopPropagation();
            const willOpen = !profileMenu.classList.contains('open');
            closeAll();
            if (willOpen) profileMenu.classList.add('open');
        });

        notifMenu.addEventListener('click', e => e.stopPropagation());
        profileMenu.addEventListener('click', e => e.stopPropagation());
        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

        // ---- logout ----
        document.getElementById('hdLogout').addEventListener('click', async () => {
            try {
                const r = await fetch('../php/logout.php');
                const d = await r.json();
                if (d.success) {
                    try { sessionStorage.removeItem(SCROLL_KEY); } catch (e) {}
                    location.href = 'login.html';
                }
            } catch (err) {
                console.error('Logout failed:', err);
            }
        });

        // ---- notifications ----
        const READ_KEY = 'hdReadNotifs_' + (me.name || 'user');
        const readSet = () => {
            try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
            catch (e) { return new Set(); }
        };
        const saveRead = set => {
            try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set))); } catch (e) {}
        };

        const ICONS = { low_stock: '⚠️', pending_po: '📥', unpaid: '💳' };
        let current = [];

        function renderNotifs() {
            const list  = document.getElementById('hdNotifList');
            const badge = document.getElementById('hdBadge');
            const read  = readSet();
            const unread = current.filter(n => !read.has(n.id)).length;

            if (unread > 0) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.hidden = false;
            } else {
                badge.hidden = true;
            }

            if (!current.length) {
                list.innerHTML = '<div class="hd-notif-empty">No notifications. All good! 🎉</div>';
                return;
            }

            list.innerHTML = current.map(n => {
                const isUnread = !read.has(n.id);
                return `
                    <a class="hd-notif-item ${isUnread ? 'unread' : ''}" href="${esc(n.link)}">
                        <span class="hd-notif-icon ${esc(n.type)}">${ICONS[n.type] || '🔔'}</span>
                        <span class="hd-notif-body">
                            <div class="hd-notif-title">${esc(n.title)}</div>
                            <div class="hd-notif-msg">${esc(n.message)}</div>
                        </span>
                        ${isUnread ? '<span class="hd-dot"></span>' : ''}
                    </a>`;
            }).join('');
        }

        async function loadNotifs() {
            try {
                const r = await fetch('../php/notifications.php');
                const d = await r.json();
                if (d.unauthorized) { location.href = 'login.html'; return; }
                if (!d.success) return;
                current = d.data || [];
                renderNotifs();
            } catch (err) {
                console.error('Failed to load notifications:', err);
            }
        }

        document.getElementById('hdMarkRead').addEventListener('click', () => {
            const set = readSet();
            current.forEach(n => set.add(n.id));
            saveRead(set);
            renderNotifs();
        });

        loadNotifs();
        setInterval(loadNotifs, 60000);
    }

    // ---------------------------------------------------------------
    // ACCESS CONTROL
    // ---------------------------------------------------------------
    try {
        const res = await fetch('../php/me.php');
        const me  = await res.json();

        if (!me.success) {
            location.href = 'login.html';
            return;
        }

        const role = me.role;
        document.body.dataset.role = role;

        const allowed = p => (PAGES[p] || []).includes(role);

        // 1. Tangtanga ang sidebar links nga dili pwede
        document.querySelectorAll('.nav-list a.nav-link').forEach(a => {
            const href = a.getAttribute('href');
            if (!allowed(href)) {
                const li = a.closest('li');
                if (li) li.remove();
            }
        });

        // 2. Kung gi-type ang URL sa page nga dili iyaha, i-redirect
        if (PAGES[page] && !allowed(page)) {
            location.href = 'dashboard.html';
            return;
        }

        // 3. I-hide ang buttons per role
        const sels = (HIDE[page] || {})[role];
        if (sels) {
            const style = document.createElement('style');
            style.textContent = sels.join(',') + '{display:none !important;}';
            document.head.appendChild(style);
        }

        // 4. I-butang ang header (notification + profile) ug tangtangon ang Log out sa sidebar
        buildHeader(me);

        // 5. Ibalik ang scroll position sa sidebar (human sa tanang pag-usab sa menu)
        restoreSidebarScroll();
    } catch (e) {
        console.error('Access check failed:', e);
    } finally {
        showNav();
    }
})();