import React, { useState, useEffect } from 'react';
import './StreamerDashboard.css';

const StreamerDashboard = ({ 
  socket, 
  streamId, 
  streamerName, 
  setStreamerName, 
  isStreaming, 
  startStreaming, 
  stopStreaming,
  speechEnabled,
  setSpeechEnabled
}) => {
  const [audienceCount, setAudienceCount] = useState(0);
  const [fakeAudienceEnabled, setFakeAudienceEnabled] = useState(true);
  const [streamStats] = useState({
    totalMessages: 0,
    fakeMessages: 0,
    realMessages: 0
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('audience-update', (count) => {
      setAudienceCount(count);
    });

    return () => {
      socket.off('audience-update');
    };
  }, [socket]);

  const handleStartStreaming = () => {
    if (streamerName.trim()) {
      startStreaming();
      if (socket && streamId) {
        socket.emit('update-streamer-name', { streamId, streamerName });
      }
    } else {
      alert('Please enter your streaming name first!');
    }
  };

  const handleStopStreaming = () => {
    stopStreaming();
  };

  const toggleFakeAudience = () => {
    if (socket && streamId) {
      if (fakeAudienceEnabled) {
        socket.emit('stop-fake-audience', streamId);
      } else {
        socket.emit('start-fake-audience', streamId);
      }
      setFakeAudienceEnabled(!fakeAudienceEnabled);
    }
  };

  return (
    <div className="streamer-dashboard">
      <div className="dashboard-header">
        <h2>🎮 Streamer Dashboard</h2>
        <div className="stream-status">
          {isStreaming ? (
            <div className="status-live">
              <span className="live-indicator">🔴</span>
              <span>LIVE</span>
            </div>
          ) : (
            <div className="status-offline">
              <span className="offline-indicator">⚫</span>
              <span>OFFLINE</span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{audienceCount}</div>
              <div className="stat-label">Fake Audience</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-content">
              <div className="stat-value">{streamStats.totalMessages}</div>
              <div className="stat-label">Total Messages</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🤖</div>
            <div className="stat-content">
              <div className="stat-value">{streamStats.fakeMessages}</div>
              <div className="stat-label">AI Messages</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <div className="stat-value">{streamStats.realMessages}</div>
              <div className="stat-label">Real Messages</div>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="control-group">
            <h3>Stream Controls</h3>
            <div className="control-buttons">
              {!isStreaming ? (
                <button 
                  onClick={handleStartStreaming}
                  className="start-button"
                  disabled={!streamerName.trim()}
                >
                  🚀 Start Streaming
                </button>
              ) : (
                <button 
                  onClick={handleStopStreaming}
                  className="stop-button"
                >
                  ⏹️ Stop Streaming
                </button>
              )}
            </div>
          </div>

          <div className="control-group">
            <h3>AI Audience Settings</h3>
            <div className="toggle-container">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={fakeAudienceEnabled}
                  onChange={toggleFakeAudience}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {fakeAudienceEnabled ? 'AI Audience ON' : 'AI Audience OFF'}
                </span>
              </label>
            </div>
            <p className="toggle-description">
              {fakeAudienceEnabled 
                ? 'AI will ONLY respond to your speech - no random messages'
                : 'AI audience is disabled - only real messages will appear'
              }
            </p>
          </div>

          <div className="control-group">
            <h3>Speech Recognition Settings</h3>
            <div className="toggle-container">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => setSpeechEnabled(e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {speechEnabled ? 'Speech Recognition ON' : 'Speech Recognition OFF'}
                </span>
              </label>
            </div>
            <p className="toggle-description">
              {speechEnabled 
                ? 'AI will listen to your speech and respond with custom messages'
                : 'AI will not respond to your speech - only random messages'
              }
            </p>
          </div>
        </div>

        <div className="tips-section">
          <h3>💡 Tips for Better Streaming</h3>
          <ul className="tips-list">
            <li>Speak naturally - AI will respond to what you say</li>
            <li>Try saying "Hello everyone!" to get greeting responses</li>
            <li>Ask questions like "How are you doing?" for interactive responses</li>
            <li>Share your thoughts - AI will engage with your content</li>
            <li>Keep your camera at eye level for better engagement</li>
            <li>Use good lighting - natural light works best</li>
            <li>Be yourself - authenticity attracts real viewers</li>
            <li>Consistency is key - stream regularly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StreamerDashboard;
