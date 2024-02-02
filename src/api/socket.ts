import { io } from 'socket.io-client';

export const socket = io(
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8080/'
    : 'https://bonvue-backend-fceik.ondigitalocean.app/',
  {
    autoConnect: false,
    timeout: 5000,
  },
);
