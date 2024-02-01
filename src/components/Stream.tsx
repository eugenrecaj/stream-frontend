import { useEffect, useState } from 'react';
import { socket } from '../api/socket';
import { servers } from '../api/config';

const Stream = () => {
  const [peerConnection, setPeerConnectionm] = useState<WebTransport>();
  useEffect(() => {
    socket.auth = { room: 11 };
    socket.connect();

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
    });

    return () => {
      socket.disconnect();
      if (peerConnection) {
        peerConnection.close();
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
      return stream;
    } catch (err) {
      console.log(err);
    }
  };

  const adjustBitrate = (newBitrate, peerConnection) => {
    const senders = peerConnection.getSenders();
    senders.forEach((sender) => {
      const params = sender.getParameters();
      if (params.encodings) {
        params.encodings.forEach((encoding) => {
          encoding.maxBitrate = newBitrate;
        });
        sender
          .setParameters(params)
          .then(() => console.log(`Bitrate adjusted to ${newBitrate}`))
          .catch(console.error);
      }
    });
  };

  const startStreaming = async () => {
    const stream = await captureScreen();
    const peerConnection = new RTCPeerConnection(servers);

    setPeerConnectionm(peerConnection);

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
        console.log('ICE candidate:', event.candidate);
      } else {
        // All ICE candidates have been gathered
        console.log('ICE gathering state complete');
        socket.emit('candidate', null);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    adjustBitrate(2000000, peerConnection);

    socket.emit('offer', { offer, room: 11 });
    console.log('offer');

    socket.on('answer', async (answer) => {
      console.log('answer', answer);

      if (answer) {
        try {
          if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer),
            );
          } else {
            console.error(
              `Unexpected signaling state: ${peerConnection.signalingState}`,
            );
          }
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });
  };

  return (
    <div>
      <button onClick={() => startStreaming()}>Start stream</button>
    </div>
  );
};

export default Stream;
