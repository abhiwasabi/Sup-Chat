import React, { useState, useEffect } from 'react';
import './App.css';
import StreamerDashboard from './components/StreamerDashboard';
import VideoStream from './components/VideoStream';
import ChatInterface from './components/ChatInterface';
import SpeechRecognition from './components/SpeechRecognition';
import { io } from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerName, setStreamerName] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(true);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:9000');
    setSocket(newSocket);

    // Generate unique stream ID
    const id = 'stream_' + Math.random().toString(36).substr(2, 9);
    setStreamId(id);

    return () => {
      newSocket.close();
    };
  }, []);

  const startStreaming = () => {
    if (socket && streamId) {
      socket.emit('join-stream', streamId);
      socket.emit('start-fake-audience', streamId);
      setIsStreaming(true);
    }
  };

  const stopStreaming = () => {
    if (socket && streamId) {
      socket.emit('stop-fake-audience', streamId);
      setIsStreaming(false);
    }
  };

  const handleSpeechDetected = (speechData) => {
    if (socket && streamId && speechEnabled) {
      socket.emit('speech-detected', {
        streamId,
        speechContent: speechData.text,
        confidence: speechData.confidence
      });
    }
  };

  return (
    <div className="App">
      <main className="app-main">
        <div className="stream-container">
          <div className="video-section">
            <VideoStream 
              isStreaming={isStreaming}
              streamerName={streamerName}
              setStreamerName={setStreamerName}
              onStartStream={startStreaming}
              onStopStream={stopStreaming}
            />
          </div>
          
          <div className="chat-section">
            <ChatInterface 
              socket={socket}
              streamId={streamId}
              isStreaming={isStreaming}
            />
          </div>
        </div>
        
        {/* Hidden components - functionality only */}
        <div style={{ display: 'none' }}>
          <SpeechRecognition 
            onSpeechDetected={handleSpeechDetected}
            isStreaming={isStreaming}
            isEnabled={speechEnabled}
          />
          
          <StreamerDashboard 
            socket={socket}
            streamId={streamId}
            streamerName={streamerName}
            setStreamerName={setStreamerName}
            isStreaming={isStreaming}
            startStreaming={startStreaming}
            stopStreaming={stopStreaming}
            speechEnabled={speechEnabled}
            setSpeechEnabled={setSpeechEnabled}
          />
        </div>
      </main>
    </div>
  );
}

export default App;