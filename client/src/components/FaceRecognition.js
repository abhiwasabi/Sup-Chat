import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceRecognition = ({ socket, streamId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFaces, setCurrentFaces] = useState([]);
  const [knownFaces, setKnownFaces] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    initializeFaceAPI();
    return () => {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  const initializeFaceAPI = async () => {
    try {
      console.log('🎭 Initializing Face API...');
      
      // Load face-api models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);

      console.log('✅ Face API models loaded successfully');
      setIsInitialized(true);
      
      // Load saved face descriptors from localStorage
      loadSavedFaces();
    } catch (error) {
      console.error('❌ Error loading Face API models:', error);
    }
  };

  // Load saved face descriptors from localStorage and reconstruct them properly
  const loadSavedFaces = () => {
    try {
      const savedFaces = localStorage.getItem('trainedFaces');
      if (savedFaces) {
        const parsedFaces = JSON.parse(savedFaces);
        console.log('📚 Raw saved faces data:', parsedFaces);
        
        // Reconstruct faceapi.LabeledFaceDescriptors objects
        const reconstructedFaces = parsedFaces.map(person => {
          const descriptors = person.descriptors.map(d => new Float32Array(d));
          return new faceapi.LabeledFaceDescriptors(person.label, descriptors);
        });
        
        console.log(`📚 Reconstructed ${reconstructedFaces.length} trained faces from storage`);
        console.log('👥 Known faces:', reconstructedFaces.map(f => f.label));
        setKnownFaces(reconstructedFaces);
      } else {
        console.log('⚠️ No trained faces found. Please train faces first at /train');
        setKnownFaces([]);
      }
    } catch (error) {
      console.error('❌ Error loading saved faces:', error);
      setKnownFaces([]);
    }
  };

  // Recognize a face by comparing descriptor against known faces
  const recognizeFace = async (descriptor) => {
    if (knownFaces.length === 0) return null;

    try {
      // Create face matcher with reconstructed labeled descriptors
      const faceMatcher = new faceapi.FaceMatcher(knownFaces, 0.6);
      
      // Find best match
      const bestMatch = faceMatcher.findBestMatch(descriptor);
      
      if (bestMatch.label !== 'unknown') {
        return {
          id: bestMatch.label,
          name: bestMatch.label,
          confidence: 1 - bestMatch.distance,
          distance: bestMatch.distance
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error in face recognition:', error);
      return null;
    }
  };

  // Show notification overlay
  const showNotification = (message, type = 'success') => {
    console.log(`🔔 Showing notification: ${message} (type: ${type})`);
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => {
      console.log(`🔔 Current notifications: ${prev.length}, adding notification`);
      return [...prev, notification];
    });
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
    }
  };

  const startFaceDetection = () => {
    console.log('🔍 Starting face recognition...');
    console.log('📊 Face API initialized:', isInitialized);
    console.log('📊 Models loaded status:', {
      tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.isLoaded,
      faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.isLoaded,
      faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.isLoaded,
      faceExpressionNet: !!faceapi.nets.faceExpressionNet.isLoaded
    });
    console.log(`📚 Using ${knownFaces.length} trained faces: ${knownFaces.map(f => f.name).join(', ')}`);

    if (!isInitialized) {
      console.log('⚠️ Face API not initialized yet, starting camera anyway...');
    }

    setIsDetecting(true);

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) {
        console.log('⚠️ Video or canvas not ready');
        if (isDetecting) {
          requestAnimationFrame(detectFaces);
        }
        return;
      }

      try {
        if (isInitialized) {
          console.log('🔍 Running face detection...');
          // First, just detect faces (like the working test page)
          const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
          console.log(`👥 Found ${detections.length} faces`);

          // If faces are detected, then get more detailed info
          let detailedDetections = [];
          if (detections.length > 0) {
            console.log('🔍 Getting detailed face info...');
            detailedDetections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptors()
              .withFaceExpressions();
            console.log(`👥 Detailed detections: ${detailedDetections.length} faces`);
          }

          // Draw detections on canvas
          const canvas = canvasRef.current;
          const displaySize = { width: 640, height: 480 };
          faceapi.matchDimensions(canvas, displaySize);
          
          // Draw basic detections first
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          
          // Draw detailed info if available
          if (detailedDetections.length > 0) {
            const resizedDetailedDetections = faceapi.resizeResults(detailedDetections, displaySize);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetailedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetailedDetections);
          }

          // Process face recognition with detailed detections if available
          await processFaceRecognition(detailedDetections.length > 0 ? detailedDetections : detections);
        } else {
          console.log('⚠️ Face API models not initialized yet');
          // Draw the video frame even when models aren't ready
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          
          // Draw loading indicator
          ctx.fillStyle = 'rgba(255, 170, 0, 0.8)';
          ctx.fillRect(10, 10, 300, 30);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('Loading face detection...', 15, 30);
        }
        
      } catch (error) {
        console.error('❌ Error in face recognition:', error);
      }

      if (isDetecting) {
        requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  };

  const processFaceRecognition = async (detections) => {
    if (detections.length === 0) {
      setCurrentFaces([]);
      return;
    }

    // Use the largest face for recognition
    const largestFace = detections.reduce((prev, current) => 
      (current.detection.box.area > prev.detection.box.area) ? current : prev
    );

    // Recognize the face
    const recognizedFace = await recognizeFace(largestFace.descriptor);
    
    if (recognizedFace) {
      const newFace = {
        id: Date.now() + Math.random(),
        name: recognizedFace.name,
        confidence: recognizedFace.confidence,
        recognitionConfidence: recognizedFace.confidence,
        expressions: largestFace.expressions || {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      
      setCurrentFaces([newFace]);

      console.log(`✅ RECOGNIZED: ${recognizedFace.name} (confidence: ${(recognizedFace.confidence * 100).toFixed(1)}%)`);
      
      showNotification(
        `👤 ${recognizedFace.name.toUpperCase()} detected! (${(recognizedFace.confidence * 100).toFixed(1)}% confidence)`,
        'success'
      );
      
      socket.emit('face-detected', {
        streamId,
        person: recognizedFace.name,
        confidence: recognizedFace.confidence,
        expressions: largestFace.expressions
      });
    } else {
      const unknownFace = {
        id: Date.now() + Math.random(),
        name: 'Unknown Person',
        confidence: 0,
        recognitionConfidence: 0,
        expressions: largestFace.expressions || {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      
      setCurrentFaces([unknownFace]);
      console.log('❓ Unknown person detected');
      
      showNotification(
        `❓ Unknown person detected - not in training data`,
        'warning'
      );
    }
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  return (
    <div className="face-recognition-container">
      {/* Notification Overlay */}
      <div className="notification-overlay">
        {console.log(`🔔 Rendering ${notifications.length} notifications:`, notifications)}
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification notification-${notification.type}`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Face Status Display - Bottom Right */}
      <div className="face-status-display">
        {currentFaces.length > 0 ? (
          <div className="face-status">
            <div className="status-icon">👤</div>
            <div className="status-info">
              <div className="status-name">{currentFaces[0].name}</div>
              <div className="status-confidence">
                {(currentFaces[0].recognitionConfidence * 100).toFixed(1)}% confidence
              </div>
            </div>
          </div>
        ) : (
          <div className="face-status no-face">
            <div className="status-icon">❓</div>
            <div className="status-info">
              <div className="status-name">No face detected</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="camera-section">
        <div className="video-container">
          <video
            ref={videoRef}
            width="640"
            height="480"
            style={{ display: 'none' }}
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="face-canvas"
          />
        </div>
        
        <div className="controls">
          <button 
            onClick={startCamera}
            disabled={!isInitialized}
            className="btn btn-primary"
          >
            {isInitialized ? '🎥 Start Camera' : '⏳ Loading Models...'}
          </button>
          
          <button 
            onClick={startFaceDetection}
            disabled={isDetecting || !isInitialized}
            className="btn btn-primary"
          >
            🔍 Start Detection
          </button>
          
          <button 
            onClick={stopDetection}
            disabled={!isDetecting}
            className="btn btn-secondary"
          >
            🛑 Stop Detection
          </button>
          
          <button 
            onClick={() => showNotification('🧪 Test notification!', 'success')}
            className="btn btn-info"
          >
            🧪 Test Notification
          </button>
          
          <button 
            onClick={async () => {
              console.log('🧪 Simple face detection test (like /verify page)...');
              if (videoRef.current && isInitialized) {
                try {
                  console.log('🧪 Running simple face detection...');
                  const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
                  console.log(`🧪 Simple test found ${detections.length} faces`);
                  
                  if (detections.length > 0) {
                    console.log('🧪 Face detection works! Now testing recognition...');
                    // Test recognition with the detected faces
                    const detailedDetections = await faceapi
                      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                      .withFaceLandmarks()
                      .withFaceDescriptors();
                    console.log(`🧪 Detailed detections: ${detailedDetections.length} faces`);
                    
                    if (detailedDetections.length > 0) {
                      console.log('🧪 Testing face recognition...');
                      await processFaceRecognition(detailedDetections);
                    }
                  }
                } catch (err) {
                  console.error('🧪 Simple test error:', err);
                }
              } else {
                console.log('🧪 Simple test failed - camera or models not ready');
              }
            }}
            className="btn btn-success"
          >
            🧪 Simple Test (Like /verify)
          </button>
        </div>
      </div>

      <div className="face-info">
        <h3>👥 Current Faces in Stream</h3>
        <div className="faces-list">
          {currentFaces.length === 0 ? (
            <p className="no-faces">No faces detected</p>
          ) : (
            currentFaces.map((face, index) => (
              <div key={index} className="face-item">
                <div className="face-info">
                  <span className="face-name">{face.name}</span>
                  {face.recognitionConfidence > 0 && (
                    <span className="recognition-confidence">
                      Recognition: {(face.recognitionConfidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="face-confidence">
                  Detection: {(face.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </div>
        
        {/* Debug: Show notifications count */}
        <div style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
          <strong>Debug:</strong> {notifications.length} notifications active
          {notifications.map(n => (
            <div key={n.id} style={{ fontSize: '12px', color: '#666' }}>
              {n.message}
            </div>
          ))}
        </div>

        <div className="training-link">
          <p>🎓 <a href="/train" target="_blank">Train faces for recognition</a></p>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
