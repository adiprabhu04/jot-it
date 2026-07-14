import { toast } from './util.js';

// Theme system (extracted verbatim). Self-initializes on import.
    function initTheme() {
        const saved = localStorage.getItem('jotit-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.innerHTML = isDark
                ? '<i class="fa-solid fa-sun"></i>'
                : '<i class="fa-solid fa-moon"></i>';
            btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        }
        const authBtn = document.getElementById('auth-theme-toggle');
        if (authBtn) {
            authBtn.innerHTML = isDark
                ? '<i class="fa-solid fa-sun"></i>'
                : '<i class="fa-solid fa-moon"></i>';
        }
        // Visible auth-nav toggle uses two pre-rendered icons; swap their visibility.
        const navMoon = document.getElementById('auth-nav-moon');
        const navSun  = document.getElementById('auth-nav-sun');
        if (navMoon && navSun) {
            navMoon.style.display = isDark ? 'none' : '';
            navSun.style.display  = isDark ? '' : 'none';
        }
    }

    initTheme();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const saved = localStorage.getItem('jotit-theme');
        if (!saved) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            updateThemeIcon();
        }
    });

    function toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('jotit-theme', next);
        updateThemeIcon();
        toast(next === 'light' ? 'Light mode' : 'Dark mode', 'info');
    }

    function applyTheme(value) {
        document.documentElement.setAttribute('data-theme', value);
        localStorage.setItem('jotit-theme', value);
        updateThemeIcon();
    }

    function resetToSystemTheme() {
        localStorage.removeItem('jotit-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        updateThemeIcon();
        toast('Following system theme', 'info');
    }

export { initTheme, updateThemeIcon, toggleTheme, applyTheme, resetToSystemTheme };
