// Leaf UI primitives: toast notifications (extracted verbatim).
    function toast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const typeIcons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const item = document.createElement('div');
        item.className = `toast-item toast-${type}`;
        item.setAttribute('role', 'alert');
        item.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        item.innerHTML = `
            <div class="toast-icon" aria-hidden="true"><i class="fa-solid ${typeIcons[type] || typeIcons.info}"></i></div>
            <div class="toast-message">${msg}</div>
            <button class="toast-dismiss-btn btn" onclick="dismissToast(this.parentElement)" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(item);
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('toast-visible')));
        const timerId = setTimeout(() => dismissToast(item), 4500);
        item.dataset.timerId = timerId;
    }

    function dismissToast(item) {
        if (!item || !item.parentElement) return;
        clearTimeout(parseInt(item.dataset.timerId));
        item.classList.remove('toast-visible');
        item.classList.add('toast-hiding');
        setTimeout(() => { if (item.parentElement) item.remove(); }, 320);
    }

export { toast, dismissToast };
