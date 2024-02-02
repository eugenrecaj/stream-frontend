import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { socket } from '../api/socket';

import * as proccess from 'process';

global.process = proccess;

const VideoChat = () => {
  const [peer, setPeer] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    socket.auth = { room: 11 };
    socket.connect();

    captureScreen();

    return () => {
      socket.disconnect();
      if (peer) {
        peer.destroy();
      }
    };
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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: window.location.hash === '',
        trickle: false,
        stream,
      });

      peer.on('signal', (data) => {
        console.log(data);

        socket.emit('offer', JSON.stringify(data));
      });

      socket.on('offer', (data) => {
        console.log(data);
        peer.signal(JSON.parse(data));
      });

      peer.on('stream', (stream) => {
        console.log(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      setPeer(peer);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <video
        playsInline
        muted
        ref={localVideoRef}
        autoPlay
        style={{ width: '240px' }}
      />
      <video
        playsInline
        ref={remoteVideoRef}
        autoPlay
        style={{ width: '240px' }}
      />
    </div>
  );
};

export default VideoChat;
