import React, { useState, useEffect } from 'react';
import './OnScreenIndicator.css';

const OnScreenIndicator = ({ socket, streamId }) => {
  const [currentFaces, setCurrentFaces] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [previousFaces, setPreviousFaces] = useState(new Set());

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


    const handleCurrentFaces = (data) => {
      console.log('👥 OnScreenIndicator received current-faces event:', data);
      
      const newFaces = data.faces || [];
      const newFaceNames = new Set(newFaces.map(f => f.name));
      
      // Update current faces
      setCurrentFaces(newFaces);
      
      // Check for faces that left
      const facesThatLeft = Array.from(previousFaces).filter(name => !newFaceNames.has(name));
      if (facesThatLeft.length > 0) {
        console.log('👋 Faces that left:', facesThatLeft);
      }
      
      // Check for new faces
      const newFaceNamesArray = Array.from(newFaceNames).filter(name => !previousFaces.has(name));
      if (newFaceNamesArray.length > 0) {
        console.log('🆕 New faces detected:', newFaceNamesArray);
      }
      
      // Update previous faces for next comparison
      setPreviousFaces(newFaceNames);
      
      // Update visibility
      if (newFaces.length > 0) {
        setIsVisible(true);
        console.log('👥 OnScreenIndicator updated with current faces:', newFaces.map(f => f.name));
      } else {
        setIsVisible(false);
        console.log('👥 OnScreenIndicator cleared - no faces detected');
      }
    };

    const handleFaceLeft = (data) => {
      console.log('👋 Face left in OnScreenIndicator:', data);
      setCurrentFaces(prev => {
        const updatedFaces = prev.filter(face => face.name !== data.person);
        console.log(`👋 Removed ${data.person} from indicator. Remaining:`, updatedFaces.map(f => f.name));
        return updatedFaces;
      });
      
      // Update previous faces tracking
      setPreviousFaces(prev => {
        const updated = new Set(prev);
        updated.delete(data.person);
        return updated;
      });
    };

    const handleFacesLeft = () => {
      console.log('👋 All faces left in OnScreenIndicator');
      setCurrentFaces([]);
      setIsVisible(false);
      setPreviousFaces(new Set());
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
          {currentFaces.map((face, index) => (
            <div 
              key={`${face.name}-${index}`} 
              className="face-chip"
              data-person={face.name}
            >
              <span className="face-name">{face.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnScreenIndicator;
