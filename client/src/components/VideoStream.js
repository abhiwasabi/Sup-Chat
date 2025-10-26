import React, { useRef, useEffect, useState } from 'react';
import OnScreenIndicator from './OnScreenIndicator';
import './VideoStream.css';

const VideoStream = ({ socket, isStreaming, streamerName, setStreamerName, onStartStream, onStopStream, streamId }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

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

  // Handle countdown and start stream
  const handleStartStream = () => {
    setShowCountdown(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          onStartStream();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
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
    let initialAnimationTimeout;
    let interval;
    
    if (isStreaming) {
      // Start at 0
      setViewerCount(0);
      
      // Slowly increase from 0 to 11
      initialAnimationTimeout = setTimeout(() => {
        const animateToEleven = () => {
          setViewerCount(prev => {
            if (prev < 11) {
              // Increase by 1 viewer at a time for slower animation
              return prev + 1;
            }
            return prev;
          });
        };
        
        // Update every 300ms for slower animation
        const slowInterval = setInterval(() => {
          animateToEleven();
          if (viewerCount >= 11) {
            clearInterval(slowInterval);
          }
        }, 300);
        
        // Cleanup after reaching 11
        setTimeout(() => {
          clearInterval(slowInterval);
          setViewerCount(11);
        }, 3500);
      }, 1000); // Wait 1 second before starting the animation
      
      // After reaching 11, continue with normal fluctuations
      interval = setInterval(() => {
        setViewerCount(prev => {
          if (prev >= 11) {
            // Randomly increase or decrease by 1-2 viewers
            const change = Math.floor(Math.random() * 2) + 1;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const newCount = prev + (change * direction);
            return Math.max(9, Math.min(15, newCount)); // Keep between 9-15
          }
          return prev;
        });
      }, 3000); // Update every 3 seconds
    } else {
      setViewerCount(0);
    }

    return () => {
      if (initialAnimationTimeout) {
        clearTimeout(initialAnimationTimeout);
      }
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
        
        {/* Countdown Overlay */}
        {showCountdown && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
        
        {/* Status overlay in top left */}
        <div className="status-overlay">
          <div className="status-row">
            <div className="status-left">
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
            <div className="status-right">
              {/* On Screen Indicator - inline with status */}
              <OnScreenIndicator 
                socket={socket}
                streamId={streamId}
              />
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
              onClick={handleStartStream}
              className="start-stream-btn"
              disabled={!streamerName.trim() || showCountdown}
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
