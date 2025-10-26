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
  const [donationOverlay, setDonationOverlay] = useState(null);
  const [donationFadeOut, setDonationFadeOut] = useState(false);
  const [donationGoal, setDonationGoal] = useState(100); // Default $100 goal
  const [donationProgress, setDonationProgress] = useState(0);

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

  // Play ding sound
  const playDingSound = () => {
    // Create audio context for ding sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Ding sound: short beep
    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Play Twitch donation sound
  const playTwitchDonationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create the famous Twitch donation "cha-ching" sound effect
    // It's a rising and falling tone that sounds like "ding ding ding"
    const notes = [
      { freq: 330, duration: 0.1, delay: 0 },
      { freq: 392, duration: 0.1, delay: 0.15 },
      { freq: 523, duration: 0.1, delay: 0.3 }
    ];
    
    notes.forEach(note => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + note.duration);
      }, note.delay * 1000);
    });
  };

  // Handle countdown and start stream
  const handleStartStream = () => {
    setShowCountdown(true);
    setCountdown(3);
    
    // Play initial ding
    playDingSound();
    
          const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowCountdown(false);
            playTwitchDonationSound(); // Play Twitch donation sound when stream starts
            onStartStream();
            return 3;
          }
          // Play ding for each number
          playDingSound();
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

    // Listen for donation events to display on screen
    socket.on('donation-message', (donation) => {
      setDonationOverlay(donation);
      setDonationFadeOut(false);
      
      // Extract amount from donation message and update progress
      const amountMatch = donation.message.match(/\$(\d+)/);
      if (amountMatch) {
        const amount = parseInt(amountMatch[1]);
        setDonationProgress(prev => prev + amount);
      }
      
      // Start fade out after 4 seconds
      setTimeout(() => {
        setDonationFadeOut(true);
      }, 4000);
      
      // Hide after fade animation completes (5.5 seconds total)
      setTimeout(() => {
        setDonationOverlay(null);
        setDonationFadeOut(false);
      }, 5500);
    });

    return () => {
      socket.off('audience-update');
      socket.off('stream-stopped');
      socket.off('donation-message');
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
        
        {/* Donation Overlay */}
        {donationOverlay && (
          <div className={`donation-overlay-screen ${donationFadeOut ? 'fade-out' : ''}`}>
            <div className="donation-overlay-content">
              <div className="donation-overlay-text">
                {donationOverlay.username} donated {donationOverlay.amount}!
              </div>
              <div className="donation-overlay-message">
                {donationOverlay.message.replace(/^\$\d+\s*-\s*/, '')}
              </div>
            </div>
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
                👤 {viewerCount}
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
        
        {/* Donation Goal Display - under the indicator */}
        {isStreaming && (
          <div className="donation-goal-overlay">
            <div className="donation-goal-header">
              <span className="donation-goal-icon">💰</span>
              <span className="donation-goal-title">Donation Goal</span>
            </div>
            <div className="donation-goal-progress">
              <div className="donation-goal-text">
                ${donationProgress} / ${donationGoal}
              </div>
              <div className="donation-goal-bar">
                <div 
                  className="donation-goal-fill" 
                  style={{ width: `${Math.min(100, (donationProgress / donationGoal) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="stream-info">
        <div className="streamer-name-section">
          <label htmlFor="streamer-name">Username:</label>
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
