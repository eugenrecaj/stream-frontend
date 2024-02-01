import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../api/socket';
import { servers } from '../api/config';

const VideoReceiver = () => {
  const videoRef = useRef();
  const [peerConnection, setPeerConnection] = useState(null);

  useEffect(() => {
    const newPeerConnection = new RTCPeerConnection(servers);
    setPeerConnection(newPeerConnection);

    newPeerConnection.ontrack = (event) => {
      console.log(event);
      if (videoRef.current) {
        console.log(event.streams[0]);

        videoRef.current.srcObject = event.streams[0];
      }
    };

    return () => {
      socket.disconnect();
      if (newPeerConnection) {
        newPeerConnection.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!peerConnection) return;

    const offerHandler = async (offer) => {
      if (!peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer),
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer, room: 11 });
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    };

    const candidateHandler = async (candidate) => {
      if (!peerConnection || peerConnection.signalingState === 'closed') return;

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    socket.on('offer', offerHandler);
    socket.on('candidate', candidateHandler);

    // Cleanup
    return () => {
      socket.off('offer', offerHandler);
      socket.off('candidate', candidateHandler);
    };
  }, [peerConnection]);

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

export default VideoReceiver;
