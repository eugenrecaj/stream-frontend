import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { socket } from '../api/socket';
import { servers } from '../api/config';

const SERVER_URL = 'http://localhost:4000';

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    socket.auth = { room: 11 };
    socket.connect();

    captureScreen();

    socket.on('offer', (data) => {
      const offer = JSON.parse(data);
      handleOffer(offer);
    });

    socket.on('answer', (data) => {
      const answer = JSON.parse(data);
      peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
    });

    socket.on('candidate', (data) => {
      const candidate = JSON.parse(data);
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      localStream && localStream.getTracks().forEach((track) => track.stop());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
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
      setLocalStream(stream);
      initializePeerConnection(stream);
    } catch (err) {
      console.log(err);
    }
  };

  const initializePeerConnection = (stream) => {
    const peerConnection = new RTCPeerConnection(servers);
    peerConnectionRef.current = peerConnection;

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', JSON.stringify(event.candidate));
      }
    };

    if (window.location.hash === '') {
      peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        socket.emit('offer', JSON.stringify(offer));
      });
    }
  };

  const handleOffer = (offer) => {
    peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(offer),
    );
    peerConnectionRef.current.createAnswer().then((answer) => {
      peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', JSON.stringify(answer));
    });
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
