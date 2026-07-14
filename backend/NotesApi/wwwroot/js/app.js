import { state, drawingState } from './state.js';
import { toast, dismissToast } from './util.js';
import { initTheme, updateThemeIcon, toggleTheme, applyTheme, resetToSystemTheme } from './theme.js';
import { exportAsCSV, exportAsPDF, exportNoteAsPDF, exportNoteAsCSV } from './exporting.js';

    // Landing page redirect logic
    if (!localStorage.getItem('token') && !localStorage.getItem('jotit_visited')) {
      window.location.href = 'landing.html';
    }
    localStorage.setItem('jotit_visited', '1');

    const API_URL = "/api";


    function getCategoryColor(note) {
        const cat = (note.category || 'General').toLowerCase();
        if (cat === 'personal') return '#818CF8';
        if (cat === 'work')     return '#4ADE80';
        if (cat === 'ideas')    return '#C084FC';
        return '#888888';
    }

    function getCategoryInfo(note) {
        const cat = (note.category || 'General').toLowerCase();
        if (cat === 'personal') return { color: '#6C8EF5', name: 'Personal', cls: 'cat-personal' };
        if (cat === 'work')     return { color: '#3DD68C', name: 'Work',     cls: 'cat-work' };
        if (cat === 'ideas')    return { color: '#F5A623', name: 'Ideas',    cls: 'cat-ideas' };
        return { color: '#7B7B8F', name: note.category || 'General', cls: 'cat-general' };
    }

    function updateNoteCount(total) {
        const el = document.getElementById('note-count-display');
        if (el) el.textContent = `${total} note${total !== 1 ? 's' : ''}`;
    }

    function navTo(action) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const searchBar = document.getElementById('search-bar');
        const aboutPage = document.getElementById('about-page');
        const notesArea = document.querySelector('.notes-area');
        if (action === 'about') {
            state.previousPage = state.currentPage || 'home';
            document.getElementById('nav-about-desktop').classList.add('active');
            if (searchBar) { searchBar.style.display = 'none'; searchBar.classList.remove('show-on-search'); }
            if (aboutPage) aboutPage.style.display = 'block';
            if (notesArea) notesArea.style.display = 'none';
            return;
        }
        // Always reset about page and restore notes area
        if (aboutPage) aboutPage.style.display = 'none';
        if (notesArea) notesArea.style.display = '';
        state.recentOnly = false;
        if (action === 'home') {
            if (searchBar) { searchBar.style.display = 'none'; searchBar.classList.remove('show-on-search'); searchBar.classList.remove('hidden'); }
            document.getElementById('nav-home').classList.add('active');
            filterCat('all', document.querySelector('.filter-tab[data-cat=all]'));
        } else if (action === 'categories') {
            document.getElementById('nav-categories').classList.add('active');
            openFilterMenu();
        } else if (action === 'search') {
            document.getElementById('nav-search').classList.add('active');
            toggleSearch();
        }
    }

    let pendingUploadFile = null;
    let lastScannedImageData = null;
    let scanDrawOnly = false;
    let lastScanResult = null;
    let pendingConfirmAction = null;
    let currentOcrWords = [];
    let currentScanStep = 'input';
    let selectedNoteColor = '';
    let currentNoteId = null;

    document.getElementById('color-swatches')?.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch) return;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        selectedNoteColor = swatch.dataset.color || '';
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('user-menu');
        if (menu && !menu.classList.contains('hidden')) {
            const wrap = document.querySelector('.avatar-wrap');
            if (wrap && !wrap.contains(e.target)) {
                menu.classList.add('hidden');
            }
        }
    });


    document.addEventListener('DOMContentLoaded', () => {
        if (state.token) {
            showPage('dashboard-page');
            updateUI();
            fetchNotes();
            initPullToRefresh();
            initFabLongPress();
            initMobileHints();
            initModalKeyboardBehavior();
        } else {
            showPage('auth-page');
        }

        const richEditor = document.getElementById('note-content-editor');
        if (richEditor) {
            richEditor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        }
    });

    function showPage(page) {
        // Auth / dashboard app-level page switching
        if (page.endsWith('-page')) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(page).classList.add('active');
            return;
        }
        // Mobile tab navigation
        document.querySelectorAll('.mobile-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
        const searchBar = document.getElementById('search-bar') ||
                          document.getElementById('search-input')?.closest('.search-bar-panel') ||
                          document.querySelector('.search-bar-container') ||
                          document.querySelector('.search-wrapper');
        console.log('Search bar element:', searchBar);
        const aboutPage = document.getElementById('about-page');
        const notesArea = document.querySelector('.notes-area') ||
                          document.querySelector('.main-content') ||
                          document.querySelector('.notes-container');
        if (page === 'about') {
            state.previousPage = state.currentPage || 'home';
            if (searchBar) { searchBar.style.display = 'none'; searchBar.classList.remove('show-on-search'); }
            if (aboutPage) aboutPage.style.display = 'block';
            if (notesArea) notesArea.style.display = 'none';
        } else {
            // Always reset about page and restore notes area first
            if (aboutPage) aboutPage.style.display = 'none';
            if (notesArea) notesArea.style.display = '';
            const _grid = document.querySelector('.notes-grid');
            if (_grid) {
                _grid.style.animation = 'none';
                requestAnimationFrame(() => {
                    _grid.style.animation = 'pageFadeIn 0.3s ease forwards';
                });
            }
            if (page === 'home') {
                if (searchBar) {
                    searchBar.style.display = 'none';
                    searchBar.classList.remove('show-on-search');
                    searchBar.classList.remove('hidden');
                }
                state.recentOnly = false;
                state.currentPage = 'home';
                renderNotes();
            } else if (page === 'search') {
                if (searchBar) {
                    searchBar.style.display = 'block';
                    searchBar.style.visibility = 'visible';
                    searchBar.style.opacity = '1';
                    searchBar.classList.add('show-on-search');
                    searchBar.classList.remove('hidden');
                }
                state.recentOnly = false;
                state.currentPage = 'search';
                renderNotes();
                setTimeout(() => document.getElementById('search-input')?.focus(), 50);
            }
        }
    }

    function toggleAuth(mode) {
        const loginForm = document.getElementById('login-form');
        const regForm   = document.getElementById('register-form');
        const tabLogin  = document.getElementById('tab-login');
        const tabReg    = document.getElementById('tab-register');
        if (mode === 'login') {
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
            tabLogin.classList.add('active');
            tabReg.classList.remove('active');
        } else {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            tabReg.classList.add('active');
            tabLogin.classList.remove('active');
        }
    }

    async function api(endpoint, method = 'GET', body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` }
        };
        if (body) opts.body = JSON.stringify(body);
        try {
            const res = await fetch(API_URL + endpoint, opts);
            if (res.status === 401) logout();
            if (res.status === 204) return { success: true };
            const text = await res.text();
            if (!res.ok) return null;
            return text ? JSON.parse(text) : { success: true };
        } catch (e) { return null; }
    }

    function setButtonLoading(btn, isLoading, loadingText = 'Loading...') {
        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = `<span class="spinner-inline" aria-hidden="true"></span> ${loadingText}`;
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
            btn.disabled = false;
        }
    }

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function handleLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        setButtonLoading(btn, true, 'Signing in...');
        let hashedPassword;
        try {
            hashedPassword = await sha256(password);
        } catch {
            setButtonLoading(btn, false);
            toast('Secure hashing unavailable. Please use HTTPS.', 'error');
            return;
        }
        try {
            const res = await fetch(API_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: hashedPassword })
            });
            const data = await res.json().catch(() => null);
            setButtonLoading(btn, false);
            if (res.ok && data && data.token) {
                state.token = data.token;
                state.name = data.name || 'User';
                state.email = email;
                localStorage.setItem('token', data.token);
                localStorage.setItem('name', state.name);
                localStorage.setItem('email', email);
                showPage('dashboard-page');
                updateUI();
                fetchNotes();
                toast('Welcome back!', 'success');
            } else {
                toast('Hmm, that didn\'t work. Double-check your details.', 'error');
            }
        } catch (err) {
            setButtonLoading(btn, false);
            toast('Unable to reach the server. Please check your connection.', 'error');
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const errEl = document.getElementById('reg-error');
        const btn   = document.getElementById('register-btn');
        errEl.classList.add('hidden');
        const name     = document.getElementById('reg-name').value;
        const email    = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;
        setButtonLoading(btn, true, 'Creating account...');
        let hashedPassword;
        try {
            hashedPassword = await sha256(password);
        } catch {
            setButtonLoading(btn, false);
            errEl.textContent = 'Secure hashing unavailable. Please use HTTPS.';
            errEl.classList.remove('hidden');
            return;
        }
        try {
            const res = await fetch(API_URL + '/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password: hashedPassword })
            });
            const data = await res.json().catch(() => null);
            setButtonLoading(btn, false);
            if (res.ok) {
                toast('You\'re all set! Go ahead and sign in.', 'success');
                toggleAuth('login');
            } else {
                errEl.textContent = (data && data.error) ? data.error : 'Registration failed. Please try again.';
                errEl.classList.remove('hidden');
            }
        } catch (err) {
            setButtonLoading(btn, false);
            errEl.textContent = 'Unable to reach the server. Please check your connection.';
            errEl.classList.remove('hidden');
        }
    }

    function updateUI() {
        document.getElementById('user-display').textContent = state.name || 'User';
        const initial = (state.name || 'U').charAt(0).toUpperCase();
        document.getElementById('user-avatar').textContent = initial;
        document.getElementById('menu-avatar-txt').textContent = initial;
        document.getElementById('menu-name').textContent = state.name || 'User';
        document.getElementById('menu-email').textContent = state.email || '';
    }

    function toggleUserMenu() {
        const menu = document.getElementById('user-menu');
        menu.classList.toggle('hidden');
    }

    function menuAction(action) {
        document.getElementById('user-menu').classList.add('hidden');
        if (action === 'settings') openSettingsModal();
        else if (action === 'language') toast('Language selection coming soon!', 'info');
        else if (action === 'help') openHelpModal();
        else if (action === 'learn') openLearnModal();
    }

    async function openSettingsModal() {
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const settingsBtn = document.querySelector('[data-page="settings"]') || document.getElementById('nav-settings');
        if (settingsBtn) settingsBtn.classList.add('active');
        const modal = document.getElementById('settings-modal');
        document.getElementById('settings-name').value = state.name || '';
        document.getElementById('settings-email').value = state.email || '';
        const themeSelect = modal.querySelector('select');
        themeSelect.value = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        modal.classList.add('open');
        try {
            const res = await api('/auth/me');
            if (res.ok) {
                const user = await res.json();
                state.name = user.name || state.name;
                state.email = user.email || state.email;
                localStorage.setItem('name', state.name);
                localStorage.setItem('email', state.email);
                document.getElementById('settings-name').value = state.name;
                document.getElementById('settings-email').value = state.email;
            }
        } catch (e) { /* use cached state */ }
        try {
            const stats = await api('/ocr/stats');
            if (stats) {
                document.getElementById('stat-total').textContent = stats.total;
                document.getElementById('stat-accuracy').textContent = stats.total > 0 ? stats.accuracyRate + '%' : 'No data';
                document.getElementById('stat-confidence').textContent = stats.total > 0 ? stats.avgConfidence + '%' : 'No data';
            }
        } catch (e) { /* stats unavailable */ }
    }

    function closeSettingsModal(e) {
        if (e && e.target !== document.getElementById('settings-modal')) return;
        document.getElementById('settings-modal').classList.remove('open');
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const homeBtn = document.querySelector('[data-page="home"]') || document.getElementById('nav-home');
        if (homeBtn) homeBtn.classList.add('active');
    }

    function openHelpModal() {
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        document.querySelectorAll('.help-desktop-only').forEach(el => { el.style.display = isTouch ? 'none' : 'block'; });
        document.querySelectorAll('.help-touch-only').forEach(el => { el.style.display = isTouch ? 'block' : 'none'; });
        const badge = document.getElementById('help-device-badge');
        if (badge) badge.textContent = isTouch ? 'Mobile & Tablet' : 'Desktop';
        document.getElementById('help-modal').classList.add('open');
    }

    function closeHelpModal(e) {
        if (e && e.target !== document.getElementById('help-modal')) return;
        document.getElementById('help-modal').classList.remove('open');
    }

    function openLearnModal() {
        document.getElementById('learn-modal').classList.add('open');
    }

    function closeLearnModal(e) {
        if (e && e.target !== document.getElementById('learn-modal')) return;
        document.getElementById('learn-modal').classList.remove('open');
    }


    function execCmd(command, value = null) {
        document.getElementById('note-content-editor').focus();
        document.execCommand(command, false, value);
        updateToolbarState();
    }

    function updateToolbarState() {
        const commands = ['bold', 'italic', 'underline'];
        commands.forEach(cmd => {
            const btn = document.querySelector(`.rich-btn[onclick="execCmd('${cmd}')"]`);
            if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }

    function openFilterMenu() {
        const cats = ['all', 'personal', 'work', 'ideas'];
        const labels = { all: 'All Notes', personal: 'Personal', work: 'Work', ideas: 'Ideas' };
        const current = state.category;
        const next = cats[(cats.indexOf(current) + 1) % cats.length];
        filterCat(next, document.querySelector(`.filter-tab[data-cat=${next}]`));
        toast('Filter: ' + labels[next], 'info');
    }

    function logout() {
        document.getElementById('user-menu').classList.add('hidden');
        localStorage.clear();
        location.reload();
    }

    function toggleSearch() {
        const bar = document.getElementById('search-bar');
        const isHidden = bar.style.display === 'none' || bar.classList.contains('hidden');
        if (isHidden) {
            bar.style.display = 'block';
            bar.style.visibility = 'visible';
            bar.style.opacity = '1';
            bar.classList.remove('hidden');
            bar.classList.add('show-on-search');
            setTimeout(() => document.getElementById('search-input').focus(), 50);
        } else {
            bar.style.display = 'none';
            bar.classList.remove('show-on-search');
            clearSearch();
        }
    }

    function toggleSidebar() { /* no sidebar in new design */ }

    async function fetchNotes() {
        showSkeletonLoaders();
        const grid = document.getElementById('notes-grid');
        const res = await api('/notes?page=1&pageSize=100');
        if (res) {
            state.notes = applyCustomOrder(res.data || []);
            updateNoteCount(state.notes.length);
            renderNotes();
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                    <div class="empty-title">Something went wrong</div>
                    <p class="empty-desc">We couldn't load your notes. Check your connection and give it another shot!</p>
                    <button onclick="fetchNotes()" class="btn-cta btn">
                        <i class="fa-solid fa-rotate-right"></i> Try Again
                    </button>
                </div>`;
        }
    }

    function showSkeletonLoaders(count = 6) {
        const grid = document.querySelector('.notes-grid');
        if (!grid) return;
        renderSkeletonLoaders(grid, count);
    }

    function triggerConfetti() {
        const colors = ['#5B6EF5', '#4ADE80', '#F59E0B', '#C084FC', '#F87171'];
        const container = document.body;
        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.cssText = `
                left: ${Math.random() * 100}vw;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                animation-delay: ${Math.random() * 0.5}s;
                animation-duration: ${0.8 + Math.random() * 0.8}s;
                width: ${4 + Math.random() * 6}px;
                height: ${4 + Math.random() * 6}px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            `;
            container.appendChild(piece);
            setTimeout(() => piece.remove(), 2000);
        }
    }

    function renderSkeletonLoaders(grid) {
        grid.innerHTML = Array(6).fill(0).map((_, i) => `
            <div class="skeleton-card" role="status" aria-label="Loading note" style="animation-delay:${i*0.04}s">
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                    <div class="skeleton-line" style="width:65%;height:18px;"></div>
                    <div style="flex:1"></div>
                    <div class="skeleton-line" style="width:22px;height:22px;border-radius:50%;margin-bottom:0;"></div>
                </div>
                <div class="skeleton-line" style="width:100%;height:13px;"></div>
                <div class="skeleton-line" style="width:88%;height:13px;"></div>
                <div class="skeleton-line" style="width:60%;height:13px;margin-bottom:0;"></div>
                <div style="display:flex;justify-content:space-between;margin-top:10px;align-items:center;">
                    <div class="skeleton-line" style="width:60px;height:12px;margin-bottom:0;"></div>
                    <div class="skeleton-line" style="width:48px;height:20px;border-radius:50px;margin-bottom:0;"></div>
                </div>
            </div>`).join('');
    }

    function renderNotes() {
        _selNoteIdx = -1;
        const grid = document.getElementById('notes-grid');
        grid.innerHTML = '';

        let filtered = state.notes;
        if (state.recentOnly) {
            const ago = new Date();
            ago.setDate(ago.getDate() - 7);
            filtered = filtered.filter(n => new Date(n.updatedAt) >= ago);
        } else if (state.category !== 'all') {
            filtered = filtered.filter(n => (n.category || 'General').toLowerCase() === state.category.toLowerCase());
        }

        const q = document.querySelector('.search-input')?.value?.toLowerCase() || '';
        if (q) {
            filtered = filtered.filter(n =>
                (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
            );
        }

        const countBadge = document.getElementById('notes-count-badge');
        if (filtered.length > 0) {
            countBadge.textContent = filtered.length;
            countBadge.classList.remove('hidden');
        } else {
            countBadge.classList.add('hidden');
        }

        if (filtered.length === 0) {
            const isFirstVisit = state.notes.length === 0 && !localStorage.getItem('hasSeenWelcome');
            if (isFirstVisit) localStorage.setItem('hasSeenWelcome', '1');

            if (isFirstVisit) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><svg width="90" height="90" viewBox="0 0 100 100" fill="none"><rect x="18" y="12" width="52" height="66" rx="4" stroke="#5B6EF5" stroke-width="2.5"/><line x1="28" y1="28" x2="62" y2="28" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="40" x2="62" y2="40" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="52" x2="48" y2="52" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="58" y1="62" x2="72" y2="76" stroke="#5B6EF5" stroke-width="3" stroke-linecap="round"/><circle cx="74" cy="78" r="3" fill="#5B6EF5"/></svg></div>
                        <div class="empty-title">Welcome to Jot It!</div>
                        <p class="empty-desc">Your canvas is blank. Jot down ideas, scan handwritten notes, or just capture what's on your mind.</p>
                        <button onclick="openModal()" class="btn-cta btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Start Writing</button>
                    </div>`;
            } else if (state.category !== 'all') {
                const catIcons = {
                    personal: '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                    work: '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
                    ideas: '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><path d="M12 6a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 5.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.5C7.5 16.5 6 14.5 6 12a6 6 0 0 1 6-6z"/><line x1="10" y1="21" x2="14" y2="21"/></svg>'
                };
                const catIcon = catIcons[state.category] || '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">${catIcon}</div>
                        <div class="empty-title">Nothing here yet</div>
                        <p class="empty-desc">Add a note tagged with <strong>#${state.category}</strong> and it'll appear here.</p>
                        <button onclick="openModal()" class="btn-cta btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> New Note</button>
                    </div>`;
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><svg width="90" height="90" viewBox="0 0 100 100" fill="none"><rect x="18" y="12" width="52" height="66" rx="4" stroke="#5B6EF5" stroke-width="2.5"/><line x1="28" y1="28" x2="62" y2="28" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="40" x2="62" y2="40" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="52" x2="48" y2="52" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/><line x1="58" y1="62" x2="72" y2="76" stroke="#5B6EF5" stroke-width="3" stroke-linecap="round"/><circle cx="74" cy="78" r="3" fill="#5B6EF5"/></svg></div>
                        <div class="empty-title">Ready when you are!</div>
                        <p class="empty-desc">No notes yet — every great idea starts somewhere. What's on your mind?</p>
                        <button onclick="openModal()" class="btn-cta btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Start Writing</button>
                    </div>`;
            }
            return;
        }

        const _savedOrder = localStorage.getItem('jotit-note-order');
        if (_savedOrder) {
            try {
                const _orderMap = {};
                JSON.parse(_savedOrder).forEach((id, i) => _orderMap[id] = i);
                filtered.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return (_orderMap[a.id] ?? 999) - (_orderMap[b.id] ?? 999);
                });
            } catch {
                filtered.sort((a, b) => {
                    if (!!b.isPinned !== !!a.isPinned) return b.isPinned ? 1 : -1;
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
            }
        } else {
            filtered.sort((a, b) => {
                if (!!b.isPinned !== !!a.isPinned) return b.isPinned ? 1 : -1;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
        }

        updateNoteCount(state.notes.length);

        const pinned = filtered.filter(n => n.isPinned);
        const unpinned = filtered.filter(n => !n.isPinned);
        const hasBoth = pinned.length > 0 && unpinned.length > 0;

        if (pinned.length > 0) {
            const label = document.createElement('div');
            label.className = 'pinned-label';
            label.style.gridColumn = '1 / -1';
            label.textContent = 'Pinned';
            grid.appendChild(label);
        }

        filtered.forEach((note, i) => {
            if (hasBoth && !note.isPinned && pinned.length > 0) {
                const prevNote = filtered[i - 1];
                if (prevNote && prevNote.isPinned) {
                    const divider = document.createElement('hr');
                    divider.className = 'pin-divider';
                    divider.style.gridColumn = '1 / -1';
                    grid.appendChild(divider);
                }
            }

            const el = document.createElement('div');
            el.className = 'note-card draggable' + (note.isPinned ? ' is-pinned' : '');
            el.setAttribute('role', 'listitem');
            el.setAttribute('draggable', 'true');
            el.dataset.id = note.id;
            el.dataset.noteId = note.id;

            const catInfo = getCategoryInfo(note);
            const preview = note.summary ||
                (note.content || '').replace(/<[^>]*>/g, '').slice(0, 120);
            const previewText = preview;
            const dateStr = relativeTime(note.updatedAt);

            if (note.color) {
                el.style.borderLeft = `3px solid ${note.color}`;
                el.style.background = note.color + '14';
            } else {
                el.style.borderLeft = `3px solid ${catInfo.color}`;
            }

            const tagList = (note.tags || '').split(',').filter(t => t.startsWith('#'));
            const tagHtml = tagList.slice(0, 3).map(t => `<span class="hashtag-pill">${esc(t)}</span>`).join('');

            el.innerHTML = `
                <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="note-card-content">
                    <h3 class="note-card-title">${note.color ? `<span class="note-color-dot" style="background:${note.color}"></span>` : ''}${esc(note.title)}</h3>
                    <p class="note-card-preview">${esc(previewText)}</p>
                    ${tagHtml ? `<div class="hashtag-pills">${tagHtml}</div>` : ''}
                </div>
                <div class="note-card-footer">
                    <div class="note-card-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        <span>${dateStr}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;"><span class="note-card-category ${catInfo.cls}">${catInfo.name}</span></div>
                </div>
                <div class="card-export-menu" id="export-${note.id}">
                    <button class="card-export-btn pin-btn${note.isPinned ? ' pinned' : ''}" onclick="togglePin(event, '${note.id}')" aria-label="${note.isPinned ? 'Unpin note' : 'Pin note'}" title="${note.isPinned ? 'Unpin' : 'Pin'}">
                        <i class="fa-solid fa-thumbtack"></i>
                    </button>
                    <button class="card-export-btn" onclick="exportNoteAsPDF('${note.id}')" title="Export as PDF">
                        <i class="fa-solid fa-file-pdf"></i>
                    </button>
                    <button class="card-export-btn" onclick="exportNoteAsCSV('${note.id}')" title="Export as CSV">
                        <i class="fa-solid fa-file-csv"></i>
                    </button>
                    <button class="card-export-btn card-delete-btn" onclick="deleteNote(event, '${note.id}')" aria-label="Delete note" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>`;

            el.onclick = (e) => {
                if (!e.target.closest('button')) openModal(note);
            };
            grid.appendChild(el);
            initCardGestures(el, note);
        });
        initDragAndDrop();
    }

    function initDragAndDrop() {
        const cards = document.querySelectorAll('.note-card.draggable');
        let dragSrcId = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const src = e.target.closest('.note-card');
                if (src) dragSrcId = src.dataset.noteId;
                setTimeout(() => card.classList.add('dragging'), 0);
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.note-card').forEach(c => {
                    c.classList.remove('drag-over');
                });
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                const target = e.target.closest('.note-card');
                if (target) {
                    document.querySelectorAll('.note-card').forEach(c => c.classList.remove('drag-over'));
                    target.classList.add('drag-over');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.note-card').forEach(c => c.classList.remove('drag-over'));
                const target = e.target.closest('.note-card');
                if (!target) return;
                const targetId = target.dataset.noteId;
                if (dragSrcId && dragSrcId !== targetId) {
                    reorderNotes(dragSrcId, targetId);
                }
            });
        });
    }

    function reorderNotes(srcId, targetId) {
        const notes = [...state.notes];
        const srcIndex = notes.findIndex(n => n.id === srcId);
        const targetIndex = notes.findIndex(n => n.id === targetId);

        if (srcIndex === -1 || targetIndex === -1) return;

        const [removed] = notes.splice(srcIndex, 1);
        notes.splice(targetIndex, 0, removed);

        state.notes = notes;

        const order = notes.map(n => n.id);
        localStorage.setItem('jotit-note-order', JSON.stringify(order));

        renderNotes();
    }

    function applyCustomOrder(notes) {
        const savedOrder = localStorage.getItem('jotit-note-order');
        if (!savedOrder) return notes;
        try {
            const order = JSON.parse(savedOrder);
            const orderMap = {};
            order.forEach((id, i) => orderMap[id] = i);
            return [...notes].sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                const ai = orderMap[a.id] ?? 999;
                const bi = orderMap[b.id] ?? 999;
                return ai - bi;
            });
        } catch {
            return notes;
        }
    }

    function resetNoteOrder() {
        localStorage.removeItem('jotit-note-order');
        fetchNotes();
        showToast('Note order reset');
    }

    function filterCat(cat, btn) {
        state.category = cat;
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active');
            b.removeAttribute('aria-selected');
            b.setAttribute('aria-selected', 'false');
        });
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        }
        const titles = { all: 'Notes', personal: 'Personal', work: 'Work', ideas: 'Ideas' };
        document.getElementById('view-title').textContent = titles[cat] || 'Notes';
        clearSearch();
        renderNotes();
        toggleSidebar();
    }

    function filterNotes(q) {
        const lower = q.toLowerCase().trim();
        const grid = document.getElementById('notes-grid');
        const cards = document.querySelectorAll('.note-card');
        let visibleCount = 0;

        cards.forEach(c => {
            let visible;
            if (lower.startsWith('#')) {
                const noteId = c.dataset.noteId;
                const note = state.notes.find(n => n.id === noteId);
                visible = note ? (note.tags || '').toLowerCase().includes(lower) : false;
            } else {
                visible = c.innerText.toLowerCase().includes(lower);
            }
            c.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });

        const existingMsg = grid.querySelector('[data-search-empty]');
        if (existingMsg) existingMsg.remove();

        const countEl = document.getElementById('search-count');
        if (lower) {
            countEl.textContent = `${visibleCount} result${visibleCount !== 1 ? 's' : ''}`;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }

        if (lower && visibleCount === 0 && cards.length > 0) {
            const msg = document.createElement('div');
            msg.setAttribute('data-search-empty', '1');
            msg.className = 'empty-state';
            msg.innerHTML = `
                <div class="empty-state-icon"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <div class="empty-title">No results found</div>
                <p class="empty-desc">Couldn't find anything for &ldquo;${esc(q)}&rdquo;. Try a different search?</p>`;
            grid.appendChild(msg);
        }
    }

    function updateSearchClear(val) {
        document.getElementById('search-clear-btn').classList.toggle('visible', val.length > 0);
    }

    function clearSearch() {
        const input = document.getElementById('search-input');
        if (!input.value) return;
        input.value = '';
        filterNotes('');
        updateSearchClear('');
        document.getElementById('search-count').classList.add('hidden');
    }

    function openModal(note = null) {
        console.log('Modal open called');
        state.editingId = note ? note.id : null;
        currentNoteId = note ? note.id : null;
        const _pdfBtn = document.getElementById('modal-export-pdf');
        const _csvBtn = document.getElementById('modal-export-csv');
        if (_pdfBtn) _pdfBtn.style.display = note ? '' : 'none';
        if (_csvBtn) _csvBtn.style.display = note ? '' : 'none';
        document.getElementById('modal-title-label').textContent = note ? 'Edit Note' : 'New Note';
        document.getElementById('note-title').value = note ? note.title : '';
        const richEditor = document.getElementById('note-content-editor');
        const hiddenArea = document.getElementById('note-content');
        const contentVal = note ? (note.content || '') : '';
        richEditor.innerHTML = contentVal;
        hiddenArea.value = contentVal;

        const pinBtn = document.getElementById('modal-pin-btn');
        if (note) {
            pinBtn.style.display = '';
            pinBtn.classList.toggle('pinned', !!note.isPinned);
        } else {
            pinBtn.style.display = 'none';
            pinBtn.classList.remove('pinned');
        }

        const templatesBtn = document.getElementById('templates-btn');
        if (templatesBtn) templatesBtn.style.display = note ? 'none' : '';

        const catSelect = document.getElementById('note-category');
        catSelect.value = (note && note.category) ? note.category : 'General';

        selectedNoteColor = note ? (note.color || '') : '';
        document.querySelectorAll('.color-swatch').forEach(s => {
            s.classList.toggle('active', (s.dataset.color || '') === selectedNoteColor);
        });

        const saveBtn = document.getElementById('save-note-btn');
        saveBtn.innerHTML = 'Save';
        saveBtn.disabled = false;

        const scanImgContainer = document.getElementById('note-scan-image-container');
        if (note && note.imageData) {
            document.getElementById('note-scan-image-img').src = note.imageData;
            scanImgContainer.classList.remove('hidden');
        } else {
            scanImgContainer.classList.add('hidden');
        }

        const summarySection = document.getElementById('note-summary-section');
        if (note && note.summary) {
            document.getElementById('note-summary-display').textContent = note.summary;
            summarySection.style.display = 'block';
        } else {
            summarySection.style.display = 'none';
        }

        const _modal = document.getElementById('note-modal');
        _modal.classList.add('open');
        const _sheet = _modal.querySelector('.note-sheet');
        if (_sheet) {
            _sheet.classList.remove('closing');
            void _sheet.offsetWidth;
            _sheet.classList.add('opening');
            _sheet.addEventListener('animationend', () => _sheet.classList.remove('opening'), { once: true });
        }
        setTimeout(() => document.getElementById('note-title').focus(), 80);
    }

    const TEMPLATES = [
      {
        id: 'meeting',
        name: 'Meeting Notes',
        icon: 'fa-users',
        desc: 'Agenda & action items',
        category: 'Work',
        title: 'Meeting Notes — ',
        content: '<h3>Attendees</h3><ul><li></li></ul><h3>Agenda</h3><ul><li></li></ul><h3>Discussion</h3><p></p><h3>Action Items</h3><ul><li></li></ul><h3>Next Meeting</h3><p></p>'
      },
      {
        id: 'todo',
        name: 'To-Do List',
        icon: 'fa-list-check',
        desc: 'Tasks to complete',
        category: 'Personal',
        title: 'To-Do — ',
        content: '<h3>Today</h3><ul><li></li><li></li><li></li></ul><h3>This Week</h3><ul><li></li><li></li></ul><h3>Someday</h3><ul><li></li></ul>'
      },
      {
        id: 'brainstorm',
        name: 'Brainstorm',
        icon: 'fa-lightbulb',
        desc: 'Capture ideas fast',
        category: 'Ideas',
        title: 'Brainstorm — ',
        content: '<h3>Problem Statement</h3><p></p><h3>Ideas</h3><ul><li></li><li></li><li></li></ul><h3>Best Options</h3><ul><li></li></ul><h3>Next Steps</h3><p></p>'
      },
      {
        id: 'daily',
        name: 'Daily Journal',
        icon: 'fa-sun',
        desc: 'Daily reflection',
        category: 'Personal',
        title: 'Journal — ',
        content: '<h3>How I Feel</h3><p></p><h3>Top 3 Priorities</h3><ul><li></li><li></li><li></li></ul><h3>Notes</h3><p></p><h3>Gratitude</h3><ul><li></li></ul>'
      },
      {
        id: 'project',
        name: 'Project Plan',
        icon: 'fa-diagram-project',
        desc: 'Plan a project',
        category: 'Work',
        title: 'Project — ',
        content: '<h3>Overview</h3><p></p><h3>Goals</h3><ul><li></li></ul><h3>Timeline</h3><ul><li></li></ul><h3>Resources Needed</h3><ul><li></li></ul><h3>Risks</h3><ul><li></li></ul>'
      },
      {
        id: 'reading',
        name: 'Book Notes',
        icon: 'fa-book',
        desc: 'Notes from reading',
        category: 'Personal',
        title: 'Book Notes — ',
        content: '<h3>Book</h3><p></p><h3>Key Ideas</h3><ul><li></li></ul><h3>Favourite Quotes</h3><ul><li></li></ul><h3>My Takeaways</h3><p></p><h3>Action Items</h3><ul><li></li></ul>'
      }
    ];

    function toggleTemplates() {
        const picker = document.getElementById('template-picker');
        const isVisible = picker.style.display !== 'none';
        picker.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) renderTemplateGrid();
    }

    function renderTemplateGrid() {
        const grid = document.getElementById('template-grid');
        grid.innerHTML = TEMPLATES.map(t => `
            <div class="template-card" onclick="applyTemplate('${t.id}')">
                <div class="template-card-icon">
                    <i class="fa-solid ${t.icon}"></i>
                </div>
                <div class="template-card-name">${t.name}</div>
                <div class="template-card-desc">${t.desc}</div>
            </div>
        `).join('');
    }

    function applyTemplate(templateId) {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        const today = new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        document.getElementById('note-title').value = template.title + today;

        const editor = document.getElementById('note-content-editor');
        editor.innerHTML = template.content;
        document.getElementById('note-content').value = template.content;

        const catSelect = document.getElementById('note-category');
        if (catSelect) catSelect.value = template.category;

        document.getElementById('template-picker').style.display = 'none';

        editor.focus();
    }

    function closeModal() {
        const _modal = document.getElementById('note-modal');
        const _sheet = _modal.querySelector('.note-sheet');
        function _finishClose() {
            _modal.classList.remove('open');
            document.getElementById('note-content-editor').innerHTML = '';
            document.getElementById('note-content').value = '';
            document.getElementById('template-picker').style.display = 'none';
        }
        if (_sheet) {
            _sheet.classList.remove('opening');
            _sheet.classList.add('closing');
            _sheet.addEventListener('animationend', () => {
                _sheet.classList.remove('closing');
                _finishClose();
            }, { once: true });
        } else {
            _finishClose();
        }
    }

    async function saveNote() {
        const title   = document.getElementById('note-title').value.trim();
        let content   = document.getElementById('note-content-editor').innerHTML;
        const cat     = document.getElementById('note-category').value;
        const saveBtn = document.getElementById('save-note-btn');
        console.log('Saving note with category:', cat);

        if (!title) { toast('Don\'t forget a title!', 'warning'); return; }

        const plainContent = content.replace(/<[^>]*>/g, ' ');
        const hashtagMatches = plainContent.match(/#[a-zA-Z0-9_]+/g) || [];
        const tags = [...new Set(hashtagMatches)].join(',');
        const method = state.editingId ? 'PUT' : 'POST';
        const url    = state.editingId ? `/notes/${state.editingId}` : '/notes';

        setButtonLoading(saveBtn, true, 'Saving...');
        const res = await api(url, method, { title, content, category: cat, color: selectedNoteColor, tags });
        console.log('API response:', res);
        setButtonLoading(saveBtn, false);

        if (res) {
            closeModal();
            fetchNotes();
            toast('Saved!', 'success');
            triggerConfetti();
        } else {
            toast('Oops! Couldn\'t save that. Try again?', 'error');
        }
    }

    async function summarizeNote() {
        const editor = document.getElementById('note-content-editor');
        const plain  = (editor.innerHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const length = document.getElementById('summary-length').value;
        const btn    = document.getElementById('summarize-btn');

        if (plain.length < 20) {
            toast('Write at least ~20 words before summarizing', 'warning');
            return;
        }

        setButtonLoading(btn, true, 'Summarizing...');
        const res = await api('/notes/summarize', 'POST', { text: plain, length });
        setButtonLoading(btn, false);

        if (res && res.summary && res.summary.trim()) {
            document.getElementById('note-summary-display').textContent = res.summary;
            document.getElementById('note-summary-section').style.display = 'block';
        } else {
            toast('Couldn\'t generate a summary. Try again?', 'error');
        }
    }

    function deleteNote(e, id) {
        e.stopPropagation();
        showConfirm(async () => {
            const card = document.querySelector(`[data-note-id="${id}"]`);
            if (card) {
                card.classList.add('deleting');
                await new Promise(resolve => setTimeout(resolve, 400));
            }
            await api(`/notes/${id}`, 'DELETE');
            fetchNotes();
            toast('Note deleted', 'success');
        });
    }

    async function togglePin(e, noteId) {
        e.stopPropagation();
        const pinBtn = e.target.closest('.pin-btn');
        if (pinBtn) {
            pinBtn.classList.add('pin-animate');
            pinBtn.addEventListener('animationend', () => pinBtn.classList.remove('pin-animate'), { once: true });
        }
        try {
            const res = await api(`/notes/${noteId}/pin`, 'PUT');
            const note = state.notes.find(n => n.id === noteId);
            if (note && res) {
                note.isPinned = res.isPinned;
                renderNotes();
            }
        } catch (err) {
            console.log('Pin error:', err);
        }
    }

    async function toggleModalPin() {
        if (!state.editingId) return;
        try {
            const res = await api(`/notes/${state.editingId}/pin`, 'PUT');
            const note = state.notes.find(n => n.id === state.editingId);
            if (note && res) {
                note.isPinned = res.isPinned;
                const pinBtn = document.getElementById('modal-pin-btn');
                pinBtn.classList.toggle('pinned', res.isPinned);
                renderNotes();
            }
        } catch (err) {
            console.log('Pin error:', err);
        }
    }

    function showConfirm(callback) {
        pendingConfirmAction = callback;
        document.getElementById('confirm-modal').classList.add('open');
    }

    function cancelConfirm() {
        pendingConfirmAction = null;
        document.getElementById('confirm-modal').classList.remove('open');
    }

    function executeConfirm() {
        if (pendingConfirmAction) pendingConfirmAction();
        pendingConfirmAction = null;
        document.getElementById('confirm-modal').classList.remove('open');
    }

    function openScanModal(tab, drawOnly) {
        tab = tab || 'draw';
        scanDrawOnly = !!drawOnly;
        lastScannedImageData = null;
        currentOcrWords = [];
        pendingUploadFile = null;
        document.getElementById('upload-drop-area').classList.remove('hidden');
        document.getElementById('upload-preview-section').classList.add('hidden');
        document.getElementById('scan-file-input').value = '';
        document.getElementById('scan-tabs-row').classList.toggle('hidden', scanDrawOnly);
        document.getElementById('scan-modal-title').textContent = scanDrawOnly ? 'Scan Handwriting' : 'Scan Image';
        switchScanStep('input');
        switchScanTab(scanDrawOnly ? 'draw' : tab);
        document.getElementById('scan-modal').classList.add('open');
        initDrawingCanvas();
    }

    function closeScanModal() {
        document.getElementById('scan-modal').classList.remove('open');
    }

    function openCameraSheet() {
        document.getElementById('camera-action-sheet').classList.add('open');
    }

    function closeCameraSheet() {
        document.getElementById('camera-action-sheet').classList.remove('open');
    }

    function triggerCameraCapture() {
        closeCameraSheet();
        document.getElementById('camera-capture-input').click();
    }

    function triggerGalleryUpload() {
        closeCameraSheet();
        document.getElementById('scan-file-input').click();
    }

    function switchScanTab(tab) {
        document.querySelectorAll('.scan-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-scan-tab="${tab}"]`).classList.add('active');
        document.getElementById('scan-tab-draw').classList.toggle('hidden', tab !== 'draw');
        document.getElementById('scan-tab-upload').classList.toggle('hidden', tab !== 'upload');
    }

    function switchScanStep(step) {
        currentScanStep = step;
        ['input','loading','error','preview'].forEach(s => {
            document.getElementById(`scan-step-${s}`).classList.toggle('hidden', s !== step);
        });
        if (step === 'input') {
            document.getElementById('scan-tabs-row').classList.toggle('hidden', scanDrawOnly);
        }
    }

    function handleFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            lastScannedImageData = ev.target.result;
            if (!document.getElementById('scan-modal').classList.contains('open')) {
                openScanModal('upload');
            } else {
                switchScanTab('upload');
            }
            // Set after openScanModal — openScanModal resets pendingUploadFile to null
            pendingUploadFile = file;
            document.getElementById('upload-preview-img').src = ev.target.result;
            document.getElementById('upload-drop-area').classList.add('hidden');
            document.getElementById('upload-preview-section').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    function chooseDifferentImage() {
        pendingUploadFile = null;
        document.getElementById('upload-preview-section').classList.add('hidden');
        document.getElementById('upload-drop-area').classList.remove('hidden');
        document.getElementById('scan-file-input').click();
    }

    function processPendingUpload() {
        if (!pendingUploadFile) return;
        switchScanStep('loading');
        const formData = new FormData();
        formData.append('file', pendingUploadFile);
        formData.append('source', 'upload');
        pendingUploadFile = null;
        processOcrRequest(formData);
    }

    function initDrawingCanvas() {
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 620;
        canvas.height = 360;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingState.canvas = canvas;
        drawingState.ctx = ctx;
        drawingState.tool = 'pen';
        drawingState.penColor = '#000000';
        drawingState.penSize = 4;
        updateToolButtons();
        if (!drawingState.listenersReady) {
            canvas.addEventListener('mousedown', handleCanvasPointerDown);
            canvas.addEventListener('mousemove', handleCanvasPointerMove);
            canvas.addEventListener('mouseup', handleCanvasPointerUp);
            canvas.addEventListener('mouseleave', handleCanvasPointerUp);
            canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handleCanvasPointerDown(e.touches[0]); }, { passive: false });
            canvas.addEventListener('touchmove',  function(e) { e.preventDefault(); handleCanvasPointerMove(e.touches[0]); }, { passive: false });
            canvas.addEventListener('touchend', handleCanvasPointerUp);
            drawingState.listenersReady = true;
        }
    }

    function getCanvasCoordinates(e) {
        const canvas = drawingState.canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top)  * (canvas.height / rect.height)
        };
    }

    function handleCanvasPointerDown(e) {
        drawingState.isDrawing = true;
        const pos = getCanvasCoordinates(e);
        drawingState.ctx.beginPath();
        drawingState.ctx.moveTo(pos.x, pos.y);
        drawingState.currentStroke = {
            points: [pos],
            tool: drawingState.tool,
            color: drawingState.penColor,
            size: drawingState.penSize
        };
    }

    function handleCanvasPointerMove(e) {
        if (!drawingState.isDrawing) return;
        const pos = getCanvasCoordinates(e);
        const ctx = drawingState.ctx;
        ctx.lineWidth   = drawingState.tool === 'eraser' ? drawingState.penSize * 3 : drawingState.penSize;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = drawingState.tool === 'eraser' ? '#ffffff' : drawingState.penColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (drawingState.currentStroke) drawingState.currentStroke.points.push(pos);
    }

    function handleCanvasPointerUp() {
        drawingState.isDrawing = false;
        if (drawingState.currentStroke && drawingState.currentStroke.points.length > 1) {
            drawingState.strokeHistory.push(drawingState.currentStroke);
        }
        drawingState.currentStroke = null;
    }

    function selectDrawingTool(tool) { drawingState.tool = tool; updateToolButtons(); }
    function selectPenSize(size)     { drawingState.penSize = size; updateToolButtons(); }
    function selectPenColor(color)   { drawingState.penColor = color; drawingState.tool = 'pen'; updateToolButtons(); }

    function updateToolButtons() {
        document.querySelectorAll('.canvas-tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === drawingState.tool);
        });
        document.querySelectorAll('.canvas-size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === drawingState.penSize);
        });
        document.querySelectorAll('.canvas-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === drawingState.penColor);
        });
    }

    function clearDrawingCanvas() {
        drawingState.ctx.fillStyle = '#ffffff';
        drawingState.ctx.fillRect(0, 0, drawingState.canvas.width, drawingState.canvas.height);
        drawingState.strokeHistory = [];
        drawingState.currentStroke = null;
    }

    function drawStroke(ctx, stroke, scale) {
        if (stroke.points.length < 2) return;
        const isEraser = stroke.tool === 'eraser';
        ctx.beginPath();
        ctx.lineWidth   = (isEraser ? stroke.size * 3 : stroke.size) * scale;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = isEraser ? '#ffffff' : '#000000';
        ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
        }
        ctx.stroke();
    }

    function redrawFromHistory() {
        const { ctx, canvas } = drawingState;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const stroke of drawingState.strokeHistory) {
            drawStroke(ctx, stroke, 1);
        }
    }

    function submitDrawing() {
        switchScanStep('loading');
        const canvas = document.getElementById('drawing-canvas');
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(canvas, 0, 0);
        offscreen.toBlob(async function(blob) {
            if (!blob) return;
            lastScannedImageData = offscreen.toDataURL('image/png');
            const formData = new FormData();
            formData.append('file', blob, 'canvas.png');
            formData.append('source', 'canvas');
            processOcrRequest(formData);
        }, 'image/png', 1.0);
    }

    async function processOcrRequest(formData) {
        try {
            const response = await fetch(API_URL + '/notes/scan', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: formData
            });

            if (!response.ok) {
                if (response.status === 503)      showScanError('OCR service is starting up', 'Please wait 30 seconds and try again.');
                else if (response.status === 413) showScanError('Image file too large', 'Please use an image under 10MB.');
                else if (response.status === 415) showScanError('Unsupported image format', 'Please use a JPEG, PNG, GIF, WebP, or BMP image.');
                else if (response.status >= 500)  showScanError('Scan service error', 'Something went wrong on our end. Please try again in a moment.');
                else                               showScanError('Scan failed', 'Something went wrong processing your image.');
                return;
            }

            const data = await response.json();
            if (!data.text || !data.text.trim()) {
                showScanError('No text found', 'Try a clearer photo with better lighting. Make sure the text is legible.');
                return;
            }

            document.getElementById('scan-preview-text').value = data.text || '';
            currentOcrWords = data.words || [];
            if (currentOcrWords.length > 0) {
                renderEditableWords(currentOcrWords, data.confidence || 85);
            } else {
                document.getElementById('scan-words-container').style.display = 'none';
                document.getElementById('scan-confidence-section').style.display = 'none';
            }
            lastScanResult = { text: data.text || '', engine: 'azure_vision', confidence: data.confidence ?? null };
            document.getElementById('ocr-feedback-bar').style.display = 'flex';
            document.getElementById('ocr-feedback-thanks').style.display = 'none';
            switchScanStep('preview');
        } catch (err) {
            showScanError('Connection lost', 'Please check your internet connection and try again.');
        }
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderEditableWords(words, confidence) {
        const container = document.getElementById('scan-words-container');
        container.innerHTML = '';

        words.forEach((word, index) => {
            const chip = document.createElement('div');
            chip.className = 'word-chip' + (word.confidence < 70 ? ' low-confidence' : '');

            const span = document.createElement('span');
            span.className = 'word-text';
            span.dataset.index = index;
            span.textContent = word.text;

            const conf = document.createElement('span');
            conf.className = 'word-confidence';
            conf.textContent = word.confidence + '%';

            chip.appendChild(span);
            chip.appendChild(conf);
            chip.addEventListener('click', () => editWord(chip, index, currentOcrWords[index].text));
            container.appendChild(chip);
        });

        document.getElementById('scan-confidence-fill').style.width = confidence + '%';
        document.getElementById('scan-confidence-label').textContent = 'Overall: ' + Math.round(confidence) + '%';
        container.style.display = 'flex';
        document.getElementById('scan-confidence-section').style.display = 'block';
    }

    function editWord(chip, index, currentText) {
        if (chip.classList.contains('editing')) return;
        chip.classList.add('editing');

        const span = chip.querySelector('.word-text');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.style.width = Math.max(currentText.length + 1, 3) + 'ch';
        span.replaceWith(input);
        input.focus();
        input.select();

        function saveEdit() {
            const newText = input.value.trim() || currentText;
            currentOcrWords[index].text = newText;
            const newSpan = document.createElement('span');
            newSpan.className = 'word-text';
            newSpan.dataset.index = index;
            newSpan.textContent = newText;
            input.replaceWith(newSpan);
            chip.classList.remove('editing');
            updateFullTextFromWords();
        }

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            else if (e.key === 'Escape') { input.value = currentText; saveEdit(); }
            else if (e.key === 'Tab') {
                e.preventDefault();
                saveEdit();
                const chips = Array.from(document.querySelectorAll('#scan-words-container .word-chip'));
                const next = chips[chips.indexOf(chip) + 1];
                if (next) next.click();
            }
        });
        input.addEventListener('input', () => {
            input.style.width = Math.max(input.value.length + 1, 3) + 'ch';
        });
    }

    function updateFullTextFromWords() {
        document.getElementById('scan-preview-text').value = currentOcrWords.map(w => w.text).join(' ');
    }

    function showScanError(title, detail) {
        document.getElementById('scan-error-title').textContent = title;
        document.getElementById('scan-error-detail').textContent = detail;
        switchScanStep('error');
    }

    async function submitOcrFeedback(isAccurate) {
        document.getElementById('ocr-feedback-bar').style.display = 'none';
        document.getElementById('ocr-feedback-thanks').style.display = 'block';
        try {
            await api('/ocr/feedback', 'POST', {
                extractedText: lastScanResult?.text || '',
                engine: lastScanResult?.engine || 'azure_vision',
                confidence: lastScanResult?.confidence || null,
                isAccurate: isAccurate,
                correctedText: isAccurate ? null : document.getElementById('scan-preview-text')?.value
            });
        } catch (e) {
            console.log('Feedback error:', e);
        }
    }

    async function scanSaveAsNote() {
        const extractedText = document.getElementById('scan-preview-text').value;
        if (!extractedText.trim()) { toast('Nothing to save yet — edit the text above!', 'warning'); return; }
        const title = 'Scanned — ' + new Date().toLocaleDateString();
        const result = await api('/notes', 'POST', { title, content: extractedText, imageData: lastScannedImageData });
        if (result) {
            closeScanModal();
            closeModal();
            fetchNotes();
            toast('Scanned & saved!', 'success');
        } else {
            toast('Oops! Couldn\'t save the scan. Try again?', 'error');
        }
    }


    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }


    function relativeTime(dateStr) {
        const date = new Date(dateStr);
        const now  = new Date();
        const diffMins  = Math.floor((now - date) / 60000);
        const diffHours = Math.floor((now - date) / 3600000);
        const diffDays  = Math.floor((now - date) / 86400000);
        if (diffMins < 1)   return 'Just now';
        if (diffMins < 60)  return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7)   return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── MOBILE UTILS ──────────────────────────────────────────────
    function isMobile() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    function hapticFeedback(type) {
        if (!navigator.vibrate) return;
        const p = { light: 10, medium: 25, heavy: 50, success: [10, 50, 10], warning: [30, 30, 30], error: [50, 100, 50] };
        navigator.vibrate(p[type] || 10);
    }

    // ── QUICK ACTIONS SHEET ───────────────────────────────────────
    let _qaNote = null;

    function showQuickActions(note) {
        _qaNote = note;
        document.getElementById('qa-note-title').textContent = note.title;
        document.getElementById('quick-actions-sheet').classList.add('open');
        hapticFeedback('medium');
    }

    function closeQuickActions() {
        document.getElementById('quick-actions-sheet').classList.remove('open');
    }

    function qaEdit() {
        const note = _qaNote;
        closeQuickActions();
        setTimeout(() => { if (note) openModal(note); }, 250);
    }

    function qaDuplicate() {
        const note = _qaNote;
        closeQuickActions();
        if (!note) return;
        setTimeout(async () => {
            const res = await api('/notes', 'POST', { title: note.title + ' (Copy)', content: note.content });
            if (res) { fetchNotes(); toast('Note duplicated', 'success'); hapticFeedback('success'); }
        }, 250);
    }

    function qaDelete() {
        const note = _qaNote;
        closeQuickActions();
        if (!note) return;
        setTimeout(() => {
            showConfirm(async () => {
                await api(`/notes/${note.id}`, 'DELETE');
                fetchNotes();
                toast('Note deleted', 'success');
                hapticFeedback('warning');
            });
        }, 250);
    }

    // ── CARD TOUCH GESTURES ───────────────────────────────────────
    function initCardGestures(el, note) {
        if (!isMobile()) return;
        let startX = 0, startY = 0, dx = 0, swiping = false;
        let longPressTimer = null, longPressActivated = false;

        el.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            dx = 0; swiping = false; longPressActivated = false;
            longPressTimer = setTimeout(() => {
                longPressActivated = true;
                el.style.transition = '';
                el.style.transform = '';
                el.classList.remove('swipe-left-hint', 'swipe-right-hint');
                showQuickActions(note);
            }, 500);
        }, { passive: true });

        el.addEventListener('touchmove', e => {
            clearTimeout(longPressTimer);
            dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) swiping = true;
            if (swiping) {
                e.preventDefault();
                const clamp = Math.max(-130, Math.min(130, dx));
                el.style.transform = `translateX(${clamp}px)`;
                el.style.transition = 'none';
                el.classList.toggle('swipe-left-hint',  dx < -40);
                el.classList.toggle('swipe-right-hint', dx >  40);
            }
        }, { passive: false });

        el.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
            el.style.transition = '';
            el.style.transform = '';
            el.classList.remove('swipe-left-hint', 'swipe-right-hint');
            if (!swiping || longPressActivated) { swiping = false; dx = 0; return; }
            if (dx < -100) {
                hapticFeedback('warning');
                showConfirm(async () => {
                    await api(`/notes/${note.id}`, 'DELETE');
                    fetchNotes();
                    toast('Note deleted', 'success');
                });
            } else if (dx > 100) {
                hapticFeedback('light');
                openModal(note);
            }
            swiping = false; dx = 0;
        });
    }

    // ── PULL TO REFRESH ───────────────────────────────────────────
    function initPullToRefresh() {
        if (!isMobile()) return;
        const area = document.querySelector('.notes-area');
        if (!area) return;

        // Prepend indicator into notes area
        const ind = document.createElement('div');
        ind.className = 'ptr-indicator';
        ind.innerHTML = '<div class="ptr-spinner"></div><span id="ptr-label">Pull to refresh</span>';
        area.prepend(ind);

        let startY = 0, refreshing = false;

        area.addEventListener('touchstart', e => {
            if (area.scrollTop === 0) startY = e.touches[0].clientY;
        }, { passive: true });

        area.addEventListener('touchend', async e => {
            if (refreshing || area.scrollTop !== 0) return;
            const dy = e.changedTouches[0].clientY - startY;
            if (dy < 80) return;
            refreshing = true;
            ind.classList.add('ptr-visible', 'ptr-refreshing');
            document.getElementById('ptr-label').textContent = 'Refreshing…';
            hapticFeedback('medium');
            await fetchNotes();
            toast('Refreshed!', 'success');
            hapticFeedback('success');
            ind.classList.remove('ptr-refreshing');
            document.getElementById('ptr-label').textContent = 'Pull to refresh';
            setTimeout(() => ind.classList.remove('ptr-visible'), 350);
            refreshing = false;
        }, { passive: true });
    }

    // ── FAB LONG PRESS ────────────────────────────────────────────
    function showFabMenu() { document.getElementById('fab-menu').classList.add('open'); }
    function closeFabMenu() { document.getElementById('fab-menu').classList.remove('open'); }

    function initFabLongPress() {
        if (!isMobile()) return;
        const fab = document.querySelector('.nav-fab');
        if (!fab) return;
        let fabTimer = null, fabLongPressed = false;
        fab.addEventListener('touchstart', () => {
            fabLongPressed = false;
            fabTimer = setTimeout(() => { fabLongPressed = true; hapticFeedback('medium'); showFabMenu(); }, 500);
        }, { passive: true });
        fab.addEventListener('touchend', e => {
            clearTimeout(fabTimer);
            if (fabLongPressed) { e.preventDefault(); e.stopPropagation(); }
        });
        fab.addEventListener('touchmove', () => clearTimeout(fabTimer), { passive: true });
    }

    // ── MOBILE HINTS ──────────────────────────────────────────────
    // ── VISUAL VIEWPORT — keyboard-safe modal height ──────────────
    function initModalKeyboardBehavior() {
        if (!window.visualViewport || !isMobile()) return;
        window.visualViewport.addEventListener('resize', () => {
            const modal = document.getElementById('note-modal');
            if (!modal || !modal.classList.contains('open')) return;
            const sheet = modal.querySelector('.note-sheet');
            if (!sheet) return;
            // Keep sheet within the visible area above the virtual keyboard
            sheet.style.maxHeight = Math.floor(window.visualViewport.height * 0.95) + 'px';
        });
    }

    function initMobileHints() {
        if (!isMobile() || localStorage.getItem('mobile-hints-shown')) return;
        setTimeout(() => {
            const el = document.getElementById('mobile-swipe-hint');
            if (el) { el.classList.add('show'); localStorage.setItem('mobile-hints-shown', '1'); }
        }, 2500);
    }

    function dismissHint(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }
    }

    // ── COMMAND PALETTE ──────────────────────────────────────────
    const commands = [
        { id: 'new-note',   title: 'New Note',           icon: '📝', shortcut: 'Ctrl+N',       action: () => openModal() },
        { id: 'scan',       title: 'Scan Handwriting',   icon: '📷', shortcut: '',             action: () => openScanModal('draw', true) },
        { id: 'search',     title: 'Search Notes',       icon: '🔍', shortcut: 'Ctrl+F',       action: () => focusSearch() },
        { id: 'duplicate',  title: 'Duplicate Note',     icon: '📋', shortcut: 'Ctrl+D',       action: () => duplicateCurrentNote() },
        { id: 'copy',       title: 'Copy Note Content',  icon: '📄', shortcut: 'Ctrl+Shift+C', action: () => copyNoteContent() },
        { id: 'settings',   title: 'Settings',           icon: '⚙️', shortcut: 'Ctrl+,',       action: () => openSettingsModal() },
        { id: 'export',     title: 'Export Notes (CSV)', icon: '📥', shortcut: '',             action: () => exportAsCSV() },
        { id: 'theme',      title: 'Toggle Theme',       icon: '🌓', shortcut: 'Ctrl+Shift+D', action: () => toggleTheme() },
        { id: 'help',       title: 'Keyboard Shortcuts', icon: '⌨️', shortcut: '?',            action: () => showKeyboardHelp() },
    ];
    let _cmdList = commands;
    let _cmdIdx  = -1;

    function openCommandPalette() {
        const modal = document.getElementById('command-palette');
        if (!modal) return;
        _cmdIdx  = -1;
        _cmdList = commands;
        renderCommands(commands);
        modal.classList.add('open');
        setTimeout(() => {
            const inp = document.getElementById('command-search');
            if (inp) { inp.focus(); inp.value = ''; }
        }, 50);
    }

    function closeCommandPalette() {
        document.getElementById('command-palette')?.classList.remove('open');
    }

    function renderCommands(list) {
        const results = document.getElementById('command-results');
        if (!results) return;
        results.innerHTML = list.map((cmd, i) => `
            <div class="command-item${i === _cmdIdx ? ' selected' : ''}" onclick="executeCommand('${cmd.id}')">
                <span class="command-icon">${cmd.icon}</span>
                <span class="command-title">${esc(cmd.title)}</span>
                ${cmd.shortcut ? `<span class="command-shortcut">${esc(cmd.shortcut)}</span>` : ''}
            </div>
        `).join('');
    }

    function executeCommand(id) {
        const cmd = commands.find(c => c.id === id);
        if (cmd) { closeCommandPalette(); setTimeout(() => cmd.action(), 50); }
    }

    function filterCommands(query) {
        _cmdIdx  = -1;
        const q  = query.toLowerCase();
        _cmdList = q ? commands.filter(c => c.title.toLowerCase().includes(q)) : commands;
        renderCommands(_cmdList);
    }

    function handleCommandPaletteKey(e) {
        const items = document.querySelectorAll('#command-results .command-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _cmdIdx = Math.min(_cmdIdx + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle('selected', i === _cmdIdx));
            items[_cmdIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _cmdIdx = Math.max(_cmdIdx - 1, 0);
            items.forEach((el, i) => el.classList.toggle('selected', i === _cmdIdx));
            items[_cmdIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_cmdIdx >= 0 && items[_cmdIdx]) items[_cmdIdx].click();
            else if (_cmdList.length > 0) executeCommand(_cmdList[0].id);
        }
    }

    // ── KEYBOARD HELP ─────────────────────────────────────────────
    function showKeyboardHelp() {
        document.getElementById('keyboard-help-modal')?.classList.add('open');
    }

    function closeKeyboardHelp() {
        document.getElementById('keyboard-help-modal')?.classList.remove('open');
    }

    // ── SHORTCUT HELPERS ──────────────────────────────────────────
    function closeAllModals() {
        closeModal();
        closeScanModal();
        cancelConfirm();
        document.getElementById('settings-modal').classList.remove('open');
        document.getElementById('help-modal').classList.remove('open');
        document.getElementById('learn-modal').classList.remove('open');
        closeCommandPalette();
        closeKeyboardHelp();
        closeQuickActions();
        closeFabMenu();
    }

    function focusSearch() {
        const bar = document.getElementById('search-bar');
        if (bar && bar.classList.contains('hidden')) bar.classList.remove('hidden');
        setTimeout(() => {
            const inp = document.getElementById('search-input');
            if (inp) { inp.focus(); inp.select(); }
        }, 50);
    }

    function handleSaveShortcut() {
        const noteModal = document.getElementById('note-modal');
        const scanModal = document.getElementById('scan-modal');
        if (noteModal?.classList.contains('open')) {
            saveNote();
        } else if (scanModal?.classList.contains('open') && currentScanStep === 'preview') {
            scanSaveAsNote();
        } else {
            toast('Nothing to save', 'info');
        }
    }

    // ── VIM-STYLE NOTE NAVIGATION ─────────────────────────────────
    let _selNoteIdx = -1;

    function navigateNotes(direction) {
        const cards = [...document.querySelectorAll('#notes-grid .note-card')];
        if (!cards.length) return;
        cards.forEach(c => c.classList.remove('keyboard-selected'));
        if (direction === 'down') _selNoteIdx = Math.min(_selNoteIdx + 1, cards.length - 1);
        else                      _selNoteIdx = Math.max(_selNoteIdx - 1, 0);
        const sel = cards[_selNoteIdx];
        sel.classList.add('keyboard-selected');
        sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function openSelectedNote() {
        const sel = document.querySelector('#notes-grid .note-card.keyboard-selected');
        if (sel) sel.click();
    }

    // ── DUPLICATE / COPY ──────────────────────────────────────────
    function _resolveActiveNote() {
        // Prefer the note currently open in the editor
        if (state.editingId) return state.notes.find(n => n.id === state.editingId) || null;
        // Fall back to keyboard-selected card
        const sel = document.querySelector('#notes-grid .note-card.keyboard-selected');
        if (sel) {
            const id = parseInt(sel.dataset.id, 10);
            return state.notes.find(n => n.id === id) || null;
        }
        return null;
    }

    async function duplicateCurrentNote() {
        const note = _resolveActiveNote();
        if (!note) { toast('Select a note first', 'info'); return; }
        const res = await api('/notes', 'POST', {
            title:   note.title + ' (Copy)',
            content: note.content,
        });
        if (res) { fetchNotes(); toast('Note duplicated', 'success'); }
    }

    function copyNoteContent() {
        const note = _resolveActiveNote();
        if (!note) { toast('Select a note first', 'info'); return; }
        navigator.clipboard.writeText(note.content || '').then(() => {
            toast('Content copied', 'success');
        });
    }

    // ── GG / SHIFT+G SCROLL ───────────────────────────────────────
    let _lastG = 0;

    function _notesArea() {
        return document.querySelector('.notes-area');
    }

    // ── GLOBAL KEYBOARD SHORTCUTS ─────────────────────────────────
    const _kc = [38,38,40,40,37,39,37,39,66,65];
    let _kp = 0;
    document.addEventListener('keydown', e => {
        // Konami code
        _kp = (e.keyCode === _kc[_kp]) ? _kp + 1 : 0;
        if (_kp === _kc.length) { _kp = 0; _launchConfetti(); }

        const activeEl = document.activeElement;
        const isTyping = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.contentEditable === 'true' ||
            activeEl.closest('[contenteditable]') ||
            activeEl.closest('.rich-editor') ||
            activeEl.closest('.note-sheet')
        );
        const mod = e.ctrlKey || e.metaKey;

        // Escape – close everything
        if (e.key === 'Escape') { e.preventDefault(); closeAllModals(); return; }

        // Skip non-modifier shortcuts while typing
        if (isTyping && !mod && !e.altKey) return;

        // Ctrl+K – Command palette
        if (mod && e.key === 'k') { e.preventDefault(); openCommandPalette(); return; }

        // Ctrl+N – New note
        if (mod && e.key === 'n') {
            e.preventDefault();
            e.stopPropagation();
            closeAllModals();
            setTimeout(() => { openModal(); }, 50);
            return;
        }

        // Ctrl+F – Search
        if (mod && e.key === 'f') { e.preventDefault(); focusSearch(); return; }

        // / – Focus search (not when typing)
        if (e.key === '/' && !isTyping) { e.preventDefault(); focusSearch(); return; }

        // Ctrl+, – Settings
        if (mod && e.key === ',') { e.preventDefault(); openSettingsModal(); return; }

        // Ctrl+S – Context-aware save
        if (mod && e.key === 's') { e.preventDefault(); handleSaveShortcut(); return; }

        // Ctrl+Enter – Save and close note
        if (mod && e.key === 'Enter') {
            e.preventDefault();
            if (document.getElementById('note-modal')?.classList.contains('open')) saveNote();
            return;
        }

        // Ctrl+D – Duplicate note
        if (mod && e.key === 'd') { e.preventDefault(); duplicateCurrentNote(); return; }

        // Ctrl+Shift+C – Copy note content
        if (mod && e.shiftKey && e.key === 'C') { e.preventDefault(); copyNoteContent(); return; }

        // Ctrl+Shift+D – Toggle theme
        if (mod && e.shiftKey && e.key === 'D') { e.preventDefault(); toggleTheme(); return; }

        // ? – Keyboard help (not when typing)
        if (e.key === '?' && !isTyping) { e.preventDefault(); showKeyboardHelp(); return; }

        // 1-4 – Category navigation (not when typing)
        if (!isTyping && ['1','2','3','4'].includes(e.key)) {
            const cats = ['all','personal','work','ideas'];
            const cat  = cats[parseInt(e.key) - 1];
            filterCat(cat, document.querySelector(`.filter-tab[data-cat="${cat}"]`));
            return;
        }

        // Alt+H – Home
        if (e.altKey && e.key === 'h') { e.preventDefault(); navTo('home'); return; }

        // J/K – Vim-style note navigation (not when typing, not when modal open)
        const anyModalOpen = document.querySelector('.modal-overlay.open');
        if (!isTyping && !anyModalOpen) {
            if (e.key === 'j') { e.preventDefault(); navigateNotes('down'); return; }
            if (e.key === 'k') { e.preventDefault(); navigateNotes('up'); return; }
            if (e.key === 'Enter') { e.preventDefault(); openSelectedNote(); return; }

            // Shift+G – scroll to bottom
            if (e.shiftKey && e.key === 'G') {
                e.preventDefault();
                const a = _notesArea(); if (a) a.scrollTop = a.scrollHeight;
                return;
            }

            // G G – scroll to top
            if (e.key === 'g') {
                const now = Date.now();
                if (now - _lastG < 400) { const a = _notesArea(); if (a) a.scrollTop = 0; _lastG = 0; }
                else { _lastG = now; }
                return;
            }
        }

        // Scan modal shortcuts
        const scanModal = document.getElementById('scan-modal');
        if (scanModal?.classList.contains('open')) {
            if (e.altKey && e.key === 'd') { e.preventDefault(); switchScanTab('draw');   return; }
            if (e.altKey && e.key === 'u') { e.preventDefault(); switchScanTab('upload'); return; }
            if (mod && e.key === 'r')      { e.preventDefault(); switchScanStep('input'); return; }
        }
    });
    function _launchConfetti() {
        const colors = ['#5B6EF5','#EC4899','#10B981','#4ADE80','#F97316','#C084FC'];
        for (let i = 0; i < 90; i++) {
            const c = document.createElement('div');
            const size = Math.random() * 10 + 5;
            c.style.cssText = `position:fixed;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;top:-30px;border-radius:${Math.random()>0.5?'50%':'3px'};animation:confettiFall ${Math.random()*2+1.5}s ease-in forwards;animation-delay:${Math.random()*0.6}s;z-index:9998;pointer-events:none;`;
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 3200);
        }
        toast('You found the easter egg!', 'success');
    }

    let installPromptEvent = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        installPromptEvent = e;
        if (!localStorage.getItem('pwa-install-dismissed'))
            document.getElementById('install-prompt').classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
        document.getElementById('install-prompt').classList.add('hidden');
        localStorage.setItem('pwa-install-dismissed', '1');
    });
    function installApp() {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        installPromptEvent.userChoice.then(choice => {
            if (choice.outcome === 'accepted') localStorage.setItem('pwa-install-dismissed', '1');
            installPromptEvent = null;
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
    function dismissInstall() {
        document.getElementById('install-prompt').classList.add('hidden');
        localStorage.setItem('pwa-install-dismissed', '1');
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
    }

    // ── WORD SUGGESTIONS ────────────────────────────────────────
    (function() {
        const WORD_DICT = [
          // A
          'action','agenda','app','article','analysis','answer','about','add',
          'amazing','area','account','apply','available','assign',
          // B
          'budget','brief','build','background','backup','blog','book','bug',
          'business','block','break','board',
          // C
          'call','cancel','check','code','comment','complete','contact','content',
          'create','client','change','confirm','copy','cost','current',
          // D
          'deadline','decision','deploy','design','details','discuss','done',
          'document','data','debug','demo','draft','database',
          // E
          'email','error','event','example','edit','expand','export',
          'estimate','execute','enable',
          // F
          'feature','feedback','file','fix','follow','form','function',
          'final','finish','focus','frontend',
          // G
          'goal','general','github','group','guide','get',
          // H
          'help','home','hotfix','handle','host',
          // I
          'idea','important','issue','improve','implement','info','input',
          'interface','integration',
          // J
          'job','jira','join',
          // K
          'keep','key','knowledge',
          // L
          'launch','learn','list','log','link','layout',
          // M
          'meeting','message','mobile','model','monitor','merge',
          'manage','milestone','module',
          // N
          'note','notes','next','need','network','new',
          // O
          'objective','output','optimize','option','order','outreach',
          // P
          'plan','personal','priority','project','proposal','push',
          'problem','process','product','progress','present',
          // Q
          'question','queue','quick',
          // R
          'release','reminder','report','research','review','roadmap',
          'refactor','request','resource',
          // S
          'schedule','search','send','setup','share','sprint','status',
          'summary','support','sync','scope','solution','server',
          // T
          'task','team','test','todo','track','ticket','template',
          'timeline','thought','testing',
          // U
          'update','upload','urgent','user','ui','ux',
          // V
          'version','verify','video','view',
          // W
          'work','write','website','workflow',
          // X
          'xcode',
          // Y
          'yesterday',
          // Z
          'zoom'
        ];

        const editor = document.getElementById('note-content-editor');
        const hiddenTextarea = document.getElementById('note-content');
        const container = document.getElementById('word-suggestions');
        if (!editor || !container) return;

        // Sync rich editor to hidden textarea and update toolbar on every input
        editor.addEventListener('input', function() {
            hiddenTextarea.value = this.innerHTML;
            updateToolbarState();
            renderSuggestions(getCurrentWord());
        });
        editor.addEventListener('keyup', updateToolbarState);
        editor.addEventListener('mouseup', updateToolbarState);

        function getCurrentWord() {
            const sel = window.getSelection();
            if (!sel || !sel.anchorNode) return '';
            const text = sel.anchorNode.textContent || '';
            const pos = sel.anchorOffset;
            const before = text.slice(0, pos);
            const match = before.match(/(\S+)$/);
            return match ? match[1].toLowerCase() : '';
        }

        function renderSuggestions(word) {
            if (word.length < 1) { container.classList.add('hidden'); return; }
            const primary = WORD_DICT.filter(w => w.startsWith(word) && w !== word)
                .sort((a, b) => a.length - b.length);
            const secondary = WORD_DICT.filter(w => !w.startsWith(word) && w.includes(word) && w !== word)
                .sort((a, b) => a.length - b.length);
            const matches = [...primary, ...secondary].slice(0, 4);
            if (matches.length === 0) { container.classList.add('hidden'); return; }
            container.innerHTML = '';
            matches.forEach(w => {
                const pill = document.createElement('span');
                pill.className = 'word-suggestion-pill';
                pill.textContent = w;
                pill.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    const sel = window.getSelection();
                    if (!sel || !sel.anchorNode) return;
                    const node = sel.anchorNode;
                    const pos = sel.anchorOffset;
                    const text = node.textContent;
                    const newBefore = text.slice(0, pos).replace(/(\S+)$/, w);
                    node.textContent = newBefore + text.slice(pos);
                    const range = document.createRange();
                    range.setStart(node, newBefore.length);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    hiddenTextarea.value = editor.innerHTML;
                    container.classList.add('hidden');
                });
                container.appendChild(pill);
            });
            container.classList.remove('hidden');
        }

        editor.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') container.classList.add('hidden');
        });
        editor.addEventListener('blur', () => container.classList.add('hidden'));
    })();


