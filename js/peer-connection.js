// ============================================
// PEER CONNECTION MANAGER
// ============================================

export class PeerManager {
    constructor(roomId, options = {}) {
        this.roomId = roomId;
        this.isSender = options.isSender || false;
        this.peer = null;
        this.conn = null;
        this.isConnected = false;
        this.onConnectionCallback = null;
        this.onDataCallback = null;
        this.onDisconnectCallback = null;
        this.onErrorCallback = null;
        
        this.init();
    }

    init() {
        this.peer = new Peer(this.roomId, {
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('✅ Peer opened:', id);
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            if (this.onErrorCallback) this.onErrorCallback(err);
        });

        this.peer.on('disconnected', () => {
            console.log('🔌 Peer disconnected');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });
    }

    handleConnection(conn) {
        this.conn = conn;
        this.isConnected = true;

        conn.on('open', () => {
            console.log('✅ Connection established with:', conn.peer);
            if (this.onConnectionCallback) this.onConnectionCallback();
        });

        conn.on('data', (data) => {
            if (this.onDataCallback) this.onDataCallback(data);
        });

        conn.on('close', () => {
            this.isConnected = false;
            console.log('🔌 Connection closed');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        conn.on('error', (err) => {
            console.error('❌ Connection error:', err);
            if (this.onErrorCallback) this.onErrorCallback(err);
        });
    }

    connectToRoom() {
        return new Promise((resolve, reject) => {
            try {
                this.conn = this.peer.connect(this.roomId, {
                    reliable: true,
                    serialization: 'binary'
                });
                
                this.conn.on('open', () => {
                    this.isConnected = true;
                    resolve();
                });

                this.conn.on('error', reject);
                
                // Timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 30000);

            } catch (error) {
                reject(error);
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