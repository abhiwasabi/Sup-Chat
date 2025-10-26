import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceRecognition = ({ socket, streamId, isStreaming }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFaces, setCurrentFaces] = useState([]);
  const [knownFaces, setKnownFaces] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [lastSmileTime, setLastSmileTime] = useState(0);
  const [lastSadTime, setLastSadTime] = useState(0);
  const [smileNotifications, setSmileNotifications] = useState([]);
  const [sadNotifications, setSadNotifications] = useState([]);

  useEffect(() => {
    console.log('🚀 FaceRecognition component mounted');
    initializeFaceAPI();
    return () => {
      console.log('🧹 FaceRecognition component unmounting');
      if (videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  // Auto-start camera when Face API is initialized (but don't start detection yet)
  useEffect(() => {
    if (isInitialized) {
      console.log('🎯 Face API initialized, starting camera...');
      startCamera();
    }
  }, [isInitialized]);

  // Control face detection based on streaming state
  useEffect(() => {
    console.log(`🎬 Streaming state changed: ${isStreaming}, Face API ready: ${isInitialized}`);
    if (isStreaming && isInitialized) {
      console.log('🎬 Stream started - starting continuous face detection...');
      startFaceDetection();
    } else if (!isStreaming) {
      console.log('⏹️ Stream stopped - stopping face detection...');
      stopDetection();
    }
  }, [isStreaming, isInitialized]);

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
          // Handle both old format (array of descriptors) and new format (single descriptor)
          let descriptors;
          if (person.descriptors && Array.isArray(person.descriptors)) {
            // Old format: array of descriptors
            descriptors = person.descriptors.map(d => new Float32Array(d));
          } else if (person.descriptor && Array.isArray(person.descriptor)) {
            // New format: single averaged descriptor
            descriptors = [new Float32Array(person.descriptor)];
          } else {
            console.warn(`⚠️ Unknown descriptor format for ${person.name}:`, person);
            return null;
          }
          return new faceapi.LabeledFaceDescriptors(person.name, descriptors);
        }).filter(Boolean); // Remove any null entries
        
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

    let bestMatch = null;
    let bestDistance = Infinity;
    const threshold = 0.6; // Distance threshold for recognition

    for (const knownFace of knownFaces) {
      // knownFace is a LabeledFaceDescriptors object
      // We need to compare against all descriptors for this person
      for (const knownDescriptor of knownFace.descriptors) {
        const distance = faceapi.euclideanDistance(descriptor, knownDescriptor);
        
        if (distance < threshold && distance < bestDistance) {
          bestMatch = {
            id: knownFace.label, // Use label as ID
            name: knownFace.label, // Use label as name
            confidence: 1 - distance // Convert distance to confidence
          };
          bestDistance = distance;
        }
      }
    }

    return bestMatch;
  };

  // Detect smile and emit emotion event
  const detectSmile = (expressions, personName = 'Someone') => {
    if (!expressions || !expressions.happy) return false;
    
    // Smile threshold - adjust this value to make it more/less sensitive
    const smileThreshold = 0.6;
    const isSmiling = expressions.happy > smileThreshold;
    
    if (isSmiling) {
      // Throttle smile detection to prevent spam (5 second cooldown)
      const now = Date.now();
      const timeSinceLastSmile = now - lastSmileTime;
      
      if (timeSinceLastSmile < 5000) {
        console.log(`😊 Smile detected but throttled (${Math.round(timeSinceLastSmile/1000)}s since last smile)`);
        return true;
      }
      
      console.log(`😊 SMILE DETECTED! ${personName} is happy! Happiness level: ${(expressions.happy * 100).toFixed(1)}%`);
      setLastSmileTime(now);
      
      // Add visual notification with person name
      const notification = {
        id: Date.now(),
        type: 'smile',
        message: `😊 ${personName} is happy! (${(expressions.happy * 100).toFixed(1)}%)`,
        timestamp: new Date().toISOString()
      };
      
      setSmileNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        setSmileNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
      
      // Emit smile detection event with person name
      if (socket) {
        socket.emit('emotion-detected', {
          streamId,
          emotion: 'smile',
          intensity: expressions.happy,
          expressions: expressions,
          personName: personName,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return isSmiling;
  };

  // Detect sadness and emit emotion event
  const detectSadness = (expressions, personName = 'Someone') => {
    if (!expressions || !expressions.sad) return false;
    
    // Sadness threshold - adjust this value to make it more/less sensitive
    const sadThreshold = 0.6;
    const isSad = expressions.sad > sadThreshold;
    
    if (isSad) {
      // Throttle sadness detection to prevent spam (5 second cooldown)
      const now = Date.now();
      const timeSinceLastSad = now - lastSadTime;
      
      if (timeSinceLastSad < 5000) {
        console.log(`😢 Sadness detected but throttled (${Math.round(timeSinceLastSad/1000)}s since last sadness)`);
        return true;
      }
      
      console.log(`😢 SADNESS DETECTED! ${personName} is sad! Sadness level: ${(expressions.sad * 100).toFixed(1)}%`);
      setLastSadTime(now);
      
      // Add visual notification with person name
      const notification = {
        id: Date.now(),
        type: 'sad',
        message: `😢 ${personName} is sad! (${(expressions.sad * 100).toFixed(1)}%)`,
        timestamp: new Date().toISOString()
      };
      
      setSadNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        setSadNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
      
      // Emit sadness detection event with person name
      if (socket) {
        socket.emit('emotion-detected', {
          streamId,
          emotion: 'sad',
          intensity: expressions.sad,
          expressions: expressions,
          personName: personName,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return isSad;
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
          console.log('🎥 Video metadata loaded, camera ready for detection...');
          videoRef.current.play();
          // Don't start detection automatically - wait for stream to start
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
        return;
      }

      // Throttle detection to every 500ms to prevent excessive processing
      const now = Date.now();
      if (now - lastDetectionTime < 500) {
        return;
      }
      setLastDetectionTime(now);

      try {
        if (isInitialized) {
          console.log('🔍 Running continuous face detection...');
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
    };

    // Start periodic detection every 3 seconds
    console.log('🔄 Starting periodic face detection every 3 seconds...');
    detectionIntervalRef.current = setInterval(detectFaces, 3000);
    
    // Run initial detection immediately
    detectFaces();
  };

  const processFaceRecognition = async (detections) => {
    if (detections.length === 0) {
      setCurrentFaces([]);
      // Emit empty state to clear OnScreenIndicator
      console.log('📡 Emitting empty faces state to OnScreenIndicator');
      socket.emit('current-faces', {
        streamId,
        faces: []
      });
      return;
    }

    // Process all detected faces, not just the largest one
    const recognizedFaces = [];
    
    for (const detection of detections) {
      const recognizedFace = await recognizeFace(detection.descriptor);
      
      if (recognizedFace) {
        recognizedFaces.push({
          id: Date.now() + Math.random(),
          name: recognizedFace.name,
          confidence: recognizedFace.confidence,
          recognitionConfidence: recognizedFace.confidence,
          expressions: detection.expressions || {},
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
        
        console.log(`✅ RECOGNIZED: ${recognizedFace.name} (confidence: ${(recognizedFace.confidence * 100).toFixed(1)}%)`);
        
        // Detect smile and sadness for recognized faces
        if (detection.expressions) {
          detectSmile(detection.expressions, recognizedFace.name);
          detectSadness(detection.expressions, recognizedFace.name);
        }
        
        // Emit face detection event for each recognized face
        socket.emit('face-detected', {
          streamId,
          person: recognizedFace.name,
          confidence: recognizedFace.confidence,
          expressions: detection.expressions
        });
      } else {
        recognizedFaces.push({
          id: Date.now() + Math.random(),
          name: 'Unknown Person',
          confidence: 0,
          recognitionConfidence: 0,
          expressions: detection.expressions || {},
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
        
        console.log('❓ Unknown person detected');
        
        // Detect smile and sadness for unknown faces too
        if (detection.expressions) {
          detectSmile(detection.expressions, 'Unknown Person');
          detectSadness(detection.expressions, 'Unknown Person');
        }
        
        // Emit face detection event for unknown person
        socket.emit('face-detected', {
          streamId,
          person: 'Unknown Person',
          confidence: 0,
          expressions: detection.expressions
        });
      }
    }
    
    setCurrentFaces(recognizedFaces);
    
    // Emit current faces state to OnScreenIndicator
    console.log('📡 Emitting current faces to OnScreenIndicator:', recognizedFaces);
    socket.emit('current-faces', {
      streamId,
      faces: recognizedFaces.map(face => ({
        name: face.name,
        confidence: face.confidence,
        timestamp: Date.now()
      }))
    });
    
    // Show notification for the first recognized face (or unknown if none recognized)
    const firstFace = recognizedFaces[0];
    if (firstFace) {
      if (firstFace.name !== 'Unknown Person') {
        showNotification(
          `👤 ${firstFace.name.toUpperCase()} detected! (${(firstFace.recognitionConfidence * 100).toFixed(1)}% confidence)`,
          'success'
        );
      } else {
        showNotification(
          `❓ Unknown person detected - not in training data`,
          'warning'
        );
      }
    }
  };

  const stopDetection = () => {
    console.log('⏹️ Stopping face detection...');
    setIsDetecting(false);
    
    // Clear the periodic detection interval
    if (detectionIntervalRef.current) {
      console.log('🔄 Clearing detection interval...');
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
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

      {/* Smile Notification Overlay */}
      <div className="smile-notification-overlay">
        {smileNotifications.map(notification => (
          <div 
            key={notification.id} 
            className="smile-notification"
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Sad Notification Overlay */}
      <div className="sad-notification-overlay">
        {sadNotifications.map(notification => (
          <div 
            key={notification.id} 
            className="sad-notification"
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
      
      <div className="camera-section" style={{ display: 'none' }}>
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
            style={{ display: 'none' }}
          />
        </div>
      </div>

    </div>
  );
};

export default FaceRecognition;
