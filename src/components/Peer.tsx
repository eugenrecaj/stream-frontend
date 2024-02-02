import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../api/socket';
import { servers } from '../api/config';

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);
  const [peers, setPeers] = useState([]);

  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    socket.auth = { room: '11' };
    socket.connect();

    captureScreen();
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
      localVideoRef.current.srcObject = stream;
      setLocalStream(stream);
      joinRoom(stream);
    } catch (err) {
      console.log(err);
    }
  };

  const joinRoom = (stream) => {
    const roomID = '11'; // This should be dynamically set or retrieved
    socket.emit('join room', roomID);

    socket.on('update users', (users) => {
      const peers = [];
      users.forEach((userID) => {
        const peer = createPeer(userID, socket.id, stream);
        peers.push({ peerID: userID, peer });
      });
      setPeers(peers);
    });

    socket.on('offer', handleReceiveCall);

    socket.on('answer', handleAnswer);

    socket.on('candidate', handleNewICECandidateMsg);
  };

  const createPeer = (userID, callerID, stream) => {
    const peer = new RTCPeerConnection(servers);

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { to: userID, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      // Add remote stream to the appropriate video element
    };

    peer.createOffer().then((offer) => {
      peer.setLocalDescription(offer);
      socket.emit('offer', { to: userID, offer });
    });

    return peer;
  };

  const handleReceiveCall = ({ offer, from }) => {
    const peer = new RTCPeerConnection(servers);

    // Ensure peers list is updated correctly
    const newPeer = { peerID: from, peer };
    setPeers((prevPeers) => [...prevPeers, newPeer]);

    if (localStream) {
      localStream
        .getTracks()
        .forEach((track) => peer.addTrack(track, localStream));
    } else {
      console.error('Local stream not available');
      // Consider fetching the local stream here if it's essential or delay handling until the stream is available
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { to: from, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      // Implementation for adding remote stream to the appropriate video element
    };

    peer
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => {
        peer
          .createAnswer()
          .then((answer) => {
            peer.setLocalDescription(answer);
            socket.emit('answer', { to: from, answer });
          })
          .catch((error) => console.error('Error creating answer:', error));
      })
      .catch((error) =>
        console.error('Error setting remote description:', error),
      );
  };

  const handleAnswer = ({ answer, from }) => {
    const item = peers.find((p) => p.peerID === from);
    item && item.peer.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidateMsg = ({ candidate, from }) => {
    const item = peers.find((p) => p.peerID === from);
    item && item.peer.addIceCandidate(new RTCIceCandidate(candidate));
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
      {peers.map((peer, index) => (
        <video
          key={index}
          playsInline
          ref={(el) => (remoteVideoRefs.current[index] = el)}
          autoPlay
          style={{ width: '240px' }}
        />
      ))}
    </div>
  );
};

export default VideoChat;
