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

    socket.on('offer', async (offer) => {
      console.log('offer', offer);
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
    });

    socket.on('candidate', async (candidate): any => {
      console.log('candidate', candidate);
      if (candidate && peerConnection.signalingState !== 'closed') {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });
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
