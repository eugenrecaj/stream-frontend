import { io } from 'socket.io-client';

export const socket = io(
  process.env.NODE_ENV === 'development'
    ? 'https://coral-app-o6hgm.ondigitalocean.app/'
    : 'https://bonvue-backend-fceik.ondigitalocean.app/',
  {
    autoConnect: false,
    timeout: 5000,
  },
);
