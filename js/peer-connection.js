// ============================================
// PEER CONNECTION MANAGER
// ============================================

export class PeerManager {
    constructor(myId, options = {}) {
        // myId: The ID this peer will use (sender uses room code, joiner uses null for auto-assign)
        this.myId = myId || null;
        this.targetId = null;      // The peer ID we want to connect to (joiner only)
        this.isSender = options.isSender || false;
        this.peer = null;
        this.conn = null;
        this.isConnected = false;
        this.isReady = false;      // Track if PeerJS is ready
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
            
            // If we have a target ID and we're not the sender, try to connect
            if (this.targetId && !this.isSender) {
                console.log('🔄 Auto-connecting to target:', this.targetId);
                this.tryConnectToTarget();
            }
        });

        this.peer.on('connection', (conn) => {
            console.log('📥 Incoming connection from:', conn.peer);
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            if (this.onErrorCallback) this.onErrorCallback(err);
        });

        this.peer.on('disconnected', () => {
            console.log('🔌 Peer disconnected');
            this.isReady = false;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.peer.on('close', () => {
            console.log('🔌 Peer closed');
            this.isReady = false;
        });
    }

    // Set the target peer ID to connect to (for joiner)
    setTargetId(targetId) {
        console.log('🎯 Setting target ID:', targetId);
        this.targetId = targetId;
        // If already ready, try to connect immediately
        if (this.isReady && !this.isSender) {
            this.tryConnectToTarget();
        }
    }

    // Try to connect to the target peer
    tryConnectToTarget() {
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
        
        try {
            this.conn = this.peer.connect(this.targetId, {
                reliable: true,
                serialization: 'binary'
            });
            
            this.handleConnection(this.conn);
            
        } catch (error) {
            console.error('❌ Connection error:', error);
            if (this.onErrorCallback) this.onErrorCallback(error);
        }
    }

    handleConnection(conn) {
        this.conn = conn;
        this.isConnected = false;

        conn.on('open', () => {
            console.log('✅ Connection established with:', conn.peer);
            this.isConnected = true;
            if (this.onConnectionCallback) this.onConnectionCallback();
        });

        conn.on('data', (data) => {
            if (this.onDataCallback) this.onDataCallback(data);
        });

        conn.on('close', () => {
            console.log('🔌 Connection closed');
            this.isConnected = false;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        conn.on('error', (err) => {
            console.error('❌ Connection error:', err);
            if (this.onErrorCallback) this.onErrorCallback(err);
        });
    }

    // For sender: wait for connection
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

    // For joiner: connect to a room
    connectToRoom(roomCode) {
        console.log('🔗 Joiner connecting to room:', roomCode);
        this.setTargetId(roomCode);
        
        return new Promise((resolve, reject) => {
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

            // If already ready, the connection attempt was already made
            // If not, it will be made when 'open' fires
            if (this.isReady && !this.isConnected) {
                this.tryConnectToTarget();
            }
        });
    }

    send(data) {
        if (!this.conn || !this.isConnected) {
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