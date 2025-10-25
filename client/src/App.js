import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import FaceTrainingSystem from './components/FaceTrainingSystem';
import FaceVerification from './components/FaceVerification';
import FaceDetectionTest from './components/FaceDetectionTest';
import StreamingApp from './components/StreamingApp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StreamingApp />} />
        <Route path="/train" element={<FaceTrainingSystem />} />
        <Route path="/verify" element={<FaceVerification />} />
        <Route path="/test" element={<FaceDetectionTest />} />
      </Routes>
    </Router>
  );
}

export default App;