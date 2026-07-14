// ============================================
// UTILITY FUNCTIONS
// ============================================

export const Utils = {
    // Format file size
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
        return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1) + ' TB';
    },

    // Get file icon based on extension
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
            'svg': 'image', 'webp': 'image', 'mp4': 'movie', 'mov': 'movie',
            'avi': 'movie', 'mkv': 'movie', 'pdf': 'description', 'doc': 'description',
            'docx': 'description', 'xls': 'table_chart', 'xlsx': 'table_chart',
            'ppt': 'slideshow', 'pptx': 'slideshow', 'zip': 'folder', 'rar': 'folder',
            '7z': 'folder', 'txt': 'description', 'json': 'code', 'js': 'code',
            'html': 'code', 'css': 'code', 'xml': 'code', 'mp3': 'music_note',
            'wav': 'music_note', 'flac': 'music_note', 'exe': 'settings',
            'dmg': 'settings', 'apk': 'settings'
        };
        return icons[ext] || 'insert_drive_file';
    },

    // Generate random room ID
    generateRoomId() {
        const chars = '0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * 10)];
        }
        return code;
    },

    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};