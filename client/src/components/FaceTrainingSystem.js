import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceTrainingSystem = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [knownFaces, setKnownFaces] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState({});
  const [currentFaces, setCurrentFaces] = useState([]);
  const [peopleToTrain, setPeopleToTrain] = useState([
    { id: 'mehdi', name: 'Mehdi', description: 'Mehdi - wearing white shirt, round glasses' },
    { id: 'abhi', name: 'Abhi', description: 'Abhi - wearing blue jacket, no glasses' },
    { id: 'badri', name: 'Badri', description: 'Badri - gaming streamer with beard' },
    { id: 'person4', name: 'Name', description: 'New person' }
  ]);
  const [editingName, setEditingName] = useState({});

  useEffect(() => {
    initializeFaceAPI();
    loadSavedFaces();
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
      console.log('🎭 Initializing Face API for training...');
      
      // Load face-api models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);

      console.log('✅ Face API models loaded successfully');
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error loading Face API models:', error);
    }
  };

  // Load saved face descriptors from localStorage
  const loadSavedFaces = () => {
    try {
      const savedFaces = localStorage.getItem('trainedFaces');
      if (savedFaces) {
        const faces = JSON.parse(savedFaces);
        setKnownFaces(faces);
        console.log(`📚 Loaded ${faces.length} trained faces from storage`);
      }
    } catch (error) {
      console.error('❌ Error loading saved faces:', error);
    }
  };

  // Save face descriptors to localStorage
  const saveFaces = (faces) => {
    try {
      localStorage.setItem('trainedFaces', JSON.stringify(faces));
      console.log(`💾 Saved ${faces.length} faces to storage`);
    } catch (error) {
      console.error('❌ Error saving faces:', error);
    }
  };

  // Train a specific person
  const trainPerson = async (personId, personName) => {
    if (!videoRef.current || !isInitialized) {
      console.log('❌ Camera or models not ready for training');
      return;
    }

    setIsTraining(true);
    setTrainingProgress({ [personId]: 0 });

    try {
      console.log(`🎓 Starting training for ${personName}...`);
      console.log('📹 Camera ready:', !!videoRef.current);
      console.log('🧠 Models ready:', isInitialized);
      
      // Capture multiple frames for better training
      const descriptors = [];
      const captureCount = 10; // Capture 10 frames for better accuracy
      
      for (let i = 0; i < captureCount; i++) {
        console.log(`📸 Capturing frame ${i + 1}/${captureCount} for ${personName}...`);
        
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        console.log(`🔍 Found ${detections.length} faces in frame ${i + 1}`);

        if (detections.length > 0) {
          // Use the largest face (most likely the person we're training)
          const largestFace = detections.reduce((prev, current) => 
            (current.detection.box.area > prev.detection.box.area) ? current : prev
          );
          
          descriptors.push(largestFace.descriptor);
          console.log(`✅ Captured descriptor for ${personName} (frame ${i + 1})`);
        } else {
          console.log(`⚠️ No face detected in frame ${i + 1} - make sure face is visible`);
        }

        setTrainingProgress({ [personId]: Math.round(((i + 1) / captureCount) * 100) });
        
        // Wait between captures
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`📊 Collected ${descriptors.length} descriptors for ${personName}`);

      if (descriptors.length > 0) {
        // Average the descriptors for better recognition
        const averagedDescriptor = descriptors.reduce((acc, desc) => {
          return acc.map((val, idx) => val + desc[idx]);
        }, new Array(descriptors[0].length).fill(0)).map(val => val / descriptors.length);

        // Add to known faces
        const newFace = {
          id: personId,
          name: personName,
          descriptor: averagedDescriptor,
          trainedAt: new Date().toISOString()
        };

        const updatedFaces = [...knownFaces.filter(f => f.id !== personId), newFace];
        setKnownFaces(updatedFaces);
        saveFaces(updatedFaces);

        console.log(`✅ Successfully trained face for ${personName}!`);
        console.log(`💾 Saved to localStorage. Total trained faces: ${updatedFaces.length}`);
        
        // Show success message
        alert(`✅ Successfully trained ${personName}! The system can now recognize this person.`);
      } else {
        console.error(`❌ No faces detected during training for ${personName}`);
        alert(`❌ No faces detected during training. Make sure your face is clearly visible in the camera.`);
      }
    } catch (error) {
      console.error(`❌ Error training face for ${personName}:`, error);
      alert(`❌ Training failed: ${error.message}`);
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

        // Show face count and status
        const ctx = canvas.getContext('2d');
        if (detections.length > 0) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.fillRect(10, 10, 200, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText(`Faces detected: ${detections.length}`, 15, 30);
        } else {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.fillRect(10, 10, 200, 30);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial';
          ctx.fillText('No faces detected', 15, 30);
        }

        // Show training status
        if (isTraining) {
          ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
          ctx.fillRect(10, 50, 300, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText('🎓 Training in progress...', 15, 70);
        }

        // Process face recognition
        await processFaceRecognition(detections);
        
      } catch (error) {
        console.error('❌ Error in face detection:', error);
      }

      requestAnimationFrame(detectFaces);
    };

    detectFaces();
  };

  const processFaceRecognition = async (detections) => {
    if (detections.length === 0) {
      setCurrentFaces([]);
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
          recognitionConfidence: recognizedFace.confidence
        });
      } else {
        // Unknown face
        const unknownId = `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        detectedFaces.push({
          id: unknownId,
          name: 'Unknown Person',
          confidence: detection.detection.score,
          recognitionConfidence: 0
        });
      }
    }

    setCurrentFaces(detectedFaces);
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

  const clearTrainingData = () => {
    localStorage.removeItem('trainedFaces');
    setKnownFaces([]);
    console.log('🗑️ Cleared all training data');
  };

  const handleNameEdit = (personId, newName) => {
    setPeopleToTrain(prev => 
      prev.map(person => 
        person.id === personId ? { ...person, name: newName } : person
      )
    );
    setEditingName(prev => ({ ...prev, [personId]: false }));
  };

  const startEditingName = (personId) => {
    setEditingName(prev => ({ ...prev, [personId]: true }));
  };

  const removePerson = (personId) => {
    setPeopleToTrain(prev => prev.filter(person => person.id !== personId));
    // Also remove from trained faces if they were trained
    const updatedKnownFaces = knownFaces.filter(face => face.id !== personId);
    setKnownFaces(updatedKnownFaces);
    saveFaces(updatedKnownFaces);
  };

  const debugTrainingData = () => {
    const savedData = localStorage.getItem('trainedFaces');
    console.log('🔍 Debug - Training data in localStorage:', savedData);
    if (savedData) {
      const faces = JSON.parse(savedData);
      console.log('👥 Trained faces:', faces.map(f => ({ name: f.name, id: f.id, trainedAt: f.trainedAt })));
    } else {
      console.log('❌ No training data found');
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
              onClick={clearTrainingData}
              className="btn btn-danger"
            >
              🗑️ Clear All Training Data
            </button>
            
            <button 
              onClick={debugTrainingData}
              className="btn btn-info"
            >
              🔍 Debug Training Data
            </button>
          </div>
        </div>

        <div className="face-info">
          <div className="known-profiles">
            <h4>📋 People to Train</h4>
            {peopleToTrain.map(person => {
              const isTrained = knownFaces.some(face => face.id === person.id);
              const isCurrentlyTraining = isTraining && trainingProgress[person.id] !== undefined;
              const progress = trainingProgress[person.id] || 0;
              
              return (
                <div key={person.id} className="profile-item">
                  <div className="profile-info">
                    {editingName[person.id] ? (
                      <input
                        type="text"
                        defaultValue={person.name}
                        onBlur={(e) => handleNameEdit(person.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleNameEdit(person.id, e.target.value);
                          }
                        }}
                        autoFocus
                        style={{
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          padding: '0.25rem',
                          border: '2px solid #9146ff',
                          borderRadius: '4px'
                        }}
                      />
                    ) : (
                      <strong onClick={() => startEditingName(person.id)} style={{ cursor: 'pointer' }}>
                        {person.name}
                      </strong>
                    )}
                    : {person.description}
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
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => trainPerson(person.id, person.name)}
                      disabled={isTraining || !isInitialized}
                      className="btn btn-train"
                    >
                      {isCurrentlyTraining ? '🎓 Training...' : '🎓 Train Face'}
                    </button>
                    <button
                      onClick={() => removePerson(person.id)}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      🗑️ Remove
                    </button>
                  </div>
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
          <li>Stay still while the system captures 10 frames</li>
          <li>Repeat for each person you want to recognize</li>
          <li>Go back to the main stream to see recognition in action!</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceTrainingSystem;
