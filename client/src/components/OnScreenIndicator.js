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

    const handleCurrentFaces = (data) => {
      console.log('👥 OnScreenIndicator received current-faces event:', data);
      if (data.faces && data.faces.length > 0) {
        setCurrentFaces(data.faces);
        setIsVisible(true);
        console.log('👥 OnScreenIndicator updated with current faces:', data.faces.map(f => f.name));
      } else {
        setCurrentFaces([]);
        setIsVisible(false);
        console.log('👥 OnScreenIndicator cleared - no faces detected');
      }
    };

    socket.on('face-detected', handleFaceDetected);
    socket.on('face-left', handleFaceLeft);
    socket.on('faces-left', handleFacesLeft);
    socket.on('current-faces', handleCurrentFaces);

    return () => {
      socket.off('face-detected', handleFaceDetected);
      socket.off('face-left', handleFaceLeft);
      socket.off('faces-left', handleFacesLeft);
      socket.off('current-faces', handleCurrentFaces);
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

  // Only show indicator when there are faces or when visible
  if (!isVisible && currentFaces.length === 0) {
    return null;
  }

  return (
    <div className="on-screen-indicator">
      {currentFaces.length > 0 && (
        <div className="faces-bar">
          <span className="faces-label">👥</span>
          {currentFaces.map((face, index) => (
            <div 
              key={`${face.name}-${index}`} 
              className="face-chip"
              data-person={face.name}
            >
              <span className="face-avatar">
                {face.name === 'Mehdi' ? '🧙‍♂️' : 
                 face.name === 'Abhi' ? '👨‍💻' : 
                 face.name === 'Badri' ? '🎮' : '👤'}
              </span>
              <span className="face-name">{face.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnScreenIndicator;
