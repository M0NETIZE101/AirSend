// ============================================
// PEER CONNECTION MANAGER
// ============================================

export class PeerManager {
    constructor(myId, options = {}) {
        this.myId = myId || null;
        this.targetId = null;
        this.isSender = options.isSender || false;
        this.peer = null;
        this.conn = null;
        this.isConnected = false;
        this.isReady = false;
        this.isConnecting = false;  // NEW: Prevent duplicate connection attempts
        this.onConnectionCallback = null;
        this.onDataCallback = null;
        this.onDisconnectCallback = null;
        this.onErrorCallback = null;
        
        this.init();
    }

    init() {
        console.log('🔧 Initializing Peer with ID:', this.myId || 'auto-assigned');
        
        this.peer = new Peer(this.myId, {
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('✅ Peer opened with ID:', id);
            this.isReady = true;
            
            if (this.targetId && !this.isSender && !this.isConnected) {
                console.log('🔄 Auto-connecting to target:', this.targetId);
                this.tryConnectToTarget();
            }
        });

        this.peer.on('connection', (conn) => {
            console.log('📥 Incoming connection from:', conn.peer);
            // Only handle if we're the sender (or not already connected)
            if (!this.isConnected) {
                this.handleConnection(conn);
            } else {
                console.log('⚠️ Already connected, ignoring duplicate connection');
                conn.close();
            }
        });

        this.peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            this.isConnecting = false;
            if (this.onErrorCallback) this.onErrorCallback(err);
        });

        this.peer.on('disconnected', () => {
            console.log('🔌 Peer disconnected');
            this.isReady = false;
            this.isConnecting = false;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.peer.on('close', () => {
            console.log('🔌 Peer closed');
            this.isReady = false;
            this.isConnecting = false;
            this.isConnected = false;
        });
    }

    setTargetId(targetId) {
        console.log('🎯 Setting target ID:', targetId);
        this.targetId = targetId;
        // If already ready and not the sender, try to connect
        if (this.isReady && !this.isSender && !this.isConnected) {
            this.tryConnectToTarget();
        }
    }

    tryConnectToTarget() {
        // Prevent duplicate connection attempts
        if (this.isConnecting) {
            console.log('⚠️ Connection already in progress, skipping duplicate');
            return;
        }
        if (!this.targetId) {
            console.warn('⚠️ No target ID set');
            return;
        }
        if (!this.isReady) {
            console.warn('⚠️ Peer not ready yet');
            return;
        }
        if (this.isConnected) {
            console.warn('⚠️ Already connected');
            return;
        }

        console.log('🔗 Attempting to connect to:', this.targetId);
        this.isConnecting = true;
        
        try {
            this.conn = this.peer.connect(this.targetId, {
                reliable: true,
                serialization: 'binary'
            });
            
            this.handleConnection(this.conn);
            
        } catch (error) {
            console.error('❌ Connection error:', error);
            this.isConnecting = false;
            if (this.onErrorCallback) this.onErrorCallback(error);
        }
    }

    handleConnection(conn) {
        // If we already have a connection, close the new one
        if (this.isConnected && this.conn) {
            console.log('⚠️ Already connected, closing duplicate connection');
            conn.close();
            return;
        }

        this.conn = conn;
        this.isConnected = false;

        conn.on('open', () => {
            console.log('✅ Connection established with:', conn.peer);
            this.isConnected = true;
            this.isConnecting = false;
            if (this.onConnectionCallback) this.onConnectionCallback();
        });

        conn.on('data', (data) => {
            if (this.onDataCallback) this.onDataCallback(data);
        });

        conn.on('close', () => {
            console.log('🔌 Connection closed');
            this.isConnected = false;
            this.isConnecting = false;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        conn.on('error', (err) => {
            console.error('❌ Connection error:', err);
            this.isConnecting = false;
            if (this.onErrorCallback) this.onErrorCallback(err);
        });
    }

    waitForConnection() {
        console.log('⏳ Sender waiting for connection...');
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout - no one joined'));
            }, 60000);

            const origCallback = this.onConnectionCallback;
            this.onConnectionCallback = () => {
                clearTimeout(timeout);
                if (origCallback) origCallback();
                resolve();
            };

            const origError = this.onErrorCallback;
            this.onErrorCallback = (err) => {
                clearTimeout(timeout);
                if (origError) origError(err);
                reject(err);
            };
        });
    }

    connectToRoom(roomCode) {
        console.log('🔗 Joiner connecting to room:', roomCode);
        // Set the target ID - this may trigger the connection if already ready
        this.setTargetId(roomCode);
        
        return new Promise((resolve, reject) => {
            // If we're already connected, resolve immediately
            if (this.isConnected) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 30000);

            const origCallback = this.onConnectionCallback;
            this.onConnectionCallback = () => {
                clearTimeout(timeout);
                if (origCallback) origCallback();
                resolve();
            };

            const origError = this.onErrorCallback;
            this.onErrorCallback = (err) => {
                clearTimeout(timeout);
                if (origError) origError(err);
                reject(err);
            };

            // If not ready yet, the 'open' event will trigger the connection
            // If ready but not connected, try to connect (setTargetId already tried)
            if (this.isReady && !this.isConnected && !this.isConnecting) {
                this.tryConnectToTarget();
            }
        });
    }

    send(data) {
        if (!this.conn || !this.isConnected) {
            console.error('❌ Cannot send: not connected');
            throw new Error('Not connected');
        }
        this.conn.send(data);
    }

    disconnect() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.isConnected = false;
        this.isReady = false;
        this.isConnecting = false;
        this.targetId = null;
    }

    onConnection(callback) {
        this.onConnectionCallback = callback;
    }

    onData(callback) {
        this.onDataCallback = callback;
    }

    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }
}