// Expose handlers referenced by inline/dynamic markup on window, preserving
// the pre-module global behavior exactly.
Object.assign(window, {
  applyTemplate,
  applyTheme,
  cancelConfirm,
  chooseDifferentImage,
  clearDrawingCanvas,
  clearSearch,
  closeCameraSheet,
  closeCommandPalette,
  closeFabMenu,
  closeHelpModal,
  closeKeyboardHelp,
  closeLearnModal,
  closeModal,
  closeQuickActions,
  closeScanModal,
  closeSettingsModal,
  deleteNote,
  dismissHint,
  dismissInstall,
  dismissToast,
  execCmd,
  executeCommand,
  executeConfirm,
  exportAsCSV,
  exportAsPDF,
  exportNoteAsCSV,
  exportNoteAsPDF,
  fetchNotes,
  filterCat,
  filterCommands,
  filterNotes,
  handleCommandPaletteKey,
  handleFileSelected,
  handleLogin,
  handleRegister,
  installApp,
  logout,
  menuAction,
  navTo,
  openCameraSheet,
  openModal,
  openScanModal,
  openSettingsModal,
  processPendingUpload,
  qaDelete,
  qaDuplicate,
  qaEdit,
  resetNoteOrder,
  resetToSystemTheme,
  saveNote,
  scanSaveAsNote,
  selectDrawingTool,
  selectPenColor,
  selectPenSize,
  showPage,
  submitDrawing,
  submitOcrFeedback,
  summarizeNote,
  switchScanStep,
  switchScanTab,
  toggleAuth,
  toggleModalPin,
  togglePin,
  toggleTemplates,
  toggleTheme,
  toggleUserMenu,
  triggerCameraCapture,
  triggerGalleryUpload,
  updateSearchClear
});
