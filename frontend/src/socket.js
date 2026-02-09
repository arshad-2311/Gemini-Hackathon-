import { io } from 'socket.io-client';

// Use environment variable for API URL, fallback to localhost for development
const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});
