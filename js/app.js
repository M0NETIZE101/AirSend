import { PeerManager } from './peer-connection.js';
import { FileTransfer } from './file-transfer.js';
import { UI } from './ui.js';

class AirSendApp {
    constructor() {
        this.peer = null;
        this.roomId = null;
        this.isSender = false;
        this.fileTransfer = new FileTransfer();
        this.ui = new UI();
        
        this.init();
    }
    
    init() {
        // DOM Elements
        this.elements = {
            createRoomBtn: document.getElementById('create-room-btn'),
            joinRoomBtn: document.getElementById('join-room-btn'),
            roomInput: document.getElementById('room-input'),
            roomCode: document.getElementById('room-code'),
            copyCodeBtn: document.getElementById('copy-code-btn'),
            fileInput: document.getElementById('file-input'),
            sendFilesBtn: document.getElementById('send-files-btn'),
            fileList: document.getElementById('file-list'),
            connectionStatus: document.getElementById('connection-status'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            transferProgress: document.getElementById('transfer-progress'),
            receivedFiles: document.getElementById('received-files'),
            qrContainer: document.getElementById('qr-code'),
            createSection: document.getElementById('create-section'),
            roomSection: document.getElementById('room-section'),
            senderControls: document.getElementById('sender-controls'),
            receiverControls: document.getElementById('receiver-controls'),
        };
        
        this.bindEvents();
        this.checkURLParams();
    }
    
    bindEvents() {
        // Create Room
        this.elements.createRoomBtn.addEventListener('click', () => {
            this.createRoom();
        });
        
        // Join Room
        this.elements.joinRoomBtn.addEventListener('click', () => {
            const roomId = this.elements.roomInput.value.trim().toUpperCase();
            if (roomId.length === 6) {
                this.joinRoom(roomId);
            } else {
                this.ui.showToast('Please enter a 6-digit code', 'error');
            }
        });
        
        // Copy Code
        this.elements.copyCodeBtn.addEventListener('click', () => {
            if (this.roomId) {
                navigator.clipboard.writeText(this.roomId);
                this.ui.showToast('✅ Room code copied!', 'success');
            }
        });
        
        // File Input
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.elements.fileInput.value = '';
        });
        
        // Send Files
        this.elements.sendFilesBtn.addEventListener('click', () => {
            this.sendFiles();
        });
        
