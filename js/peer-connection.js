export class PeerManager {
    constructor(roomId) {
        this.roomId = roomId;
        this.peer = null;
        this.conn = null;
        this.isSender = false;
        this.onFileCallback = null;
        this.connectionPromise = null;
        this.connectionResolve = null;
        this.connectionReject = null;
        
        this.init();
    }
    
    init() {
        // Use PeerJS with free signaling server
        this.peer = new Peer(this.roomId, {
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });
        
        // Setup error handling
        this.peer.on('error', (error) => {
            console.error('PeerJS error:', error);
            if (this.connectionReject) {
                this.connectionReject(error);
            }
        });
        
        // Setup connection handler (for receivers)
        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });
    }
    
    waitForConnection() {
        this.isSender = true;
        
        // Wait for someone to connect
        return new Promise((resolve, reject) => {
            this.connectionResolve = resolve;
            this.connectionReject = reject;
            
            // Timeout after 60 seconds
            setTimeout(() => {
                if (!this.conn) {
                    reject(new Error('Connection timeout'));
                }
            }, 60000);
        });
    }
    
    connectToRoom() {
        this.isSender = false;
        
        return new Promise((resolve, reject) => {
            this.connectionResolve = resolve;
            this.connectionReject = reject;
            
            try {
                // Connect to the room
                this.conn = this.peer.connect(this.roomId, {
                    reliable: true,
                    serialization: 'binary'
                });
                
                this.handleConnection(this.conn);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    handleConnection(conn) {
        this.conn = conn;
        
        conn.on('open', () => {
            console.log('✅ Peer connection established');
            if (this.connectionResolve) {
                this.connectionResolve();
            }
        });
        
        conn.on('data', (data) => {
            // Check if it's a file transfer
            if (data && data.type === 'file') {
                if (this.onFileCallback) {
                    this.onFileCallback(data);
                }
            }
        });
        
        conn.on('close', () => {
            console.log('🔌 Peer connection closed');
        });
        
        conn.on('error', (error) => {
            console.error('Connection error:', error);
        });
    }
    
    sendFile(fileData) {
        if (!this.conn || this.conn.close) {
            throw new Error('No active connection');
        }
        
        // Send file with type marker
        this.conn.send({
            type: 'file',
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            data: fileData.data
        });
    }
    
    onFileReceived(callback) {
        this.onFileCallback = callback;
    }
    
    disconnect() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
    }
    
    isConnected() {
        return this.conn && this.conn.open;
    }
}