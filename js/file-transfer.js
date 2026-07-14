// ============================================
// FILE TRANSFER MANAGER
// ============================================

import { Utils } from './utils.js';

export class FileManager {
    constructor() {
        this.files = [];
        this.receivedFiles = [];
        this.activeTransfers = {};
        this.maxFileSize = 12 * 1024 * 1024 * 1024; // 12GB
    }

    addFiles(fileList) {
        const added = [];
        for (const file of fileList) {
            if (file.size > this.maxFileSize) {
                Utils.showToast(`❌ ${file.name} exceeds 12GB limit`, 'error');
                continue;
            }
            const fileObj = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            };
            this.files.push(fileObj);
            added.push(fileObj);
        }
        return added;
    }

    removeFile(index) {
        if (index >= 0 && index < this.files.length) {
            this.files.splice(index, 1);
            return true;
        }
        return false;
    }

    getFiles() {
        return this.files;
    }

    getFileCount() {
        return this.files.length;
    }

    getTotalSize() {
        return this.files.reduce((sum, f) => sum + f.size, 0);
    }

    clearFiles() {
        this.files = [];
    }

    // Received files
    addReceivedFile(data) {
        const file = {
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: data.name,
            size: data.size,
            type: data.type || 'application/octet-stream',
            data: data.data,
            time: new Date().toLocaleTimeString()
        };
        this.receivedFiles.push(file);
        return file;
    }

    getReceivedFiles() {
        return this.receivedFiles;
    }

    getReceivedFile(id) {
        return this.receivedFiles.find(f => f.id === id);
    }

    clearReceivedFiles() {
        this.receivedFiles = [];
    }

    // Active transfers
    addActiveTransfer(id, name, size) {
        this.activeTransfers[id] = {
            id: id,
            name: name,
            size: size,
            progress: 0
        };
        return this.activeTransfers[id];
    }

    updateActiveTransfer(id, progress) {
        if (this.activeTransfers[id]) {
            this.activeTransfers[id].progress = Math.min(progress, 100);
        }
    }

    removeActiveTransfer(id) {
        delete this.activeTransfers[id];
    }

    getActiveTransfers() {
        return Object.values(this.activeTransfers);
    }

    // Read file as ArrayBuffer
    readFileAsBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    data: e.target.result
                });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file.file || file);
        });
    }
}