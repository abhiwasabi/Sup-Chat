import React, { useRef, useEffect, useState } from 'react';
import './VideoStream.css';

const VideoStream = ({ socket, isStreaming, streamerName, setStreamerName, onStartStream, onStopStream }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);

  const startVideo = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
  };

  useEffect(() => {
    if (isStreaming && !isVideoActive) {
      startVideo();
    } else if (!isStreaming && isVideoActive) {
      stopVideo();
    }
  }, [isStreaming]);

  // Simulate viewer count changes when streaming
  useEffect(() => {
    let interval;
    if (isStreaming) {
      // Start with a random number between 5-15
      setViewerCount(Math.floor(Math.random() * 11) + 5);
      
      interval = setInterval(() => {
        setViewerCount(prev => {
          // Randomly increase or decrease by 1-3 viewers
          const change = Math.floor(Math.random() * 3) + 1;
          const direction = Math.random() > 0.5 ? 1 : -1;
          const newCount = prev + (change * direction);
          return Math.max(1, Math.min(25, newCount)); // Keep between 1-25
        });
      }, 3000); // Update every 3 seconds
    } else {
      setViewerCount(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isStreaming]);

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  // Listen for audience count updates
  useEffect(() => {
    if (!socket) return;

    socket.on('audience-update', (count) => {
      setViewerCount(count);
    });

    socket.on('stream-stopped', () => {
      setViewerCount(0);
    });

    return () => {
      socket.off('audience-update');
      socket.off('stream-stopped');
    };
  }, [socket]);

  return (
    <div className="video-stream">
      <div className="video-container">
        {error ? (
          <div className="video-error">
            <div className="error-icon">📹</div>
            <p>{error}</p>
            <button onClick={startVideo} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`video-element ${isVideoActive ? 'active' : ''}`}
          />
        )}
        
        {!isVideoActive && !error && (
          <div className="video-placeholder">
            <div className="placeholder-icon">📹</div>
            <p>Camera will start when you begin streaming</p>
          </div>
        )}
        
        {/* Status overlay in top left */}
        <div className="status-overlay">
          <div className="status-row">
            {streamerName && isStreaming && (
              <div className="streamer-name-display">
                {streamerName}
              </div>
            )}
            <div className={`status-indicator ${isStreaming ? 'live' : 'offline'}`}>
              {isStreaming ? 'LIVE' : 'OFFLINE'}
            </div>
            <div className="viewer-count">
              👥 {viewerCount}
            </div>
          </div>
        </div>
      </div>
      
      <div className="stream-info">
        <div className="streamer-name-section">
          <label htmlFor="streamer-name">Your Name:</label>
          <input
            id="streamer-name"
            type="text"
            value={streamerName}
            onChange={(e) => setStreamerName(e.target.value)}
            placeholder="Enter your streaming name"
            className="streamer-name-input"
          />
        </div>
        
        <div className="stream-controls">
          {!isStreaming ? (
            <button 
              onClick={onStartStream}
              className="start-stream-btn"
              disabled={!streamerName.trim()}
            >
              Start Streaming
            </button>
          ) : (
            <button 
              onClick={onStopStream}
              className="stop-stream-btn"
            >
              Stop Streaming
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoStream;
