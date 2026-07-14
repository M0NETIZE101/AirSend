// ============================================
// CHAT MANAGER
// ============================================

import { Utils } from './utils.js';

export class ChatManager {
    constructor() {
        this.messages = [];
        this.onNewMessageCallback = null;
    }

    // Send a message
    sendMessage(text, peerManager) {
        if (!text || !text.trim()) return false;
        if (!peerManager || !peerManager.isConnected) {
            Utils.showToast('❌ Not connected to a peer', 'error');
            return false;
        }

        const message = {
            type: 'chat',
            message: text.trim(),
            sender: 'You',
            timestamp: new Date().toLocaleTimeString()
        };

        try {
            peerManager.send(message);
            this.addMessage(message);
            return true;
        } catch (error) {
            console.error('Send error:', error);
            Utils.showToast('❌ Failed to send message', 'error');
            return false;
        }
    }

    // Receive a message
    receiveMessage(data) {
        const message = {
            type: 'chat',
            message: data.message,
            sender: data.sender || 'Peer',
            timestamp: new Date().toLocaleTimeString()
        };
        this.addMessage(message);
        return message;
    }

    // Add message to history
    addMessage(message) {
        this.messages.push(message);
        if (this.onNewMessageCallback) {
            this.onNewMessageCallback(message);
        }
    }

    // Get all messages
    getMessages() {
        return this.messages;
    }

    // Clear messages
    clearMessages() {
        this.messages = [];
    }

    // Render messages to a container
    renderMessages(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear container (keep empty state if no messages)
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="text-center text-xs text-on-surface-variant py-4">
                    No messages yet. Start the conversation!
                </div>
            `;
            return;
        }

        container.innerHTML = this.messages.map(msg => {
            const isSelf = msg.sender === 'You';
            return `
                <div class="flex flex-col ${isSelf ? 'items-end' : 'items-start'} animate-slideIn">
                    <div class="max-w-[80%] ${isSelf ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface'} rounded-lg px-3 py-2 text-sm break-words">
                        ${this.escapeHtml(msg.message)}
                    </div>
                    <span class="text-[10px] text-on-surface-variant mt-0.5 px-1">${msg.sender} • ${msg.timestamp}</span>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Set callback for new messages
    onNewMessage(callback) {
        this.onNewMessageCallback = callback;
    }
}