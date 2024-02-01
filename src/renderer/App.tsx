import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Stream from '../components/Stream';
import VideoReceiver from '../components/VideoPlayer';
import { Video } from '../components/Peer';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <Video />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
