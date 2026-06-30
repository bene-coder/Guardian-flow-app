import { io, Socket } from 'socket.io-client';

// CRITICAL STEP: Replace '192.168.x.x' with your computer's actual local IP address.
// Keep port 3000 (or whatever port your partner's backend server is running on).
const BACKEND_URL = 'http://192.168.1.50:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(BACKEND_URL, {
            transports: ['websocket'],
            forceNew: true,
        });

        socket.on('connect', () => {
            console.log('✅ Connected to GuardianFlow Socket Server');
        });

        socket.on('connect_error', (error) => {
            console.log('❌ Socket Connection Error:', error.message);
        });
    }
    return socket;
};