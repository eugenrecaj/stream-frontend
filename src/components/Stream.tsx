import { useEffect, useState } from 'react';
import { socket } from '../api/socket';
import { servers } from '../api/config';

const Stream = () => {
  const [peerConnection, setPeerConnection] = useState<WebTransport>();
  const [expectingAnswer, setExpectingAnswer] = useState(false);

  useEffect(() => {
    socket.auth = { room: 11 };
    socket.connect();

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
    });

    // When receiving an answer, check if you were expecting it
    socket.on('answer', async (answer) => {
      if (peerConnection && expectingAnswer) {
        // Check the flag here
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
          setExpectingAnswer(false); // Reset the flag once the answer is processed
        } catch (error) {
          console.error('Error setting remote description:', error);
          setExpectingAnswer(false); // Also reset the flag in case of error
        }
      }
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

    setPeerConnection(peerConnection);

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    // Set expectingAnswer to true right after sending the offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    setExpectingAnswer(true); // Update here

    adjustBitrate(2000000, peerConnection);

    socket.emit('offer', { offer, room: 11 });
  };

  return (
    <div>
      <button onClick={() => startStreaming()}>Start stream</button>
    </div>
  );
};

export default Stream;
