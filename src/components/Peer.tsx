import { useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';
import { socket } from '../api/socket';

export const Video = () => {
  const [peers, setPeers] = useState({});
  const videoRef = useRef();
  useEffect(() => {
    socket.auth = { room: '11' };
    socket.connect();

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
    });
    const peer = new Peer();

    startStreaming(peer);
  }, []);

  const captureScreen = async () => {
    try {
      const sources = await window.electron.ipcRenderer.getScreenSources();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 60, // Minimum frame rate
            maxFrameRate: 144, // Maximum frame rate
          },
        },
      });
      return stream;
    } catch (err) {
      console.log(err);
    }
  };

  const startStreaming = async (peer) => {
    const stream = await captureScreen();

    peer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      connectToNewUser(userId, stream, peer);
    });

    socket.on('user-disconnected', (userId) => {
      if (peers[userId]) peers[userId].close();
    });

    peer.on('open', (id) => {
      console.log(id);

      socket.emit('join-room', { room: '11', id });
    });
  };

  function connectToNewUser(userId, stream, peer) {
    console.log(userId, stream);

    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
      addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
      video.remove();
    });

    setPeers({ ...peers, [userId]: call });
  }

  function addVideoStream(video, stream) {
    videoRef.current.srcObject = stream;
  }

  return (
    <div>
      <video
        width={1000}
        height={700}
        ref={videoRef}
        autoPlay
        playsInline
        controls
      />
    </div>
  );
};
