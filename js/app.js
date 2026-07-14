// ============================================
// MAIN APPLICATION
// ============================================

import { Utils } from './utils.js';
import { PeerManager } from './peer-connection.js';
import { FileManager } from './file-transfer.js';
import { ChatManager } from './chat.js';

export class App {
    constructor() {
        this.state = {
            roomId: null,
            isSender: false,
            peerManager: null,
            isConnected: false,
            transferStartTime: null
        };

        this.fileManager = new FileManager();
        this.chatManager = new ChatManager();
        this.pages = {};
        this.elements = {};

        this.init();
    }

    async init() {
        await this.loadPages();
        this.cacheElements();
        this.setupEventListeners();
        this.handleURLParams();

        if (this.chatManager && typeof this.chatManager.onNewMessage === 'function') {
            this.chatManager.onNewMessage((message) => {
                this.renderChatMessages();
            });
        }

        console.log('✅ App initialized');
        console.log('📱 Open in another tab or device to test P2P');
    }

    async loadPages() {
        const pages = ['landing', 'waiting', 'sender', 'receiver', 'confirmation'];
        for (const page of pages) {
            try {
                const response = await fetch(`pages/${page}.html`);
                if (response.ok) {
                    const content = await response.text();
                    const container = document.getElementById(`page-${page}`);
                    if (container) {
                        container.innerHTML = content;
                    }
                } else {
                    console.warn(`⚠️ Could not load page: ${page}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error loading page ${page}:`, error);
            }
        }
    }

    cacheElements() {
        this.pages = {
            landing: document.getElementById('page-landing'),
            waiting: document.getElementById('page-waiting'),
            sender: document.getElementById('page-sender'),
            receiver: document.getElementById('page-receiver'),
            confirmation: document.getElementById('page-confirmation')
        };
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="create-room"]');
            if (target) {
                console.log('🖱️ Create Room clicked');
                this.createRoom();
            }
        });

        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="join-room"]');
            if (target) {
                console.log('🖱️ Join Room clicked');
                this.joinRoom();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('code-box')) {
                this.handleCodeInput(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="send-chat"]');
            if (target) {
                this.sendChatMessage();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                if (target.id === 'sender-chat-input' || target.id === 'receiver-chat-input') {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            }
        });

        setTimeout(() => {
            this.setupFileDrop();
        }, 500);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const inputs = document.querySelectorAll('#landing-room-inputs .code-box');
                let allFilled = true;
                inputs.forEach(input => {
                    if (!input.value) allFilled = false;
                });
                if (allFilled && inputs.length > 0) {
                    this.joinRoom();
                }
            }
        });
    }

    handleCodeInput(input) {
        const val = input.value.replace(/\D/g, '');
        input.value = val.slice(0, 1);
        
        const inputs = document.querySelectorAll('#landing-room-inputs .code-box');
        const index = Array.from(inputs).indexOf(input);
        
        if (val && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    }

    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room && room.length === 6) {
            setTimeout(() => {
                const inputs = document.querySelectorAll('#landing-room-inputs .code-box');
                const digits = room.split('');
                inputs.forEach((input, i) => {
                    if (digits[i]) input.value = digits[i];
                });
                this.joinRoom();
            }, 500);
        }

        const hash = window.location.hash.replace('#', '');
        if (hash && ['landing', 'waiting', 'sender', 'receiver', 'confirmation'].includes(hash)) {
            this.navigateTo(hash);
        }
    }

    setupFileDrop() {
        const dropZone = document.getElementById('sender-drop-zone');
        const fileInput = document.getElementById('sender-file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });
            
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    this.handleFiles(fileInput.files);
                    fileInput.value = '';
                }
            });
        }
    }

    navigateTo(page) {
        Object.values(this.pages).forEach(p => {
            if (p) p.classList.remove('active');
        });
        if (this.pages[page]) {
            this.pages[page].classList.add('active');
        }
        window.location.hash = page;
        window.scrollTo(0, 0);
    }

    // ============================================
    // ROOM MANAGEMENT
    // ============================================

    createRoom() {
        try {
            console.log('🚀 Creating room...');
            
            const roomId = Utils.generateRoomId();
            this.state.roomId = roomId;
            this.state.isSender = true;
            
            console.log('📋 Room ID:', roomId);

            this.state.peerManager = new PeerManager(roomId, { isSender: true });
            
            this.state.peerManager.onConnection(() => {
                console.log('✅ Peer connected!');
                this.state.isConnected = true;
                Utils.showToast('✅ Peer connected!', 'success');
                this.navigateTo('sender');
                this.updateSenderUI();
            });

            this.state.peerManager.onError((err) => {
                console.error('❌ Peer error:', err);
                Utils.showToast('❌ Connection error: ' + err.message, 'error');
            });

            this.state.peerManager.onData((data) => {
                console.log('📨 Data received:', data.type);
                if (data.type === 'chat') {
                    this.chatManager.receiveMessage(data);
                    this.renderChatMessages();
                }
                if (data.type === 'file') {
                    this.handleReceivedFile(data);
                }
            });

            this.state.peerManager.onDisconnect(() => {
                console.log('🔌 Peer disconnected');
                this.state.isConnected = false;
                Utils.showToast('🔌 Connection lost', 'error');
            });

            this.state.peerManager.waitForConnection()
                .then(() => {
                    console.log('✅ Peer connected successfully!');
                })
                .catch((err) => {
                    console.error('❌ Connection failed:', err);
                    Utils.showToast('❌ Connection failed: ' + err.message, 'error');
                });

            this.showWaitingRoom(roomId);
            Utils.showToast('✅ Room created: ' + roomId, 'success');

        } catch (error) {
            console.error('❌ Create room error:', error);
            Utils.showToast('❌ Failed to create room: ' + error.message, 'error');
        }
    }

    joinRoom() {
        try {
            console.log('🚀 Joining room...');
            
            const inputs = document.querySelectorAll('#landing-room-inputs .code-box');
            let code = '';
            inputs.forEach(input => code += input.value);

            if (code.length !== 6) {
                Utils.showToast('Please enter all 6 digits', 'error');
                return;
            }

            console.log('📋 Joining room:', code);

            this.state.roomId = code;
            this.state.isSender = false;

            this.state.peerManager = new PeerManager(null, { isSender: false });
            
            this.state.peerManager.onConnection(() => {
                console.log('✅ Connected to sender!');
                this.state.isConnected = true;
                Utils.showToast('✅ Connected to sender!', 'success');
                this.navigateTo('receiver');
                this.updateReceiverUI();
            });

            this.state.peerManager.onError((err) => {
                console.error('❌ Connection error:', err);
                Utils.showToast('❌ Failed to connect: ' + err.message, 'error');
            });

            this.state.peerManager.onData((data) => {
                console.log('📨 Data received:', data.type);
                if (data.type === 'file') {
                    this.handleReceivedFile(data);
                }
                if (data.type === 'chat') {
                    this.chatManager.receiveMessage(data);
                    this.renderChatMessages();
                }
            });

            this.state.peerManager.onDisconnect(() => {
                console.log('🔌 Disconnected from sender');
                this.state.isConnected = false;
                Utils.showToast('🔌 Connection lost', 'error');
            });

            this.navigateTo('waiting');
            const statusEl = document.getElementById('waiting-status');
            if (statusEl) statusEl.textContent = 'Connecting to room...';

            console.log('🔗 Attempting to connect to:', code);
            
            this.state.peerManager.connectToRoom(code)
                .then(() => {
                    console.log('✅ Successfully connected to room!');
                })
                .catch((err) => {
                    console.error('❌ Failed to connect:', err);
                    Utils.showToast('❌ Failed to join: ' + err.message, 'error');
                    setTimeout(() => {
                        this.navigateTo('landing');
                    }, 2000);
                });

        } catch (error) {
            console.error('❌ Join room error:', error);
            Utils.showToast('❌ Failed to join: ' + error.message, 'error');
        }
    }

    showWaitingRoom(roomId) {
        const qrContainer = document.getElementById('waiting-qr');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            try {
                new QRCode(qrContainer, {
                    text: roomId,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
                console.log('✅ QR code generated');
            } catch (e) {
                console.warn('QR generation error:', e);
                qrContainer.innerHTML = `<p class="text-on-surface-variant">Room Code: ${roomId}</p>`;
            }
        }

        const boxes = document.querySelectorAll('#waiting-room-codes .code-box');
        const digits = roomId.split('');
        boxes.forEach((box, i) => {
            box.textContent = digits[i] || '-';
        });

        const statusEl = document.getElementById('waiting-status');
        if (statusEl) statusEl.textContent = '⏳ Waiting for someone to join...';
        this.navigateTo('waiting');
    }

    // ============================================
    // SENDER FUNCTIONS
    // ============================================

    handleFiles(files) {
        const added = this.fileManager.addFiles(files);
        this.renderSenderFileList();
        Utils.showToast(`📁 ${added.length} file(s) added`, 'success');
    }

    renderSenderFileList() {
        const list = document.getElementById('sender-file-list');
        const count = document.getElementById('sender-file-count');
        const badge = document.getElementById('sender-total-badge');
        const sendBtn = document.getElementById('sender-send-btn');

        if (!list) return;

        const files = this.fileManager.getFiles();
        
        if (count) count.textContent = files.length;
        if (badge) badge.textContent = `${files.length} TOTAL`;
        if (sendBtn) sendBtn.disabled = files.length === 0;

        if (files.length === 0) {
            list.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">No files added yet</p>';
            this.updateStorageBar(0);
            return;
        }

        list.innerHTML = files.map((file, index) => `
            <div class="file-item">
                <span class="text-sm font-medium truncate flex-1">${file.name}</span>
                <span class="text-xs text-on-surface-variant mx-2">${Utils.formatFileSize(file.size)}</span>
                <button onclick="window.app.removeFile(${index})" class="text-error hover:bg-error-container/20 p-1 rounded transition-colors">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        `).join('');

        const totalSize = this.fileManager.getTotalSize();
        const maxSize = 12 * 1024 * 1024 * 1024;
        const percent = Math.min((totalSize / maxSize) * 100, 100);
        this.updateStorageBar(percent);
    }

    updateStorageBar(percent) {
        const bar = document.getElementById('sender-storage-bar');
        const text = document.getElementById('sender-storage-text');
        if (bar) bar.style.width = percent + '%';
        if (text) text.textContent = Math.round(percent) + '%';
    }

    removeFile(index) {
        this.fileManager.removeFile(index);
        this.renderSenderFileList();
    }

    clearFiles() {
        this.fileManager.clearFiles();
        this.renderSenderFileList();
        Utils.showToast('🗑️ Files cleared', 'info');
    }

    // ============================================
    // FIXED: SEND ALL FILES
    // ============================================

    async sendAllFiles() {
        const files = this.fileManager.getFiles();
        if (files.length === 0 || !this.state.peerManager || !this.state.isConnected) {
            Utils.showToast('❌ No files to send or not connected', 'error');
            return;
        }

        const btn = document.getElementById('sender-send-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Sending...';
        }

        this.state.transferStartTime = Date.now();
        const totalFiles = files.length;
        let sentCount = 0;

        for (const file of files) {
            try {
                const fileData = await this.fileManager.readFileAsBuffer(file);
                // ✅ FIXED: Proper message format with type: 'file'
                this.state.peerManager.send({
                    type: 'file',  // ← This MUST be 'file'
                    payload: {
                        name: fileData.name,
                        mimeType: fileData.type || 'application/octet-stream',
                        size: fileData.size,
                        data: fileData.data
                    }
                });
                sentCount++;
                if (btn) btn.textContent = `⏳ Sending ${sentCount}/${totalFiles}`;
                Utils.showToast(`📤 Sent ${file.name}`, 'info');
            } catch (error) {
                console.error('Send error:', error);
                Utils.showToast(`❌ Failed to send ${file.name}`, 'error');
            }
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send All Files';
        }
        Utils.showToast('✅ All files sent!', 'success');
        
        // Show confirmation after all files are sent
        this.showConfirmation(files);
    }

    updateSenderUI() {
        const peerName = this.state.peerManager?.conn?.peer || 'Connected';
        const nameEl = document.getElementById('sender-peer-name');
        if (nameEl) nameEl.textContent = peerName;
        this.renderSenderFileList();
    }

    // ============================================
    // FIXED: HANDLE RECEIVED FILE
    // ============================================

    handleReceivedFile(data) {
        console.log('📨 Handling received data:', data);
        
        // ✅ FIXED: Handle the new format with 'payload'
        let fileData;
        if (data.payload) {
            // New format (with payload)
            fileData = {
                name: data.payload.name || 'unknown',
                type: data.payload.mimeType || 'application/octet-stream',
                size: data.payload.size || data.payload.data?.byteLength || 0,
                data: data.payload.data
            };
        } else {
            // Legacy format (backward compatible)
            fileData = {
                name: data.name || 'unknown',
                type: data.type || 'application/octet-stream',
                size: data.size || data.data?.byteLength || 0,
                data: data.data
            };
        }

        console.log('📄 File received:', fileData.name, Utils.formatFileSize(fileData.size));
        
        // Add to received files
        const file = this.fileManager.addReceivedFile(fileData);
        
        // Show notification
        Utils.showToast(`📥 Received: ${fileData.name} (${Utils.formatFileSize(fileData.size)})`, 'success');
        
        // Update UI
        this.renderReceiverFiles();
        this.updateReceiverStatus();
        
        // Auto-download
        this.downloadFile(file.id);
    }

    downloadFile(fileId) {
        const file = this.fileManager.getReceivedFile(fileId);
        if (!file) {
            console.warn('⚠️ File not found:', fileId);
            return;
        }
        
        console.log('📥 Downloading:', file.name);
        
        try {
            const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('✅ Download started:', file.name);
        } catch (error) {
            console.error('❌ Download error:', error);
            Utils.showToast('❌ Failed to download file', 'error');
        }
    }

    downloadAllFiles() {
        const files = this.fileManager.getReceivedFiles();
        if (files.length === 0) {
            Utils.showToast('❌ No files to download', 'error');
            return;
        }
        files.forEach(f => this.downloadFile(f.id));
        Utils.showToast(`📥 Downloading ${files.length} files...`, 'success');
    }

    renderReceiverFiles() {
        const list = document.getElementById('receiver-received-list');
        const badge = document.getElementById('receiver-active-badge');
        
        if (!list) return;

        const files = this.fileManager.getReceivedFiles();
        const activeCount = this.fileManager.getActiveTransfers().length;
        
        if (badge) badge.textContent = `${activeCount} IN PROGRESS`;

        this.renderActiveTransfers();

        if (files.length === 0) {
            list.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-4">No files received yet</p>';
            return;
        }

        // Show files with download buttons
        list.innerHTML = files.slice(-10).reverse().map(f => `
            <div class="py-sm flex items-center justify-between group cursor-pointer hover:bg-surface-container-low rounded-lg px-2 transition-colors">
                <div class="flex items-center gap-sm flex-1 min-w-0">
                    <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">${Utils.getFileIcon(f.name)}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-body-sm font-medium text-on-surface truncate">${f.name}</p>
                        <p class="text-[12px] text-on-surface-variant">${f.time || 'Just now'} • ${Utils.formatFileSize(f.size)}</p>
                    </div>
                </div>
                <button onclick="window.app.downloadFile('${f.id}')" class="material-symbols-outlined text-outline hover:text-primary p-2 rounded-full hover:bg-primary-container/10 transition-all">
                    download
                </button>
            </div>
        `).join('');
    }

    renderActiveTransfers() {
        const activeList = document.getElementById('receiver-active-list');
        if (!activeList) return;
        
        const transfers = this.fileManager.getActiveTransfers();
        
        if (transfers.length === 0) {
            activeList.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-4">No active transfers</p>';
            return;
        }

        activeList.innerHTML = transfers.map(t => `
            <div class="p-sm bg-surface-container-low rounded-lg border border-outline-variant/30">
                <div class="flex justify-between items-start mb-base">
                    <div class="flex items-center gap-sm">
                        <div class="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${Utils.getFileIcon(t.name)}</span>
                        </div>
                        <div>
                            <p class="font-bold text-on-surface text-body-sm truncate max-w-[150px]">${t.name}</p>
                            <p class="text-on-surface-variant text-[12px]">Receiving...</p>
                        </div>
                    </div>
                    <span class="text-primary font-bold text-body-sm">${Math.round(t.progress || 0)}%</span>
                </div>
                <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-sm">
                    <div class="progress-fill" style="width: ${t.progress || 0}%"></div>
                </div>
            </div>
        `).join('');
    }

    updateReceiverStatus() {
        const title = document.getElementById('receiver-status-title');
        const sub = document.getElementById('receiver-status-sub');
        const container = document.getElementById('receiver-status-container');
        
        if (!title || !container) return;

        const files = this.fileManager.getReceivedFiles();
        const activeCount = this.fileManager.getActiveTransfers().length;
        
        if (activeCount > 0) {
            title.textContent = '📥 Receiving files...';
            if (sub) sub.textContent = 'Your files are being transferred securely.';
            container.className = 'bg-surface-container-lowest rounded-xl p-xl shadow-[0_2px_12px_rgba(26,26,43,0.04)] border border-surface-container flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden group hover:shadow-[0_8px_24px_rgba(26,26,43,0.08)] transition-all duration-300';
        } else if (files.length > 0) {
            title.textContent = '✅ Files received!';
            if (sub) sub.textContent = `${files.length} file(s) have been delivered.`;
            container.className = 'bg-[#E8F5E9] rounded-xl p-xl shadow-[0_2px_12px_rgba(26,26,43,0.04)] border border-[#B1E5C4] flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden group hover:shadow-[0_8px_24px_rgba(26,26,43,0.08)] transition-all duration-300';
        } else {
            title.textContent = 'Waiting for files...';
            if (sub) sub.textContent = 'Share your secure link to start receiving encrypted shipments. Your connection is live and listening.';
            container.className = 'bg-surface-container-lowest rounded-xl p-xl shadow-[0_2px_12px_rgba(26,26,43,0.04)] border border-surface-container flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden group hover:shadow-[0_8px_24px_rgba(26,26,43,0.08)] transition-all duration-300';
        }
    }

    updateReceiverUI() {
        this.renderReceiverFiles();
        this.updateReceiverStatus();
    }

    // ============================================
    // CHAT FUNCTIONS
    // ============================================

    sendChatMessage() {
        const isSender = this.pages.sender?.classList.contains('active');
        const inputId = isSender ? 'sender-chat-input' : 'receiver-chat-input';
        const input = document.getElementById(inputId);
        
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;

        const success = this.chatManager.sendMessage(text, this.state.peerManager);
        if (success) {
            input.value = '';
            this.renderChatMessages();
        }
    }

    renderChatMessages() {
        const isSender = this.pages.sender?.classList.contains('active');
        const isReceiver = this.pages.receiver?.classList.contains('active');
        
        if (isSender) {
            this.chatManager.renderMessages('sender-chat-messages');
        }
        if (isReceiver) {
            this.chatManager.renderMessages('receiver-chat-messages');
        }
    }

    // ============================================
    // CONFIRMATION FUNCTIONS
    // ============================================

    showConfirmation(files) {
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        const elapsed = this.state.transferStartTime ? 
            ((Date.now() - this.state.transferStartTime) / 1000).toFixed(1) : '0.0';

        const totalSizeEl = document.getElementById('confirmation-total-size');
        const totalFilesEl = document.getElementById('confirmation-total-files');
        const timeEl = document.getElementById('confirmation-time');
        const messageEl = document.getElementById('confirmation-message');
        const fileListEl = document.getElementById('confirmation-file-list');
        const channelEl = document.getElementById('confirmation-channel');

        if (totalSizeEl) totalSizeEl.textContent = Utils.formatFileSize(totalSize);
        if (totalFilesEl) totalFilesEl.textContent = files.length + ' Items';
        if (timeEl) timeEl.textContent = elapsed + ' Seconds';
        if (messageEl) messageEl.textContent = `${files.length} file(s) have been successfully delivered.`;

        if (fileListEl) {
            fileListEl.innerHTML = files.map(f => `
                <div class="flex items-center gap-sm p-sm bg-surface-container-low rounded-lg transition-all hover:shadow-md">
                    <span class="material-symbols-outlined text-primary p-2 bg-white rounded-lg">${Utils.getFileIcon(f.name)}</span>
                    <div class="flex-grow">
                        <p class="font-body-md text-body-md font-semibold">${f.name}</p>
                        <p class="font-body-sm text-body-sm text-on-surface-variant">${Utils.formatFileSize(f.size)} • Uploaded just now</p>
                    </div>
                    <span class="material-symbols-outlined text-success-green">verified</span>
                </div>
            `).join('');
        }

        if (channelEl) channelEl.textContent = 'AirSend Transfer';

        this.fireConfetti();
        this.navigateTo('confirmation');
    }

    fireConfetti() {
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setTimeout(() => {
                confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
            }, 300);
            setTimeout(() => {
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 } });
            }, 600);
        }
    }

    sendMoreFiles() {
        this.navigateTo('sender');
        this.updateSenderUI();
        Utils.showToast('📤 Ready to send more files', 'info');
    }

    closeRoom() {
        if (this.state.peerManager) {
            this.state.peerManager.disconnect();
        }
        
        this.state.isConnected = false;
        this.state.roomId = null;
        this.fileManager.clearFiles();
        this.fileManager.clearReceivedFiles();
        this.chatManager.clearMessages();
        
        Utils.showToast('🔌 Room closed', 'info');
        this.navigateTo('landing');
    }

    copyInviteLink() {
        const url = window.location.href.split('?')[0] + '?room=' + this.state.roomId;
        navigator.clipboard.writeText(url).then(() => {
            Utils.showToast('✅ Invite link copied!', 'success');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Utils.showToast('✅ Invite link copied!', 'success');
        });
    }
}
