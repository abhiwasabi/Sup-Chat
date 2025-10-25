import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceTraining = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFaces, setCurrentFaces] = useState([]);
  const [knownFaces, setKnownFaces] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState({});

  // Known facial profiles (3 people)
  const facialProfiles = [
    { id: 'abhi', name: 'Abhi', description: 'Wearing blue jacket, no glasses' },
    { id: 'mehdi', name: 'Mehdi', description: 'Wearing white shirt, round glasses' },
    { id: 'badri', name: 'Badri', description: 'Gaming streamer with beard' }
  ];

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
      
      // Check if models are accessible first
      const modelPaths = [
        '/models/tiny_face_detector_model-weights_manifest.json',
        '/models/face_landmark_68_model-weights_manifest.json',
        '/models/face_recognition_model-weights_manifest.json',
        '/models/face_expression_model-weights_manifest.json'
      ];
      
      console.log('🔍 Checking model accessibility...');
      for (const path of modelPaths) {
        try {
          const response = await fetch(path);
          if (!response.ok) {
            throw new Error(`Model not found: ${path}`);
          }
          console.log(`✅ Model accessible: ${path}`);
        } catch (err) {
          console.error(`❌ Model not accessible: ${path}`, err);
        }
      }
      
      // Load face-api models with correct paths
      console.log('📥 Loading face-api models...');
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
      console.error('Full error details:', error.message, error.stack);
      
      // Set a timeout to show error state
      setTimeout(() => {
        console.log('⏰ Model loading timeout - check if models are properly served');
        setIsInitialized(false);
      }, 10000);
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

  // Save face descriptors to localStorage
  const saveFaces = (faces) => {
    try {
      localStorage.setItem('knownFaces', JSON.stringify(faces));
      console.log(`💾 Saved ${faces.length} faces to storage`);
    } catch (error) {
      console.error('❌ Error saving faces:', error);
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

  // Train the system with a new face
  const trainFace = async (profileId, profileName) => {
    if (!videoRef.current || !isInitialized) return;

    setIsTraining(true);
    setTrainingProgress({ [profileId]: 0 });

    try {
      console.log(`🎓 Training face for ${profileName}...`);
      
      // Capture multiple frames for better training
      const descriptors = [];
      const captureCount = 5;
      
      for (let i = 0; i < captureCount; i++) {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length > 0) {
          // Use the largest face (most likely the person we're training)
          const largestFace = detections.reduce((prev, current) => 
            (current.detection.box.area > prev.detection.box.area) ? current : prev
          );
          
          descriptors.push(largestFace.descriptor);
          console.log(`📸 Captured frame ${i + 1}/${captureCount} for ${profileName}`);
        }

        setTrainingProgress({ [profileId]: Math.round(((i + 1) / captureCount) * 100) });
        
        // Wait between captures
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (descriptors.length > 0) {
        // Average the descriptors for better recognition
        const averagedDescriptor = descriptors.reduce((acc, desc) => {
          return acc.map((val, idx) => val + desc[idx]);
        }, new Array(descriptors[0].length).fill(0)).map(val => val / descriptors.length);

        // Add to known faces
        const newFace = {
          id: profileId,
          name: profileName,
          descriptor: averagedDescriptor,
          trainedAt: new Date().toISOString()
        };

        const updatedFaces = [...knownFaces.filter(f => f.id !== profileId), newFace];
        setKnownFaces(updatedFaces);
        saveFaces(updatedFaces);

        console.log(`✅ Successfully trained face for ${profileName}`);
      } else {
        console.error(`❌ No faces detected during training for ${profileName}`);
      }
    } catch (error) {
      console.error(`❌ Error training face for ${profileName}:`, error);
    } finally {
      setIsTraining(false);
      setTrainingProgress({});
    }
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

    // Log face changes for training purposes
    newFaces.forEach(face => {
      console.log(`🎉 New face detected: ${face.name}`);
    });

    leftFaces.forEach(face => {
      console.log(`👋 Face left: ${face.name}`);
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
    <div className="face-training-page">
      <div className="training-header">
        <h1>🎭 Face Recognition Training</h1>
        <p>Train the system to recognize specific people for your fake audience stream</p>
      </div>

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

          <div className="known-profiles">
            <h4>📋 Known Profiles</h4>
            {facialProfiles.map(profile => {
              const isTrained = knownFaces.some(face => face.id === profile.id);
              const isCurrentlyTraining = isTraining && trainingProgress[profile.id] !== undefined;
              const progress = trainingProgress[profile.id] || 0;
              
              return (
                <div key={profile.id} className="profile-item">
                  <div className="profile-info">
                    <strong>{profile.name}</strong>: {profile.description}
                    <span className={`training-status ${isTrained ? 'trained' : 'not-trained'}`}>
                      {isTrained ? '✅ Trained' : '❌ Not Trained'}
                    </span>
                  </div>
                  
                  {isCurrentlyTraining && (
                    <div className="training-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{progress}%</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => trainFace(profile.id, profile.name)}
                    disabled={isTraining || !isDetecting}
                    className="btn btn-train"
                  >
                    {isCurrentlyTraining ? '🎓 Training...' : '🎓 Train Face'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="training-instructions">
        <h3>📖 How to Train Faces</h3>
        <ol>
          <li>Click "🎥 Start Camera" to begin face detection</li>
          <li>Position yourself in front of the camera</li>
          <li>Click "🎓 Train Face" for the person you want to train</li>
          <li>Stay still while the system captures 5 frames</li>
          <li>Repeat for each person you want to recognize</li>
          <li>Go back to the main stream to see recognition in action!</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceTraining;
