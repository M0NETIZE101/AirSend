export class UI {
    constructor() {
        this.toastTimeout = null;
    }
    
    setStatus(text, type = 'waiting') {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        
        const icon = statusEl.querySelector('.status-icon');
        const textEl = statusEl.querySelector('.status-text');
        
        statusEl.className = `status ${type}`;
        
        const icons = {
            'waiting': '⏳',
            'connected': '✅',
            'transferring': '📤',
            'error': '❌'
        };
        
        if (icon) icon.textContent = icons[type] || '⏳';
        if (textEl) textEl.textContent = text;
    }
    
    showToast(message, type = 'info') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Style
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'slideUp 0.3s ease',
            background: type === 'error' ? 'rgba(255,68,68,0.9)' :
                      type === 'success' ? 'rgba(0,212,255,0.9)' :
                      'rgba(255,255,255,0.9)',
            color: type === 'error' ? '#fff' :
                   type === 'success' ? '#fff' :
                   '#000',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        });
        
        document.body.appendChild(toast);
        
        // Auto-remove
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progress-fill');
        const textEl = document.getElementById('progress-text');
        
        if (fill) fill.style.width = percent + '%';
        if (textEl && text) textEl.textContent = text;
    }
    
    showProgress(show) {
        const progress = document.getElementById('transfer-progress');
        if (progress) {
            progress.style.display = show ? 'block' : 'none';
        }
    }
}

// Add keyframe animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);