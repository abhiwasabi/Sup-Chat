import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceVerification = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [knownFaces, setKnownFaces] = useState([]);
  const [currentRecognition, setCurrentRecognition] = useState(null);
  const [recognitionHistory, setRecognitionHistory] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

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

  // Fallback: Start camera even if models fail to load
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized) {
        console.log('⚠️ Models taking too long, trying fallback camera access...');
        startCamera();
      }
    }, 10000); // 10 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [isInitialized]);

  const initializeFaceAPI = async () => {
    try {
      console.log('🎭 Initializing Face API for verification...');
      
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
      
      // Load face-api models
      console.log('📥 Loading face-api models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);

      console.log('✅ Face API models loaded successfully');
      console.log('📊 Final model status:', {
        tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.isLoaded,
        faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.isLoaded,
        faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.isLoaded,
        faceExpressionNet: !!faceapi.nets.faceExpressionNet.isLoaded
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error loading Face API models:', error);
      console.error('Full error details:', error.message, error.stack);
    }
  };

  // Load saved face descriptors from localStorage
  const loadSavedFaces = () => {
    try {
      const savedFaces = localStorage.getItem('trainedFaces');
      if (savedFaces) {
        const faces = JSON.parse(savedFaces);
        setKnownFaces(faces);
        console.log(`📚 Loaded ${faces.length} trained faces for verification`);
        console.log('👥 Known faces:', faces.map(f => f.name));
      } else {
        console.log('⚠️ No trained faces found. Please train faces first at /train');
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
          confidence: 1 - distance, // Convert distance to confidence
          distance: distance
        };
        bestDistance = distance;
      }
    }

    return bestMatch;
  };

  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Video metadata loaded, starting detection...');
          console.log('🎥 Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          videoRef.current.play();
          // Start detection immediately, even if models aren't ready
          startFaceRecognition();
        };
        
        videoRef.current.oncanplay = () => {
          console.log('🎥 Video can play');
        };
        
        videoRef.current.onplay = () => {
          console.log('🎥 Video is playing');
        };
      }
      
      console.log('🎥 Camera started successfully');
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
    }
  };

  const startFaceRecognition = () => {
    console.log('🔍 Starting face recognition verification...');
    console.log('📊 Face API initialized:', isInitialized);
    console.log('📊 Models loaded status:', {
      tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.isLoaded,
      faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.isLoaded,
      faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.isLoaded,
      faceExpressionNet: !!faceapi.nets.faceExpressionNet.isLoaded
    });

    if (!isInitialized) {
      console.log('⚠️ Face API not initialized yet, starting camera anyway...');
    }

    setIsTesting(true);

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) {
        console.log('⚠️ Video or canvas not ready');
        if (isTesting) {
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

          // Add visual indicators
          const ctx = canvas.getContext('2d');
          
          // Show face count and detection status
          if (detections.length > 0) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(10, 10, 250, 40);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(`✅ Faces detected: ${detections.length}`, 15, 30);
          } else {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(10, 10, 250, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('❌ No faces detected', 15, 30);
          }

          // Show recognition status
          if (currentRecognition) {
            const confidenceColor = currentRecognition.confidence > 0.8 ? '#00ff00' : 
                                   currentRecognition.confidence > 0.6 ? '#ffff00' : '#ff0000';
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, 60, 300, 50);
            ctx.fillStyle = confidenceColor;
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`👤 ${currentRecognition.name}`, 15, 85);
            ctx.font = '14px Arial';
            ctx.fillText(`Confidence: ${(currentRecognition.confidence * 100).toFixed(1)}%`, 15, 105);
          } else if (detections.length > 0) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            ctx.fillRect(10, 60, 300, 30);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('🔍 Analyzing face...', 15, 80);
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

      if (isTesting) {
        requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  };

  const processFaceRecognition = async (detections) => {
    if (detections.length === 0) {
      setCurrentRecognition(null);
      return;
    }

    // Use the largest face for recognition
    const largestFace = detections.reduce((prev, current) => 
      (current.detection.box.area > prev.detection.box.area) ? current : prev
    );

    // Recognize the face
    const recognizedFace = await recognizeFace(largestFace.descriptor);
    
    if (recognizedFace) {
      setCurrentRecognition({
        name: recognizedFace.name,
        confidence: recognizedFace.confidence,
        distance: recognizedFace.distance,
        timestamp: new Date().toISOString()
      });

      // Add to recognition history
      setRecognitionHistory(prev => [
        {
          name: recognizedFace.name,
          confidence: recognizedFace.confidence,
          distance: recognizedFace.distance,
          timestamp: new Date().toISOString()
        },
        ...prev.slice(0, 9) // Keep last 10 recognitions
      ]);

      console.log(`✅ RECOGNIZED: ${recognizedFace.name} (confidence: ${(recognizedFace.confidence * 100).toFixed(1)}%)`);
    } else {
      setCurrentRecognition({
        name: 'Unknown Person',
        confidence: 0,
        distance: 1,
        timestamp: new Date().toISOString()
      });
      console.log('❓ Unknown person detected');
    }
  };

  const stopTesting = () => {
    setIsTesting(false);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const clearHistory = () => {
    setRecognitionHistory([]);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return '#00ff00'; // Green - High confidence
    if (confidence > 0.6) return '#ffff00'; // Yellow - Medium confidence
    return '#ff0000'; // Red - Low confidence
  };

  return (
    <div className="face-verification-page">
      <div className="verification-header">
        <h1>🔍 Face Recognition Verification</h1>
        <p>Test if the system can distinguish between Mehdi, Abhi, and Badri</p>
      </div>

      <div className="verification-container">
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
              disabled={!isInitialized || isTesting}
              className="btn btn-primary"
            >
              {isInitialized ? '🎥 Start Verification' : '⏳ Loading Models...'}
            </button>
            
            <button 
              onClick={stopTesting}
              disabled={!isTesting}
              className="btn btn-secondary"
            >
              🛑 Stop Testing
            </button>
            
            <button 
              onClick={async () => {
                console.log('🧪 Manual face detection test...');
                if (videoRef.current && isInitialized) {
                  try {
                    console.log('🧪 Running basic face detection...');
                    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
                    console.log(`🧪 Manual test found ${detections.length} faces`);
                    
                    if (detections.length > 0) {
                      console.log('🧪 Face detection details:', detections[0]);
                      console.log('🧪 Face score:', detections[0].detection.score);
                    }
                  } catch (err) {
                    console.error('🧪 Manual test error:', err);
                  }
                } else {
                  console.log('🧪 Manual test failed - camera or models not ready');
                  console.log('🧪 Video ready:', !!videoRef.current);
                  console.log('🧪 Models ready:', isInitialized);
                }
              }}
              className="btn btn-info"
            >
              🧪 Test Face Detection
            </button>
            
            <button 
              onClick={async () => {
                console.log('🧪 Testing with different options...');
                if (videoRef.current && isInitialized) {
                  try {
                    // Test with different confidence thresholds
                    const options1 = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
                    const options2 = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
                    
                    console.log('🧪 Testing with scoreThreshold 0.5...');
                    const detections1 = await faceapi.detectAllFaces(videoRef.current, options1);
                    console.log(`🧪 Found ${detections1.length} faces with threshold 0.5`);
                    
                    console.log('🧪 Testing with scoreThreshold 0.3...');
                    const detections2 = await faceapi.detectAllFaces(videoRef.current, options2);
                    console.log(`🧪 Found ${detections2.length} faces with threshold 0.3`);
                    
                  } catch (err) {
                    console.error('🧪 Options test error:', err);
                  }
                }
              }}
              className="btn btn-warning"
            >
              🧪 Test Different Options
            </button>
            
            <button 
              onClick={async () => {
                console.log('🧪 Simple face detection test (like /test page)...');
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
              🧪 Simple Test (Like /test)
            </button>
          </div>
        </div>

        <div className="recognition-results">
          <h3>🎯 Current Recognition</h3>
          
          {/* Status indicator */}
          <div className="verification-status">
            {isTesting ? (
              <div className="status-active">
                <span className="status-indicator">🟢</span>
                <span>Verification Active - Scanning faces...</span>
              </div>
            ) : (
              <div className="status-inactive">
                <span className="status-indicator">🔴</span>
                <span>Verification Stopped</span>
              </div>
            )}
          </div>

          {currentRecognition ? (
            <div className="current-recognition">
              <div className="recognition-info">
                <h4 style={{ color: getConfidenceColor(currentRecognition.confidence) }}>
                  {currentRecognition.name}
                </h4>
                <p>Confidence: {(currentRecognition.confidence * 100).toFixed(1)}%</p>
                <p>Distance: {currentRecognition.distance.toFixed(3)}</p>
                <p>Time: {new Date(currentRecognition.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ) : (
            <p className="no-recognition">
              {isTesting ? "Position your face in front of the camera" : "No face detected"}
            </p>
          )}

          <h3>📊 Recognition History</h3>
          <div className="history-controls">
            <button onClick={clearHistory} className="btn btn-small">
              🗑️ Clear History
            </button>
          </div>
          <div className="recognition-history">
            {recognitionHistory.length === 0 ? (
              <p className="no-history">No recognition history yet</p>
            ) : (
              recognitionHistory.map((recognition, index) => (
                <div key={index} className="history-item">
                  <div className="history-info">
                    <span 
                      className="history-name"
                      style={{ color: getConfidenceColor(recognition.confidence) }}
                    >
                      {recognition.name}
                    </span>
                    <span className="history-confidence">
                      {(recognition.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="history-time">
                    {new Date(recognition.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="trained-faces-info">
            <h4>👥 Trained Faces ({knownFaces.length})</h4>
            {knownFaces.length === 0 ? (
              <p className="no-trained-faces">
                No trained faces found. <a href="/train">Go to training page</a>
              </p>
            ) : (
              <div className="trained-faces-list">
                {knownFaces.map((face, index) => (
                  <div key={index} className="trained-face-item">
                    <span className="face-name">{face.name}</span>
                    <span className="face-trained-at">
                      Trained: {new Date(face.trainedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="verification-instructions">
        <h3>📖 How to Test Recognition</h3>
        <ol>
          <li>Make sure you've trained faces at <a href="/train">/train</a></li>
          <li>Click "🎥 Start Verification" to begin testing</li>
          <li>Have each person (Mehdi, Abhi, Badri) appear in front of the camera</li>
          <li>Watch the recognition results and confidence scores</li>
          <li>Check the history to see all recognitions</li>
          <li>High confidence (&gt;80%) = Good recognition</li>
          <li>Medium confidence (60-80%) = Decent recognition</li>
          <li>Low confidence (&lt;60%) = Poor recognition</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceVerification;