        // Enter key for room input
        this.elements.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.elements.joinRoomBtn.click();
            }
        });
        
        // Drag and Drop
        const dropArea = document.querySelector('.file-drop-area');
        if (dropArea) {
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.classList.add('drag-over');
            });
            
            dropArea.addEventListener('dragleave', () => {
                dropArea.classList.remove('drag-over');
            });
            
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });
        }
    }
    
    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room');
        if (roomId && roomId.length === 6) {
            this.elements.roomInput.value = roomId;
            this.joinRoom(roomId);
        }
    }
    
    async createRoom() {
        try {
            this.ui.setStatus('Creating room...', 'waiting');
            
            // Generate 6-digit room code
            this.roomId = this.generateRoomId();
            this.isSender = true;
            
            // Initialize PeerJS with room ID
            this.peer = new PeerManager(this.roomId);
            
            // Wait for connection
            await this.peer.waitForConnection();
            
            this.setupRoomUI();
            this.ui.setStatus('✅ Room created! Share the code.', 'connected');
            this.ui.showToast('✅ Room created! Share the code with others.', 'success');
            
            // Show QR code
            this.generateQRCode(this.roomId);
            
        } catch (error) {
            console.error('Create room error:', error);
            this.ui.setStatus('❌ Failed to create room', 'error');
            this.ui.showToast('❌ Failed to create room: ' + error.message, 'error');
        }
    }
    
    async joinRoom(roomId) {
        try {
            this.ui.setStatus('Joining room...', 'waiting');
            
            this.roomId = roomId.toUpperCase();
            this.isSender = false;
            
            // Initialize PeerJS with room ID
            this.peer = new PeerManager(this.roomId);
            
            // Connect to existing room
            await this.peer.connectToRoom();
            
            this.setupRoomUI();
            this.ui.setStatus('✅ Connected!', 'connected');
            this.ui.showToast('✅ Connected to room!', 'success');
            
            // Show receiver UI
            this.elements.receiverControls.style.display = 'block';
            this.elements.senderControls.style.display = 'none';
            
            // Listen for incoming files
            this.peer.onFileReceived((fileData) => {
                this.handleReceivedFile(fileData);
            });
            
        } catch (error) {
            console.error('Join room error:', error);
            this.ui.setStatus('❌ Failed to join room', 'error');
            this.ui.showToast('❌ Failed to join room: ' + error.message, 'error');
        }
    }
    
    setupRoomUI() {
        // Switch sections
        this.elements.createSection.style.display = 'none';
        this.elements.roomSection.style.display = 'block';
        
        // Show room code
        this.elements.roomCode.textContent = this.roomId;
        
        // Show sender controls if sender
        if (this.isSender) {
            this.elements.senderControls.style.display = 'block';
            this.elements.receiverControls.style.display = 'none';
        }
        
        // Update URL with room code
        const url = new URL(window.location);
        url.searchParams.set('room', this.roomId);
        window.history.pushState({}, '', url);
    }
    
    generateQRCode(text) {
        if (this.elements.qrContainer) {
            this.elements.qrContainer.innerHTML = '';
            new QRCode(this.elements.qrContainer, {
                text: text,
                width: 150,
                height: 150,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }
    
    generateRoomId() {
        const chars = '0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * 10)];
        }
        return code;
    }
    
    handleFiles(files) {
        if (!files || files.length === 0) return;
        
        // Add files to transfer queue
        this.fileTransfer.addFiles(files);
        
        // Update UI
        this.renderFileList();
        this.elements.sendFilesBtn.style.display = 'block';
        this.ui.showToast(`📁 ${files.length} file(s) added`, 'success');
    }
    
    renderFileList() {
        const files = this.fileTransfer.getFiles();
        const list = this.elements.fileList;
        
        if (files.length === 0) {
            list.innerHTML = '';
            return;
        }
        
        list.innerHTML = files.map((file, index) => `
            <div class="file-item">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <button class="file-remove" data-index="${index}">✕</button>
            </div>
        `).join('');
        
        // Add remove event listeners
        list.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.fileTransfer.removeFile(index);
                this.renderFileList();
                
                if (this.fileTransfer.getFiles().length === 0) {
                    this.elements.sendFilesBtn.style.display = 'none';
                }
            });
        });
    }
    
    async sendFiles() {
        const files = this.fileTransfer.getFiles();
        if (files.length === 0) return;
        
        this.elements.sendFilesBtn.disabled = true;
        this.elements.sendFilesBtn.textContent = '⏳ Sending...';
        
        try {
            // Send each file
            for (const file of files) {
                const reader = new FileReader();
                
                const fileData = await new Promise((resolve) => {
                    reader.onload = (e) => {
                        resolve({
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: e.target.result
                        });
                    };
                    reader.readAsArrayBuffer(file);
                });
                
                // Send file via peer connection
                this.peer.sendFile(fileData);
                
                // Show progress
                this.ui.setStatus(`📤 Sending ${file.name}...`, 'transferring');
                this.elements.transferProgress.style.display = 'block';
            }
            
            this.ui.showToast('✅ Files sent successfully!', 'success');
            this.fileTransfer.clearFiles();
            this.renderFileList();
            this.elements.sendFilesBtn.style.display = 'none';
            
        } catch (error) {
            console.error('Send error:', error);
            this.ui.showToast('❌ Failed to send files: ' + error.message, 'error');
        }
        
        this.elements.sendFilesBtn.disabled = false;
        this.elements.sendFilesBtn.innerHTML = '<span class="icon">🚀</span> Send All Files';
    }
    
    handleReceivedFile(fileData) {
        // Create download link
        const blob = new Blob([fileData.data], { type: fileData.type });
        const url = URL.createObjectURL(blob);
        
        // Add to received files list
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        downloadItem.innerHTML = `
            <span>📄 ${fileData.name}</span>
            <span style="font-size:12px;color:#666688;">${this.formatFileSize(fileData.size)}</span>
            <a href="${url}" download="${fileData.name}" class="download-btn">⬇️</a>
        `;
        this.elements.receivedFiles.appendChild(downloadItem);
        
        // Hide progress
        this.elements.transferProgress.style.display = 'none';
        this.ui.setStatus('✅ File received!', 'connected');
        this.ui.showToast(`✅ Received: ${fileData.name}`, 'success');
        
        // Auto-download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileData.name;
        link.click();
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new AirSendApp();
});