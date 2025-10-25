import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import FaceTraining from './components/FaceTraining';
import StreamingApp from './components/StreamingApp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StreamingApp />} />
        <Route path="/train" element={<FaceTraining />} />
      </Routes>
    </Router>
  );
}

export default App;