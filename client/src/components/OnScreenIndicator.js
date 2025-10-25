import React, { useState, useEffect } from 'react';
import './OnScreenIndicator.css';

const OnScreenIndicator = ({ socket, streamId }) => {
  const [currentFaces, setCurrentFaces] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!socket) {
      console.log('⚠️ OnScreenIndicator: No socket available');
      return;
    }

    console.log('🎯 OnScreenIndicator: Setting up event listeners');

    // Listen for face detection events
    const handleFaceDetected = (data) => {
      console.log('👤 Face detected in OnScreenIndicator:', data);
      setCurrentFaces(prev => {
        // Remove any existing entry for this person and add the new one
        const filtered = prev.filter(face => face.name !== data.person);
        return [...filtered, {
          name: data.person,
          confidence: data.confidence,
          timestamp: Date.now()
        }];
      });
      setIsVisible(true);
    };

    const handleFaceLeft = (data) => {
      console.log('👋 Face left in OnScreenIndicator:', data);
      setCurrentFaces(prev => prev.filter(face => face.name !== data.person));
    };

    const handleFacesLeft = () => {
      console.log('👋 All faces left in OnScreenIndicator');
      setCurrentFaces([]);
    };

    socket.on('face-detected', handleFaceDetected);
    socket.on('face-left', handleFaceLeft);
    socket.on('faces-left', handleFacesLeft);

    return () => {
      socket.off('face-detected', handleFaceDetected);
      socket.off('face-left', handleFaceLeft);
      socket.off('faces-left', handleFacesLeft);
    };
  }, [socket]);

  // Auto-hide indicator after 5 seconds of no faces
  useEffect(() => {
    if (currentFaces.length === 0) {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [currentFaces]);

  // Test function to manually show indicator
  const testIndicator = () => {
    console.log('🧪 Testing OnScreenIndicator...');
    setCurrentFaces([
      { name: 'Mehdi', confidence: 0.95, timestamp: Date.now() },
      { name: 'Abhi', confidence: 0.87, timestamp: Date.now() }
    ]);
    setIsVisible(true);
  };

  // Always show a test button for debugging
  return (
    <div className="on-screen-indicator">
      <div className="indicator-header">
        <span className="indicator-icon">👥</span>
        <span className="indicator-title">On Screen</span>
        <button 
          onClick={testIndicator}
          style={{ 
            background: '#9146ff', 
            color: 'white', 
            border: 'none', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            marginLeft: 'auto'
          }}
        >
          Test
        </button>
      </div>
      <div className="faces-list">
        {currentFaces.length === 0 ? (
          <div style={{ color: '#adadb8', fontSize: '12px', padding: '8px' }}>
            No faces detected. Click Test to see indicator.
          </div>
        ) : (
          currentFaces.map((face, index) => (
            <div 
              key={`${face.name}-${index}`} 
              className="face-item"
              data-person={face.name}
            >
              <div className="face-avatar">
                {face.name === 'Mehdi' ? '🧙‍♂️' : 
                 face.name === 'Abhi' ? '👨‍💻' : 
                 face.name === 'Badri' ? '🎮' : '👤'}
              </div>
              <div className="face-info">
                <div className="face-name">{face.name}</div>
                <div className="face-confidence">
                  {(face.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OnScreenIndicator;
