export class FileTransfer {
    constructor() {
        this.files = [];
        this.maxSize = 100 * 1024 * 1024; // 100MB
    }
    
    addFiles(fileList) {
        for (const file of fileList) {
            if (file.size > this.maxSize) {
                console.warn(`File ${file.name} exceeds 100MB limit`);
                continue;
            }
            this.files.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            });
        }
        return this.files;
    }
    
    removeFile(index) {
        if (index >= 0 && index < this.files.length) {
            this.files.splice(index, 1);
        }
        return this.files;
    }
    
    getFiles() {
        return this.files;
    }
    
    clearFiles() {
        this.files = [];
    }
    
    getTotalSize() {
        return this.files.reduce((total, file) => total + file.size, 0);
    }
    
    getFileCount() {
        return this.files.length;
    }
}