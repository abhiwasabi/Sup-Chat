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

  // Load saved face descriptors from localStorage
  const loadSavedFaces = () => {
    try {
      const savedFaces = localStorage.getItem('knownFaces');
      if (savedFaces) {
        const faces = JSON.parse(savedFaces);
        setKnownFaces(faces);
        console.log(`📚 Loaded ${faces.length} known faces from storage`);
      }
    } catch (error) {
      console.error('❌ Error loading saved faces:', error);
    }
  };

  // Recognize a face by comparing descriptor against known faces
  const recognizeFace = async (descriptor) => {
    if (knownFaces.length === 0) return null;

    let bestMatch = null;
    let bestDistance = Infinity;
    const threshold = 0.6; // Distance threshold for recognition

    for (const knownFace of knownFaces) {
      const distance = faceapi.euclideanDistance(descriptor, knownFace.descriptor);
      
      if (distance < threshold && distance < bestDistance) {
        bestMatch = {
          id: knownFace.id,
          name: knownFace.name,
          confidence: 1 - distance // Convert distance to confidence
        };
        bestDistance = distance;
      }
    }

    return bestMatch;
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
    if (!isInitialized) return;

    setIsDetecting(true);
    console.log('🔍 Starting face detection...');
    
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        // Detect faces in the video
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions();

        // Draw detections on canvas
        const canvas = canvasRef.current;
        const displaySize = { width: 640, height: 480 };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        // Process face recognition
        await processFaceRecognition(detections);
        
      } catch (error) {
        console.error('❌ Error in face detection:', error);
      }

      if (isDetecting) {
        requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  };

  const processFaceRecognition = async (detections) => {
    if (detections.length === 0) {
      // No faces detected
      if (currentFaces.length > 0) {
        console.log('👋 All faces left the stream');
        setCurrentFaces([]);
        socket.emit('faces-left', { streamId });
      }
      return;
    }

    const detectedFaces = [];
    
    for (const detection of detections) {
      // Compare face descriptor against known faces
      const recognizedFace = await recognizeFace(detection.descriptor);
      
      if (recognizedFace) {
        detectedFaces.push({
          id: recognizedFace.id,
          name: recognizedFace.name,
          confidence: detection.detection.score,
          expressions: detection.expressions,
          recognitionConfidence: recognizedFace.confidence
        });
      } else {
        // Unknown face - assign a temporary ID
        const unknownId = `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        detectedFaces.push({
          id: unknownId,
          name: 'Unknown Person',
          confidence: detection.detection.score,
          expressions: detection.expressions,
          recognitionConfidence: 0
        });
      }
    }

    // Check for new faces
    const newFaces = detectedFaces.filter(face => 
      !currentFaces.some(current => current.id === face.id)
    );

    // Check for faces that left
    const leftFaces = currentFaces.filter(current => 
      !detectedFaces.some(face => face.id === current.id)
    );

    // Update current faces
    setCurrentFaces(detectedFaces);

    // Emit events for new faces
    newFaces.forEach(face => {
      console.log(`🎉 New face detected: ${face.name}`);
      socket.emit('face-detected', {
        streamId,
        person: face.name,
        confidence: face.confidence,
        expressions: face.expressions
      });
    });

    // Emit events for faces that left
    leftFaces.forEach(face => {
      console.log(`👋 Face left: ${face.name}`);
      socket.emit('face-left', {
        streamId,
        person: face.name
      });
    });
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
            onClick={stopDetection}
            disabled={!isDetecting}
            className="btn btn-secondary"
          >
            🛑 Stop Detection
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

        <div className="training-link">
          <p>🎓 <a href="/train" target="_blank">Train faces for recognition</a></p>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
